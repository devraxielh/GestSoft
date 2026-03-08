"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import CertificateBuilder from "@/components/CertificateBuilder"
import toast from "react-hot-toast"
import * as XLSX from "xlsx"
import ConfirmModal from "@/components/ConfirmModal"
import SearchableSelect from "@/components/SearchableSelect"
import { generateVerificationCode } from "@/lib/hash"

interface Event { id: number; name: string }
interface Program { id: number; name: string }
interface Certificate { id: number; participationType: string; templateHtml: string; eventId: number; event: Event; issueDate: string; _count?: { assignments: number } }
interface Person { id: number; fullName: string; identification: string; email: string }
interface ViewerAssignment { id: number; certificate: Certificate; person: Person; createdAt: string; participationDetails?: string }

const PARTICIPATION_TYPES = ["Ponente", "Conferencista", "Docente", "Asistente", "Evaluador"]
const DEFAULT_TEMPLATE = "";

export default function CertificadosPage() {
    const [certificates, setCertificates] = useState<Certificate[]>([])
    const [events, setEvents] = useState<Event[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const [previewHtml, setPreviewHtml] = useState("")
    const [editingCert, setEditingCert] = useState<Certificate | null>(null)
    const [form, setForm] = useState({ participationType: "Asistente", templateHtml: DEFAULT_TEMPLATE, eventId: "", issueDate: "" })
    const [error, setError] = useState("")
    const [searchQuery, setSearchQuery] = useState("")
    const [page, setPage] = useState(1)
    const [filterEvent, setFilterEvent] = useState("")
    const [filterType, setFilterType] = useState("")
    const [confirmAction, setConfirmAction] = useState<{ type: "delete", cert: Certificate } | null>(null)

    // Assignment states
    const [showAssignModal, setShowAssignModal] = useState(false)
    const [assignMode, setAssignMode] = useState<'individual' | 'bulk'>('individual')
    const [assignCert, setAssignCert] = useState<Certificate | null>(null)
    const [assignForm, setAssignForm] = useState({ identification: "", details: "" })
    const [bulkFile, setBulkFile] = useState<File | null>(null)
    const [bulkLoading, setBulkLoading] = useState(false)

    // Viewer states
    const [showViewerModal, setShowViewerModal] = useState(false)
    const [viewerCert, setViewerCert] = useState<Certificate | null>(null)
    const [viewerAssignments, setViewerAssignments] = useState<ViewerAssignment[]>([])
    const [viewerLoading, setViewerLoading] = useState(false)
    const [viewerSearch, setViewerSearch] = useState("")
    const [previewFromViewer, setPreviewFromViewer] = useState(false)
    const [selectedAssignments, setSelectedAssignments] = useState<number[]>([])
    const [deletingAssignments, setDeletingAssignments] = useState(false)

    const fetchData = useCallback(async () => { const [c, e] = await Promise.all([fetch("/api/certificados"), fetch("/api/eventos")]); setCertificates(await c.json()); setEvents(await e.json()); setLoading(false) }, [])
    useEffect(() => { fetchData() }, [fetchData])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError("")
        const url = editingCert ? `/api/certificados/${editingCert.id}` : "/api/certificados"
        const res = await fetch(url, { method: editingCert ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
        if (res.ok) {
            toast.success(editingCert ? "Certificado actualizado" : "Certificado creado", { style: { background: '#F0FDF4', color: '#166534', border: '1px solid #4ADE80' }, iconTheme: { primary: '#22C55E', secondary: '#F0FDF4' } })
            setShowModal(false); setEditingCert(null); setForm({ participationType: "Asistente", templateHtml: DEFAULT_TEMPLATE, eventId: "", issueDate: "" }); fetchData()
        } else {
            const data = await res.json().catch(() => ({}))
            const err = data.error || "Error al guardar el certificado"
            toast.error(err, { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' } })
            setError(err)
        }
    }

    const openCreate = () => { setEditingCert(null); setForm({ participationType: "Asistente", templateHtml: DEFAULT_TEMPLATE, eventId: events[0]?.id?.toString() || "", issueDate: new Date().toISOString().split("T")[0] }); setError(""); setShowModal(true) }
    const openEdit = (c: Certificate) => { setEditingCert(c); setForm({ participationType: c.participationType, templateHtml: c.templateHtml, eventId: c.eventId ? c.eventId.toString() : "", issueDate: new Date(c.issueDate).toISOString().split("T")[0] }); setError(""); setShowModal(true) }
    const openPreview = (c: Certificate) => {
        setPreviewFromViewer(false)
        const sampleDetails = "Detalles de la participación (Ej. título de la conferencia)";
        setPreviewHtml(c.templateHtml
            .replace(/\{\{NOMBRE_COMPLETO\}\}/g, "Juan Pérez")
            .replace(/\{\{IDENTIFICACION\}\}/g, "1234567890")
            .replace(/\{\{TIPO_PARTICIPACION\}\}/g, c.participationType)
            .replace(/\{\{NOMBRE_EVENTO\}\}/g, c.event?.name || "")
            .replace(/\{\{FECHA_EXPEDICION\}\}/g, new Date(c.issueDate).toLocaleDateString("es-CO"))
            .replace(/\{\{DETALLES_PARTICIPACION\}\}/g, sampleDetails)
            .replace(/\{\{CODIGO_VERIFICACION\}\}/g, generateVerificationCode({ fullName: "Juan Pérez", identification: "1234567890", participationType: c.participationType, eventName: c.event?.name || "", issueDate: c.issueDate, participationDetails: sampleDetails }))
        );
        setShowPreview(true)
    }

    const openAssignModal = (cert: Certificate) => {
        setAssignCert(cert)
        setAssignMode('individual')
        setAssignForm({ identification: "", details: "" })
        setBulkFile(null)
        setShowAssignModal(true)
    }

    const handleAssignSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!assignCert) return

        if (assignMode === 'individual') {
            const res = await fetch("/api/asignaciones", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    certificateId: assignCert.id,
                    identification: assignForm.identification,
                    participationDetails: assignForm.details
                })
            })
            if (res.ok) {
                toast.success("Certificado asignado individualmente", { style: { background: '#F0FDF4', color: '#166534', border: '1px solid #4ADE80' }, iconTheme: { primary: '#22C55E', secondary: '#F0FDF4' } })
                setShowAssignModal(false)
                fetchData() // Refresh data to update assignment count
            } else {
                const data = await res.json().catch(() => ({}))
                toast.error(data.error || "Error al asignar", { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' } })
            }
        } else if (assignMode === 'bulk' && bulkFile) {
            setBulkLoading(true)
            try {
                const reader = new FileReader()
                reader.onload = async (evt) => {
                    const bstr = evt.target?.result
                    const wb = XLSX.read(bstr, { type: 'binary' })
                    const wsname = wb.SheetNames[0]
                    const ws = wb.Sheets[wsname]
                    const data = XLSX.utils.sheet_to_json(ws)

                    const res = await fetch("/api/asignaciones/bulk", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ certificateId: assignCert.id, people: data })
                    })
                    const resData = await res.json().catch(() => ({}))

                    if (res.ok && resData.success) {
                        toast.success(`Asignación masiva completada: ${resData.assignedCount} asignados, ${resData.errorCount} errores.`)
                        if (resData.errorCount > 0) {
                            console.warn("Errores de asignación masiva:", resData.errors)
                            setTimeout(() => {
                                toast.error(
                                    <div className="flex flex-col gap-1">
                                        <span className="font-semibold text-sm">Errores encontrados ({resData.errorCount}):</span>
                                        <ul className="list-disc pl-4 text-xs space-y-0.5">
                                            {resData.errors.slice(0, 4).map((errItem: string, i: number) => (
                                                <li key={i}>{errItem}</li>
                                            ))}
                                        </ul>
                                        {resData.errors.length > 4 && (
                                            <span className="text-xs text-gray-500 font-medium">...y {resData.errors.length - 4} más.</span>
                                        )}
                                    </div>,
                                    { duration: 8000, style: { maxWidth: '400px' } }
                                )
                            }, 500)
                        }
                        setShowAssignModal(false)
                        fetchData() // Refresh data to update assignment count
                    } else {
                        toast.error(resData.error || "Error al procesar el archivo masivo")
                    }
                    setBulkLoading(false)
                }
                reader.readAsBinaryString(bulkFile)
            } catch (err) {
                console.error(err)
                toast.error("Error leyendo el archivo Excel")
                setBulkLoading(false)
            }
        }
    }

    const downloadExampleXLSX = () => {
        const exampleData = [
            {
                Identificacion: "123456789",
                Nombre_Completo: "Juan Carlos Perez Gomez",
                Correo: "juan.perez@ejemplo.com",
                ...(assignCert && ["Ponente", "Conferencista", "Evaluador"].includes(assignCert.participationType)
                    ? { Detalles: "Ponencia sobre inteligencia artificial" }
                    : {})
            }
        ];
        const ws = XLSX.utils.json_to_sheet(exampleData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Platilla");
        XLSX.writeFile(wb, "Plantilla_Asignacion_Masiva.xlsx");
    }

    const handleDelete = async (id: number) => {
        const res = await fetch(`/api/certificados/${id}`, { method: "DELETE" });
        if (res.ok) {
            toast.success("Certificado eliminado")
            fetchData()
        } else {
            const errData = await res.json().catch(() => ({}))
            toast.error(errData.error || "Error al eliminar el certificado")
        }
    }

    const handleConfirm = () => {
        if (confirmAction?.type === "delete") handleDelete(confirmAction.cert.id);
        setConfirmAction(null);
    }

    const askDelete = (c: Certificate) => setConfirmAction({ type: "delete", cert: c })

    // Viewer functions
    const openViewerModal = async (cert: Certificate) => {
        setViewerCert(cert)
        setViewerSearch("")
        setViewerLoading(true)
        setShowViewerModal(true)
        setSelectedAssignments([])
        try {
            const res = await fetch("/api/asignaciones")
            const all: ViewerAssignment[] = await res.json().catch(() => ([]))
            setViewerAssignments(all.filter(a => a.certificate?.id === cert.id))
        } catch {
            toast.error("Error cargando asignaciones")
            setViewerAssignments([])
        }
        setViewerLoading(false)
    }

    const filteredViewerAssignments = viewerAssignments.filter(a => {
        if (!viewerSearch) return true
        const q = viewerSearch.toLowerCase()
        const name = a.person.fullName.toLowerCase()
        return name.includes(q) || a.person.identification.includes(q)
    })

    const viewAssignmentCert = (a: ViewerAssignment) => {
        setPreviewFromViewer(true)
        setPreviewHtml(
            a.certificate.templateHtml
                .replace(/\{\{NOMBRE_COMPLETO\}\}/g, a.person.fullName)
                .replace(/\{\{IDENTIFICACION\}\}/g, a.person.identification)
                .replace(/\{\{TIPO_PARTICIPACION\}\}/g, a.certificate.participationType)
                .replace(/\{\{NOMBRE_EVENTO\}\}/g, a.certificate.event?.name || "")
                .replace(/\{\{FECHA_EXPEDICION\}\}/g, new Date(a.certificate.issueDate).toLocaleDateString("es-CO"))
                .replace(/\{\{DETALLES_PARTICIPACION\}\}/g, a.participationDetails || "")
                .replace(/\{\{CODIGO_VERIFICACION\}\}/g, generateVerificationCode({ fullName: a.person.fullName, identification: a.person.identification, participationType: a.certificate.participationType, eventName: a.certificate.event?.name || "", issueDate: a.certificate.issueDate, participationDetails: a.participationDetails || "" }))
        )
        setShowViewerModal(false)
        setShowPreview(true)
    }

    const closePreview = () => {
        setShowPreview(false)
        if (previewFromViewer) {
            setShowViewerModal(true)
        }
    }

    const toggleAssignmentSelection = (id: number) => {
        setSelectedAssignments(prev => prev.includes(id) ? prev.filter(aId => aId !== id) : [...prev, id])
    }

    const toggleAllAssignments = () => {
        if (selectedAssignments.length === filteredViewerAssignments.length) {
            setSelectedAssignments([])
        } else {
            setSelectedAssignments(filteredViewerAssignments.map(a => a.id))
        }
    }

    const deleteSelectedAssignments = async () => {
        if (selectedAssignments.length === 0) return;
        if (!confirm(`¿Estás seguro de eliminar ${selectedAssignments.length} asignación(es)? Esta acción no se puede deshacer.`)) return;

        setDeletingAssignments(true)
        try {
            const res = await fetch('/api/asignaciones/bulk-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignmentIds: selectedAssignments })
            })

            if (res.ok) {
                toast.success(`Se eliminaron ${selectedAssignments.length} asignaciones`)
                // Refresh list locally to avoid full refetch if not needed, or just refetch
                setViewerAssignments(prev => prev.filter(a => !selectedAssignments.includes(a.id)))
                setSelectedAssignments([])
                fetchData() // Refresh main table to update counts
            } else {
                const errData = await res.json().catch(() => ({}))
                toast.error(errData.error || "Error al eliminar las asignaciones")
            }
        } catch (error) {
            toast.error("Error de conexión al eliminar")
        }
        setDeletingAssignments(false)
    }

    const downloadPDF = async () => {
        const { default: html2canvas } = await import("html2canvas")
        const { jsPDF } = await import("jspdf")
        const el = document.getElementById("cert-preview")
        if (!el) return
        const tId = toast.loading("Generando PDF...")
        try {
            const canvas = await html2canvas(el, { scale: 2, useCORS: true })
            const img = canvas.toDataURL("image/png")
            const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width / 2, canvas.height / 2] })
            pdf.addImage(img, "PNG", 0, 0, canvas.width / 2, canvas.height / 2)
            pdf.save("certificado.pdf")
            toast.success("PDF descargado", { id: tId })
        } catch {
            toast.error("Error al generar PDF", { id: tId })
        }
    }



    const formatDate = (d: string) => new Date(d).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })
    const inputClasses = "w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs transition-shadow"
    const ic = "w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs"
    const pb: Record<string, string> = { Ponente: "bg-warning-50 text-warning-600", Evaluador: "bg-success-50 text-success-600", Asistente: "bg-brand-50 text-brand-600", Docente: "bg-brand-50 text-brand-600", Conferencista: "bg-purple-50 text-purple-600" }

    const filteredCertificates = certificates.filter(c => {
        if (filterEvent && c.event?.name !== filterEvent) return false
        if (filterType && c.participationType !== filterType) return false
        return true
    })
    const uniqueEvents = [...new Set(certificates.map(c => c.event?.name).filter(Boolean))]

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h2 className="text-2xl font-semibold text-gray-800">Certificados</h2><p className="text-gray-500 text-sm mt-1">Gestión de certificados y plantillas</p></div>
                <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors">+ Nuevo Certificado</button>
            </div>
            {loading ? <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div></div> : (
                <>
                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        <SearchableSelect
                            value={filterEvent}
                            onChange={setFilterEvent}
                            placeholder="Todos los eventos"
                            options={uniqueEvents.map(name => ({ label: name!, value: name! }))}
                        />
                        <SearchableSelect
                            value={filterType}
                            onChange={setFilterType}
                            placeholder="Todas las participaciones"
                            options={PARTICIPATION_TYPES.map(t => ({ label: t, value: t }))}
                        />
                        {(filterEvent || filterType) && (
                            <button onClick={() => { setFilterEvent(""); setFilterType("") }} className="text-xs text-brand-600 hover:text-brand-800 font-medium transition-colors">
                                Limpiar filtros
                            </button>
                        )}
                        <span className="ml-auto text-xs text-gray-400">{filteredCertificates.length} certificado(s)</span>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs"><div className="overflow-x-auto"><table className="w-full">
                        <thead><tr className="border-b border-gray-100">
                            <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Evento</th>
                            <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Participación</th>
                            <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Fecha Exp.</th>
                            <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Asig.</th>
                            <th className="px-6 py-4 text-right text-theme-xs font-medium text-gray-500 uppercase">Acciones</th>
                        </tr></thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredCertificates.map((c) => (
                                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{c.event?.name}</td>
                                    <td className="px-6 py-4"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${pb[c.participationType] || "bg-gray-100 text-gray-600"}`}>{c.participationType}</span></td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(c.issueDate)}</td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => openViewerModal(c)} className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 hover:bg-brand-100 hover:text-brand-700 transition-colors cursor-pointer">
                                            {c._count?.assignments || 0}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button onClick={() => openAssignModal(c)} className="inline-flex rounded-lg border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-100 transition-colors">
                                            Asignar
                                        </button>
                                        <button onClick={() => openPreview(c)} className="inline-flex rounded-lg border border-success-100 bg-success-50 px-3 py-1.5 text-xs font-medium text-success-600 hover:bg-success-100 transition-colors">Vista previa</button>
                                        <button onClick={() => openEdit(c)} className="inline-flex rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">Editar</button>
                                        <button onClick={() => askDelete(c)} className="inline-flex rounded-lg border border-error-100 bg-error-50 px-3 py-1.5 text-xs font-medium text-error-600 hover:bg-error-100 transition-colors">Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                            {filteredCertificates.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">{(filterEvent || filterType) ? "No hay certificados con los filtros seleccionados" : "No hay certificados"}</td></tr>}
                        </tbody>
                    </table></div></div>
                </>
            )}
            {showModal && (
                <div className="fixed inset-0 z-[99999] flex items-start pt-[5vh] justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-[90rem] rounded-2xl border border-gray-200 bg-white p-8 shadow-theme-lg max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-800 mb-5">{editingCert ? "Editar" : "Nuevo"} Certificado</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && <div className="rounded-lg bg-error-50 border border-error-100 p-3 text-sm text-error-600">{error}</div>}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-2">Participación</label><SearchableSelect value={form.participationType} onChange={(val) => setForm({ ...form, participationType: val })} placeholder="Seleccionar tipo" options={PARTICIPATION_TYPES.map(t => ({ label: t, value: t }))} /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-2">Evento</label><SearchableSelect value={form.eventId} onChange={(val) => setForm({ ...form, eventId: val })} placeholder="Seleccione evento" options={events.map(e => ({ label: e.name, value: String(e.id) }))} /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-2">Fecha expedición</label><input type="date" value={form.issueDate} onChange={e => setForm({ ...form, issueDate: e.target.value })} required className={ic} /></div>
                            </div>

                            <div className="col-span-full mt-6">
                                <CertificateBuilder
                                    initialHtml={form.templateHtml}
                                    onChange={(html: string) => setForm({ ...form, templateHtml: html })}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs">Cancelar</button>
                                <button type="submit" className="flex-1 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white hover:bg-brand-600 shadow-theme-xs">Guardar Certificado</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {showPreview && (
                <div className="fixed inset-0 z-[99999] flex items-start pt-[5vh] justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-5xl rounded-2xl border border-gray-200 bg-white shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><svg className="w-5 h-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>Vista Previa del Certificado</h3>
                            <div className="flex items-center gap-3">
                                <button onClick={downloadPDF} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Descargar PDF</button>
                                <button onClick={closePreview} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50">Cerrar</button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto bg-gray-100 p-8 flex items-center justify-center relative">
                            <div className="absolute inset-0 pattern-dots opacity-30"></div>
                            <div className="relative shadow-2xl bg-white border border-gray-200 overflow-hidden shrink-0" style={{ width: "800px", height: "600px", transform: "scale(1)", transformOrigin: "top center" }} id="cert-preview">
                                <div dangerouslySetInnerHTML={{ __html: previewHtml }} className="w-full h-full" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showAssignModal && (
                <div className="fixed inset-0 z-[99999] flex items-start pt-[5vh] justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg">
                        <h3 className="text-lg font-semibold text-gray-800 mb-5">Asignar Certificado</h3>

                        <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                            <button
                                className={`flex-1 text-sm py-1.5 font-medium rounded-md transition-colors ${assignMode === 'individual' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'} `}
                                onClick={() => setAssignMode('individual')}
                            >
                                Individual
                            </button>
                            <button
                                className={`flex-1 text-sm py-1.5 font-medium rounded-md transition-colors ${assignMode === 'bulk' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'} `}
                                onClick={() => setAssignMode('bulk')}
                            >
                                Masivo (Excel)
                            </button>
                        </div>

                        <form onSubmit={handleAssignSubmit} className="space-y-4">
                            {assignMode === 'individual' ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Identificación de la Persona</label>
                                        <input
                                            type="text"
                                            value={assignForm.identification}
                                            onChange={e => setAssignForm({ ...assignForm, identification: e.target.value })}
                                            required
                                            className={inputClasses}
                                            placeholder="Número de identificación"
                                        />
                                        <p className="mt-2 text-xs text-gray-500">La persona debe estar registrada en el sistema previamente o ser agregada.</p>
                                    </div>

                                    {assignCert && ["Ponente", "Conferencista", "Evaluador"].includes(assignCert.participationType) && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Detalles de la Participación</label>
                                            <textarea
                                                value={assignForm.details}
                                                onChange={e => setAssignForm({ ...assignForm, details: e.target.value })}
                                                required
                                                rows={2}
                                                className={inputClasses}
                                                placeholder="Ej. Conferencia titulada 'El futuro del derecho en Colombia'"
                                            />
                                            <p className="mt-2 text-xs text-gray-500">Requerido para el tipo de participación del certificado ({assignCert.participationType}).</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Archivo Excel (.xlsx)</label>
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls"
                                        onChange={e => setBulkFile(e.target.files?.[0] || null)}
                                        required
                                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                                    />
                                    <div className="mt-3 p-3 bg-brand-50 border border-brand-100 rounded-lg text-xs text-brand-800">
                                        <p className="font-semibold mb-1">Formato requerido del Excel:</p>
                                        <ul className="list-disc list-inside space-y-0.5 ml-1">
                                            <li>Columna <b>Identificacion</b> (Obligatoria)</li>
                                            <li>Columna <b>Nombre_Completo</b> (Obligatoria)</li>
                                            <li>Columna <b>Correo</b> (Opcional)</li>
                                            {assignCert && ["Ponente", "Conferencista", "Evaluador"].includes(assignCert.participationType) && (
                                                <li>Columna <b>Detalles</b> (Obligatoria para {assignCert.participationType})</li>
                                            )}
                                        </ul>
                                        <button
                                            type="button"
                                            onClick={downloadExampleXLSX}
                                            className="mt-3 text-xs text-brand-600 font-medium hover:text-brand-800 underline inline-flex items-center gap-1"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            Descargar plantilla de ejemplo
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setShowAssignModal(false)} className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-theme-xs disabled:opacity-50">Cancelar</button>
                                <button type="submit" disabled={bulkLoading} className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors shadow-theme-xs disabled:opacity-50 flex justify-center items-center">
                                    {bulkLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Asignar"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assignments Viewer Modal */}
            {showViewerModal && viewerCert && (
                <div className="fixed inset-0 z-[99999] flex items-start pt-[5vh] justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-theme-lg max-h-[85vh] flex flex-col">
                        {/* Header */}
                        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-lg font-semibold text-gray-800">Asignaciones del Certificado</h3>
                                <button onClick={() => setShowViewerModal(false)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">✕</button>
                            </div>
                            <p className="text-sm text-gray-500">
                                {viewerCert.event?.name} — <span className="font-medium">{viewerCert.participationType}</span>
                            </p>
                            {/* Search */}
                            <div className="mt-4">
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre o identificación..."
                                    value={viewerSearch}
                                    onChange={e => setViewerSearch(e.target.value)}
                                    className={inputClasses}
                                />
                            </div>
                        </div>
                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            {viewerLoading ? (
                                <div className="flex justify-center py-12">
                                    <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
                                </div>
                            ) : filteredViewerAssignments.length === 0 ? (
                                <div className="text-center py-12 text-gray-400 text-sm">
                                    {viewerSearch ? "No se encontraron resultados" : "No hay asignaciones para este certificado"}
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-xl border border-gray-200">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-gray-100 bg-gray-50">
                                                <th className="px-4 py-3 text-left w-10">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                                                        checked={filteredViewerAssignments.length > 0 && selectedAssignments.length === filteredViewerAssignments.length}
                                                        onChange={toggleAllAssignments}
                                                    />
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Persona</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Identificación</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detalles</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredViewerAssignments.map(a => (
                                                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                                                            checked={selectedAssignments.includes(a.id)}
                                                            onChange={() => toggleAssignmentSelection(a.id)}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{a.person.fullName}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{a.person.identification}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">{a.participationDetails || '—'}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button onClick={() => viewAssignmentCert(a)} className="inline-flex rounded-lg border border-success-100 bg-success-50 px-3 py-1.5 text-xs font-medium text-success-600 hover:bg-success-100 transition-colors">
                                                            Ver Certificado
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-500">{filteredViewerAssignments.length} asignación(es)</span>
                                {selectedAssignments.length > 0 && (
                                    <button
                                        onClick={deleteSelectedAssignments}
                                        disabled={deletingAssignments}
                                        className="inline-flex rounded-lg border border-error-100 bg-error-50 px-3 py-1.5 text-xs font-medium text-error-600 hover:bg-error-100 transition-colors disabled:opacity-50"
                                    >
                                        {deletingAssignments ? "Eliminando..." : `Eliminar ${selectedAssignments.length} seleccionadas`}
                                    </button>
                                )}
                            </div>
                            <button onClick={() => setShowViewerModal(false)} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={!!confirmAction}
                title="Eliminar certificado"
                message={`¿Estás seguro de eliminar el certificado de tipo "${confirmAction?.cert.participationType}" para el evento "${confirmAction?.cert.event?.name}"? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                variant="danger"
                onConfirm={handleConfirm}
                onCancel={() => setConfirmAction(null)}
            />
        </div>
    )
}
