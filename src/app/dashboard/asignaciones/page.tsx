"use client"
import { useState, useEffect, useCallback } from "react"
import toast from "react-hot-toast"
import ConfirmModal from "@/components/ConfirmModal"
import SearchableSelect from "@/components/SearchableSelect"
import { generateVerificationCode } from "@/lib/hash"

interface Event { id: number; name: string }
interface Certificate { id: number; participationType: string; templateHtml: string; event: Event; issueDate: string }
interface Person { id: number; fullName: string; identification: string; email: string }
interface Assignment { id: number; certificate: Certificate; person: Person; createdAt: string; participationDetails?: string }

export default function AsignacionesPage() {
    const [assignments, setAssignments] = useState<Assignment[]>([])
    const [certificates, setCertificates] = useState<Certificate[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const [previewHtml, setPreviewHtml] = useState("")
    const [form, setForm] = useState({ certificateId: "", identification: "", details: "" })
    const [error, setError] = useState("")
    const [filterEvent, setFilterEvent] = useState("")
    const [filterType, setFilterType] = useState("")
    const [filterSearch, setFilterSearch] = useState("")
    const [confirmAction, setConfirmAction] = useState<{ type: "delete", assignment: Assignment } | null>(null)

    const fetchData = useCallback(async () => { const [a, c] = await Promise.all([fetch("/api/asignaciones"), fetch("/api/certificados")]); setAssignments(await a.json().catch(() => [])); setCertificates(await c.json().catch(() => [])); setLoading(false) }, [])
    useEffect(() => { fetchData() }, [fetchData])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError("")
        const res = await fetch("/api/asignaciones", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                certificateId: form.certificateId,
                identification: form.identification,
                participationDetails: form.details
            })
        })
        if (res.ok) {
            toast.success("Certificado asignado exitosamente", { style: { background: '#F0FDF4', color: '#166534', border: '1px solid #4ADE80' }, iconTheme: { primary: '#22C55E', secondary: '#F0FDF4' } })
            setForm({ certificateId: "", identification: "", details: "" })
            fetchData()
            setShowModal(false)
        } else {
            const data = await res.json().catch(() => ({}))
            const err = data.error || "Error al asignar"
            toast.error(err, { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' } })
            setError(err)
        }
    }
    const handleDelete = async (id: number) => {
        const res = await fetch(`/api/asignaciones/${id}`, { method: "DELETE" });
        if (res.ok) {
            toast.success("Asignación eliminada", { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' }, iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' } })
            fetchData()
        } else {
            const errData = await res.json().catch(() => ({}))
            toast.error(errData.error || "Error al eliminar la asignación", { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' } })
        }
    }
    const handleConfirm = () => {
        if (confirmAction?.type === "delete") handleDelete(confirmAction.assignment.id);
        setConfirmAction(null);
    }
    const askDelete = (a: Assignment) => setConfirmAction({ type: "delete", assignment: a })

    const viewCert = (a: Assignment) => {
        setPreviewHtml(a.certificate.templateHtml
            .replace(/\{\{NOMBRE_COMPLETO\}\}/g, a.person.fullName)
            .replace(/\{\{IDENTIFICACION\}\}/g, a.person.identification)
            .replace(/\{\{TIPO_PARTICIPACION\}\}/g, a.certificate.participationType)
            .replace(/\{\{NOMBRE_EVENTO\}\}/g, a.certificate.event?.name || "")
            .replace(/\{\{FECHA_EXPEDICION\}\}/g, new Date(a.certificate.issueDate).toLocaleDateString("es-CO"))
            .replace(/\{\{DETALLES_PARTICIPACION\}\}/g, a.participationDetails || "")
            .replace(/\{\{CODIGO_VERIFICACION\}\}/g, generateVerificationCode({ fullName: a.person.fullName, identification: a.person.identification, participationType: a.certificate.participationType, eventName: a.certificate.event?.name || "", issueDate: a.certificate.issueDate, participationDetails: a.participationDetails || "" }))
        );
        setShowPreview(true)
    }
    const downloadPDF = async () => { const { default: html2canvas } = await import("html2canvas"); const { jsPDF } = await import("jspdf"); const el = document.getElementById("cert-preview"); if (!el) return; const canvas = await html2canvas(el, { scale: 2, useCORS: true }); const img = canvas.toDataURL("image/png"); const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width / 2, canvas.height / 2] }); pdf.addImage(img, "PNG", 0, 0, canvas.width / 2, canvas.height / 2); pdf.save("certificado.pdf") }
    const ic = "w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs"
    const pb: Record<string, string> = { Ponente: "bg-warning-50 text-warning-600", Evaluador: "bg-success-50 text-success-600", Asistente: "bg-brand-50 text-brand-600", Docente: "bg-blue-50 text-blue-600", Conferencista: "bg-purple-50 text-purple-600" }

    const selectedCert = certificates.find(c => c.id.toString() === form.certificateId)
    const requiresDetails = selectedCert && ["Ponente", "Conferencista", "Docente", "Evaluador"].includes(selectedCert.participationType)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h2 className="text-2xl font-semibold text-gray-800">Asignaciones</h2><p className="text-gray-500 text-sm mt-1">Asignar certificados a personas</p></div>
                <button onClick={() => { setForm({ certificateId: certificates[0]?.id?.toString() || "", identification: "", details: "" }); setError(""); setShowModal(true) }} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Asignar
                </button>
            </div>
            {loading ? <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div></div> : (() => {
                const uniqueEvents = [...new Set(assignments.map(a => a.certificate.event?.name).filter(Boolean))]
                const TYPES = [...new Set(assignments.map(a => a.certificate.participationType).filter(Boolean))]
                const filtered = assignments.filter(a => {
                    if (filterEvent && a.certificate.event?.name !== filterEvent) return false
                    if (filterType && a.certificate.participationType !== filterType) return false
                    if (filterSearch) {
                        const q = filterSearch.toLowerCase()
                        const name = a.person.fullName.toLowerCase()
                        if (!a.person.identification.includes(q) && !name.includes(q)) return false
                    }
                    return true
                })
                return (
                    <>
                        <div className="flex flex-wrap items-center gap-3">
                            <SearchableSelect value={filterEvent} onChange={setFilterEvent} placeholder="Todos los eventos" options={uniqueEvents.map(n => ({ label: n!, value: n! }))} />
                            <SearchableSelect value={filterType} onChange={setFilterType} placeholder="Todos los tipos" options={TYPES.map(t => ({ label: t, value: t }))} />
                            <input type="text" value={filterSearch} onChange={e => setFilterSearch(e.target.value)} placeholder="Buscar por ID o nombre..." className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 min-w-[200px]" />
                            {(filterEvent || filterType || filterSearch) && (
                                <button onClick={() => { setFilterEvent(""); setFilterType(""); setFilterSearch("") }} className="text-xs text-brand-600 hover:text-brand-800 font-medium transition-colors">Limpiar filtros</button>
                            )}
                            <span className="ml-auto text-xs text-gray-400">{filtered.length} asignación(es)</span>
                        </div>
                        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs"><div className="overflow-x-auto"><table className="w-full">
                            <thead><tr className="border-b border-gray-100">
                                <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Persona</th>
                                <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">ID</th>
                                <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Evento</th>
                                <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Tipo</th>
                                <th className="px-6 py-4 text-right text-theme-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr></thead>
                            <tbody className="divide-y divide-gray-100">
                                {filtered.map((a) => (
                                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-800">{a.person.fullName}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500 font-mono">{a.person.identification}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{a.certificate.event?.name}</td>
                                        <td className="px-6 py-4"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${pb[a.certificate.participationType] || "bg-gray-100 text-gray-600"}`}>{a.certificate.participationType}</span></td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button onClick={() => viewCert(a)} className="inline-flex rounded-lg border border-success-100 bg-success-50 px-3 py-1.5 text-xs font-medium text-success-600 hover:bg-success-100 transition-colors">Ver</button>
                                            <button onClick={() => askDelete(a)} className="inline-flex rounded-lg border border-error-100 bg-error-50 px-3 py-1.5 text-xs font-medium text-error-600 hover:bg-error-100 transition-colors">Eliminar</button>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">{(filterEvent || filterType) ? "No hay asignaciones con los filtros seleccionados" : "No hay asignaciones"}</td></tr>}
                            </tbody>
                        </table></div></div>
                    </>
                )
            })()}
            {showModal && (
                <div className="fixed inset-0 z-[99999] flex items-start pt-[5vh] justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg">
                        <h3 className="text-lg font-semibold text-gray-800 mb-5">Asignar Certificado</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && <div className="rounded-lg bg-error-50 border border-error-100 p-3 text-sm text-error-600">{error}</div>}
                            <div><label className="block text-sm font-medium text-gray-700 mb-2">Certificado</label><SearchableSelect value={form.certificateId} onChange={(val) => setForm({ ...form, certificateId: val })} placeholder="Seleccione certificado" options={certificates.map(c => ({ label: `${c.event?.name} - ${c.participationType}`, value: String(c.id) }))} /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-2">Identificación</label><input type="text" value={form.identification} onChange={e => setForm({ ...form, identification: e.target.value })} required className={ic} placeholder="Número de identificación" /></div>

                            {requiresDetails && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Detalles de la Participación</label>
                                    <textarea
                                        value={form.details}
                                        onChange={e => setForm({ ...form, details: e.target.value })}
                                        required
                                        rows={2}
                                        className={ic}
                                        placeholder="Ej. Conferencia titulada 'El futuro del derecho en Colombia'"
                                    />
                                    <p className="mt-2 text-xs text-gray-500">Requerido para el tipo de participación del certificado ({selectedCert?.participationType}).</p>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs">Cancelar</button>
                                <button type="submit" className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 shadow-theme-xs">Asignar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {showPreview && (
                <div className="fixed inset-0 z-[99999] flex items-start pt-[5vh] justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg max-h-[90vh] overflow-auto">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-semibold text-gray-800">Certificado</h3>
                            <div className="flex gap-2">
                                <button onClick={downloadPDF} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 shadow-theme-xs">Descargar PDF</button>
                                <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">✕</button>
                            </div>
                        </div>
                        <div id="cert-preview" className="flex justify-center" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                    </div>
                </div>
            )}
            <ConfirmModal
                open={!!confirmAction}
                title="Eliminar asignación"
                message={`¿Estás seguro de eliminar la asignación de "${confirmAction?.assignment.person.fullName}" para el certificado del evento "${confirmAction?.assignment.certificate.event?.name}"? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                variant="danger"
                onConfirm={handleConfirm}
                onCancel={() => setConfirmAction(null)}
            />
        </div>
    )
}
