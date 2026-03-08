"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import * as XLSX from "xlsx"
import ConfirmModal from "@/components/ConfirmModal"
import SearchableSelect from "@/components/SearchableSelect"
import toast from "react-hot-toast"
import CertificateBuilder from "@/components/CertificateBuilder"
import { generateVerificationCode } from "@/lib/hash"

interface Event { id: number; name: string; startDate: string; endDate: string; description: string; eventType: string; status: string }
const EVENT_STATUSES = ["Pendiente", "Realizado"]
const EVENT_TYPES = ["Diplomado", "Foro", "Charla", "Conversatorio", "Simposio", "Congreso", "Capacitación", "Curso", "Ponencia", "Taller"]
const PARTICIPATION_TYPES = ["Ponente", "Conferencista", "Asistente", "Evaluador", "Docente"]

interface Certificate { id: number; participationType: string; templateHtml: string; eventId: number; issueDate: string; _count?: { assignments: number } }
interface Person { id: number; fullName: string; identification: string; email: string }
interface ViewerAssignment { id: number; certificate: Certificate; person: Person; createdAt: string; participationDetails?: string }
interface ExtendedEvent extends Event { certificates?: Certificate[] }

export default function EventosPage() {
    const [events, setEvents] = useState<ExtendedEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingEvent, setEditingEvent] = useState<Event | null>(null)
    const [form, setForm] = useState({ name: "", startDate: "", endDate: "", description: "", eventType: "Diplomado", status: "Realizado" })
    const [activeTab, setActiveTab] = useState("Pendiente")
    const [error, setError] = useState("")
    const [searchName, setSearchName] = useState("")
    const [filterFrom, setFilterFrom] = useState("")
    const [filterTo, setFilterTo] = useState("")
    const [filterType, setFilterType] = useState("")
    const [page, setPage] = useState(1)
    const PER_PAGE = 15
    const [showImportModal, setShowImportModal] = useState(false)
    const [importData, setImportData] = useState<any[]>([])
    const [importing, setImporting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [confirmAction, setConfirmAction] = useState<{ type: "delete" | "status" | "cert-delete" | "viewer-delete" | "send-emails"; event?: Event; cert?: Certificate } | null>(null)
    const [sendingEmails, setSendingEmails] = useState(false)

    // Certificates Management State
    const [showCertModal, setShowCertModal] = useState(false)
    const [editingCert, setEditingCert] = useState<Certificate | null>(null)
    const [certForm, setCertForm] = useState({ participationType: "Asistente", templateHtml: "", eventId: "", issueDate: "" })
    const [certError, setCertError] = useState("")

    // Assignment State
    const [showAssignModal, setShowAssignModal] = useState(false)
    const [assignMode, setAssignMode] = useState<'individual' | 'bulk'>('individual')
    const [assignCert, setAssignCert] = useState<Certificate | null>(null)
    const [assignForm, setAssignForm] = useState({ identification: "", details: "" })
    const [bulkFile, setBulkFile] = useState<File | null>(null)
    const [bulkLoading, setBulkLoading] = useState(false)

    // Viewer State
    const [showViewerModal, setShowViewerModal] = useState(false)
    const [viewerCert, setViewerCert] = useState<Certificate | null>(null)
    const [viewerAssignments, setViewerAssignments] = useState<ViewerAssignment[]>([])
    const [viewerLoading, setViewerLoading] = useState(false)
    const [viewerSearch, setViewerSearch] = useState("")
    const [selectedAssignments, setSelectedAssignments] = useState<number[]>([])
    const [deletingAssignments, setDeletingAssignments] = useState(false)

    // Preview
    const [showPreview, setShowPreview] = useState(false)
    const [previewHtml, setPreviewHtml] = useState("")
    const [previewFromViewer, setPreviewFromViewer] = useState(false)

    const fetchEvents = useCallback(async () => { const res = await fetch("/api/eventos"); setEvents(await res.json().catch(() => ([]))); setLoading(false) }, [])
    useEffect(() => { fetchEvents() }, [fetchEvents])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError("")
        const url = editingEvent ? `/api/eventos/${editingEvent.id}` : "/api/eventos"
        const res = await fetch(url, { method: editingEvent ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
        if (res.ok) {
            toast.success(editingEvent ? "Evento actualizado" : "Evento creado", { style: { background: '#F0FDF4', color: '#166534', border: '1px solid #4ADE80' }, iconTheme: { primary: '#22C55E', secondary: '#F0FDF4' } })
            setShowModal(false); setEditingEvent(null); setForm({ name: "", startDate: "", endDate: "", description: "", eventType: "Diplomado", status: "Realizado" }); fetchEvents()
        } else {
            const data = await res.json().catch(() => ({}))
            const err = data.error || "Error al guardar el evento"
            toast.error(err, { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' } })
            setError(err)
        }
    }
    const handleDelete = async (id: number) => {
        const res = await fetch(`/api/eventos/${id}`, { method: "DELETE" })
        if (res.ok) {
            toast.success("Evento eliminado", { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' }, iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' } })
            fetchEvents()
        } else {
            const errData = await res.json().catch(() => ({}))
            toast.error(errData.error || "Error al eliminar el evento")
        }
    }
    const toggleStatus = async (ev: Event) => {
        const newStatus = (ev.status || "Realizado") === "Realizado" ? "Pendiente" : "Realizado";
        const res = await fetch(`/api/eventos/${ev.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: ev.name, startDate: new Date(ev.startDate).toISOString().split("T")[0], endDate: new Date(ev.endDate).toISOString().split("T")[0], description: ev.description || "", eventType: ev.eventType, status: newStatus }) });
        if (res.ok) {
            toast.success(`Estado del evento: ${newStatus}`)
            fetchEvents()
        } else {
            const errData = await res.json().catch(() => ({}))
            toast.error(errData.error || "Error al cambiar el estado")
        }
    }
    const askDelete = (ev: Event) => setConfirmAction({ type: "delete", event: ev })
    const askToggle = (ev: Event) => setConfirmAction({ type: "status", event: ev })
    const askCertDelete = (cert: Certificate) => setConfirmAction({ type: "cert-delete", cert: cert })
    const askSendEmails = () => setConfirmAction({ type: "send-emails" })

    const handleSendEmails = async () => {
        if (!viewerCert) return
        const ids = selectedAssignments.length > 0 ? selectedAssignments : viewerAssignments.map(a => a.id)
        if (ids.length === 0) { toast.error("No hay personas para notificar"); return }

        setSendingEmails(true)
        const tId = toast.loading(`Enviando ${ids.length} correos...`)
        try {
            const res = await fetch("/api/emails/send-certificate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ assignmentIds: ids })
            })
            const data = await res.json()
            if (res.ok) {
                toast.success(`¡Enviados! ${data.sent} correos enviados correctamente.${data.failed > 0 ? ` (${data.failed} fallaron)` : ""}`, { id: tId, duration: 5000 })
                setSelectedAssignments([])
            } else {
                toast.error(data.error || "Error al enviar correos", { id: tId })
            }
        } catch (error) {
            toast.error("Error de conexión al enviar correos", { id: tId })
        } finally {
            setSendingEmails(false)
            setConfirmAction(null)
        }
    }

    const handleConfirm = () => {
        if (!confirmAction) return
        if (confirmAction.type === "send-emails") { handleSendEmails(); return }
        if (confirmAction.type === "delete" && confirmAction.event) handleDelete(confirmAction.event.id)
        else if (confirmAction.type === "status" && confirmAction.event) toggleStatus(confirmAction.event)
        else if (confirmAction.type === "cert-delete" && confirmAction.cert) {
            handleCertDelete(confirmAction.cert.id)
        }
        else if (confirmAction.type === "viewer-delete") executeViewerDelete()
        setConfirmAction(null)
    }
    const openCreate = () => { setEditingEvent(null); setForm({ name: "", startDate: "", endDate: "", description: "", eventType: "Diplomado", status: activeTab }); setError(""); setShowModal(true) }
    const openEdit = (ev: Event) => { setEditingEvent(ev); setForm({ name: ev.name, startDate: new Date(ev.startDate).toISOString().split("T")[0], endDate: new Date(ev.endDate).toISOString().split("T")[0], description: ev.description || "", eventType: ev.eventType, status: ev.status || "Realizado" }); setError(""); setShowModal(true) }
    const formatDate = (d: string) => new Date(d).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })
    const ic = "w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs"
    const tb: Record<string, string> = { Diplomado: "bg-brand-50 text-brand-700", Foro: "bg-purple-50 text-purple-700", Charla: "bg-green-50 text-green-700", Conversatorio: "bg-amber-50 text-amber-700", Simposio: "bg-pink-50 text-pink-700", Congreso: "bg-red-50 text-red-700", "Capacitación": "bg-cyan-50 text-cyan-700", Curso: "bg-brand-50 text-brand-700", Ponencia: "bg-orange-50 text-orange-700", Taller: "bg-teal-50 text-teal-700" }

    const now = Date.now()
    const filtered = events
        .filter((ev) => {
            if ((ev.status || "Realizado") !== activeTab) return false
            if (searchName && !ev.name.toLowerCase().includes(searchName.toLowerCase())) return false
            if (filterFrom && new Date(ev.startDate) < new Date(filterFrom)) return false
            if (filterTo && new Date(ev.endDate) > new Date(filterTo + "T23:59:59")) return false
            if (filterType && ev.eventType !== filterType) return false
            return true
        })
        .sort((a, b) => Math.abs(new Date(a.startDate).getTime() - now) - Math.abs(new Date(b.startDate).getTime() - now))
    const countByStatus = (s: string) => events.filter(ev => (ev.status || "Realizado") === s).length
    const hasFilters = searchName || filterFrom || filterTo || filterType
    const clearFilters = () => { setSearchName(""); setFilterFrom(""); setFilterTo(""); setFilterType(""); setPage(1) }
    const totalPages = Math.ceil(filtered.length / PER_PAGE)
    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

    const downloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([
            ["nombre", "fecha_inicio", "fecha_fin", "descripcion", "tipo_evento"],
            ["Diplomado en IA", "2025-06-01", "2025-06-15", "Diplomado sobre inteligencia artificial", "Diplomado"],
            ["Foro de Innovación", "2025-07-10", "2025-07-10", "Foro sobre innovación tecnológica", "Foro"],
        ])
        ws["!cols"] = [{ wch: 25 }, { wch: 14 }, { wch: 14 }, { wch: 40 }, { wch: 16 }]
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Eventos")
        XLSX.writeFile(wb, "plantilla_eventos.xlsx")
    }

    // --- CERTIFICATE ACTIONS ---
    const handleCertSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setCertError("")
        const url = editingCert ? `/api/certificados/${editingCert.id}` : "/api/certificados"
        const res = await fetch(url, { method: editingCert ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(certForm) })
        if (res.ok) {
            toast.success(editingCert ? "Certificado actualizado" : "Certificado creado", { style: { background: '#F0FDF4', color: '#166534', border: '1px solid #4ADE80' }, iconTheme: { primary: '#22C55E', secondary: '#F0FDF4' } })
            setShowCertModal(false); setEditingCert(null); setCertForm({ participationType: "Asistente", templateHtml: "", eventId: "", issueDate: "" }); fetchEvents()
        } else {
            const data = await res.json().catch(() => ({}))
            const err = data.error || "Error al guardar el certificado"
            toast.error(err, { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' } }); setCertError(err)
        }
    }
    const handleCertDelete = async (id: number) => {
        const res = await fetch(`/api/certificados/${id}`, { method: "DELETE" });
        if (res.ok) { toast.success("Certificado eliminado", { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' }, iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' } }); fetchEvents() } else { const err = await res.json().catch(() => ({})); toast.error(err.error || "Error al eliminar el certificado") }
    }
    const openCreateCert = (eventId: number) => { setEditingCert(null); setCertForm({ participationType: "Asistente", templateHtml: "", eventId: eventId.toString(), issueDate: new Date().toISOString().split("T")[0] }); setCertError(""); setShowCertModal(true) }
    const openEditCert = (c: Certificate) => { setEditingCert(c); setCertForm({ participationType: c.participationType, templateHtml: c.templateHtml, eventId: c.eventId.toString(), issueDate: new Date(c.issueDate).toISOString().split("T")[0] }); setCertError(""); setShowCertModal(true) }
    const openCertPreview = (c: Certificate, evt: ExtendedEvent) => {
        setPreviewFromViewer(false)
        const sampleDetails = "Detalles de participación (Ej. título de la conferencia)";
        setPreviewHtml(c.templateHtml
            .replace(/\{\{NOMBRE_COMPLETO\}\}/g, "Juan Pérez")
            .replace(/\{\{IDENTIFICACION\}\}/g, "1234567890")
            .replace(/\{\{TIPO_PARTICIPACION\}\}/g, c.participationType)
            .replace(/\{\{NOMBRE_EVENTO\}\}/g, evt.name || "")
            .replace(/\{\{FECHA_EXPEDICION\}\}/g, new Date(c.issueDate).toLocaleDateString("es-CO"))
            .replace(/\{\{DETALLES_PARTICIPACION\}\}/g, sampleDetails)
            .replace(/\{\{CODIGO_VERIFICACION\}\}/g, generateVerificationCode({ fullName: "Juan Pérez", identification: "1234567890", participationType: c.participationType, eventName: evt.name || "", issueDate: c.issueDate, participationDetails: sampleDetails }))
        );
        setShowPreview(true)
    }

    // --- ASSIGNMENT ACTIONS ---
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
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ certificateId: assignCert.id, identification: assignForm.identification, participationDetails: assignForm.details })
            })
            if (res.ok) { toast.success(`Certificado asignado a ${assignForm.identification}`, { style: { background: '#F0FDF4', color: '#166534', border: '1px solid #4ADE80' }, iconTheme: { primary: '#22C55E', secondary: '#F0FDF4' } }); setShowAssignModal(false); fetchEvents() }
            else { const data = await res.json().catch(() => ({})); toast.error(data.error || "Error al asignar", { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' } }) }
        } else if (assignMode === 'bulk' && bulkFile) {
            setBulkLoading(true)
            try {
                const reader = new FileReader(); reader.onload = async (evt) => {
                    const bstr = evt.target?.result; const wb = XLSX.read(bstr, { type: 'binary' })
                    const wsname = wb.SheetNames[0]; const ws = wb.Sheets[wsname]; const data = XLSX.utils.sheet_to_json(ws)
                    const res = await fetch("/api/asignaciones/bulk", {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ certificateId: assignCert.id, people: data })
                    })
                    const resData = await res.json().catch(() => ({ error: "Respuesta inválida del servidor" }))
                    if (res.ok && resData.success) {
                        toast.success(`Masivo: ${resData.assignedCount} asignados, ${resData.errorCount} errores.`)
                        if (resData.errorCount > 0) {
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
                        setShowAssignModal(false); fetchEvents()
                    } else toast.error(resData.error || "Error masivo")
                    setBulkLoading(false)
                }; reader.readAsBinaryString(bulkFile)
            } catch { toast.error("Error leyendo Excel"); setBulkLoading(false) }
        }
    }
    const downloadExampleXLSX = () => {
        const exampleData = [{ Identificacion: "123456789", Nombre_Completo: "Juan Carlos Perez Gomez", Correo: "juan@ejemplo.com", ...(assignCert && ["Ponente", "Conferencista", "Evaluador"].includes(assignCert.participationType) ? { Detalles: "Ponencia magistral" } : {}) }];
        const ws = XLSX.utils.json_to_sheet(exampleData); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Platilla"); XLSX.writeFile(wb, "Plantilla_Asignacion.xlsx");
    }

    // --- VIEWER ACTIONS ---
    const openViewerModal = async (cert: Certificate) => {
        setViewerCert(cert); setViewerSearch(""); setViewerLoading(true); setShowViewerModal(true); setSelectedAssignments([])
        try { const res = await fetch("/api/asignaciones"); const all: ViewerAssignment[] = await res.json().catch(() => ([])); setViewerAssignments(all.filter(a => a.certificate?.id === cert.id)) }
        catch { toast.error("Error cargando asignaciones"); setViewerAssignments([]) }
        setViewerLoading(false)
    }
    const filteredViewerAssignments = viewerAssignments.filter(a => {
        if (!viewerSearch) return true
        const q = viewerSearch.toLowerCase(); const name = a.person.fullName.toLowerCase()
        return name.includes(q) || a.person.identification.includes(q)
    })
    const toggleAssignmentSelection = (id: number) => setSelectedAssignments(prev => prev.includes(id) ? prev.filter(aId => aId !== id) : [...prev, id])
    const toggleAllAssignments = () => selectedAssignments.length === filteredViewerAssignments.length ? setSelectedAssignments([]) : setSelectedAssignments(filteredViewerAssignments.map(a => a.id))
    const deleteSelectedAssignments = () => {
        if (selectedAssignments.length === 0) return;
        setConfirmAction({ type: "viewer-delete" })
    }
    const executeViewerDelete = async () => {
        setDeletingAssignments(true)
        try {
            const res = await fetch('/api/asignaciones/bulk-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assignmentIds: selectedAssignments }) })
            if (res.ok) {
                toast.success(`Se eliminaron ${selectedAssignments.length} asignaciones`, { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' }, iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' } }); setViewerAssignments(prev => prev.filter(a => !selectedAssignments.includes(a.id))); setSelectedAssignments([]); fetchEvents()
            } else {
                const errData = await res.json().catch(() => ({}));
                toast.error(errData.error || "Error al eliminar")
            }
        } catch { toast.error("Error de conexión al eliminar") }
        setDeletingAssignments(false)
        setConfirmAction(null)
    }
    const viewAssignmentCert = (a: ViewerAssignment, eventName: string) => {
        setPreviewFromViewer(true)
        setPreviewHtml(a.certificate.templateHtml.replace(/\{\{NOMBRE_COMPLETO\}\}/g, a.person.fullName).replace(/\{\{IDENTIFICACION\}\}/g, a.person.identification).replace(/\{\{TIPO_PARTICIPACION\}\}/g, a.certificate.participationType).replace(/\{\{NOMBRE_EVENTO\}\}/g, eventName).replace(/\{\{FECHA_EXPEDICION\}\}/g, new Date(a.certificate.issueDate).toLocaleDateString("es-CO")).replace(/\{\{DETALLES_PARTICIPACION\}\}/g, a.participationDetails || "").replace(/\{\{CODIGO_VERIFICACION\}\}/g, generateVerificationCode({ fullName: a.person.fullName, identification: a.person.identification, participationType: a.certificate.participationType, eventName: eventName, issueDate: a.certificate.issueDate, participationDetails: a.participationDetails || "" })))
        setShowViewerModal(false); setShowPreview(true)
    }

    const downloadPDF = async () => {
        const { default: html2canvas } = await import("html2canvas"); const { jsPDF } = await import("jspdf")
        const el = document.getElementById("cert-preview"); if (!el) return
        const tId = toast.loading("Generando PDF...")
        try { const canvas = await html2canvas(el, { scale: 2, useCORS: true }); const img = canvas.toDataURL("image/png"); const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width / 2, canvas.height / 2] }); pdf.addImage(img, "PNG", 0, 0, canvas.width / 2, canvas.height / 2); pdf.save("certificado.pdf"); toast.success("PDF descargado", { id: tId }) }
        catch { toast.error("Error al generar", { id: tId }) }
    }

    const handleFileUpload = (file: File) => {
        setImportData([])
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer)
                const wb = XLSX.read(data, { type: "array" })
                const ws = wb.Sheets[wb.SheetNames[0]]
                const rows: any[] = XLSX.utils.sheet_to_json(ws)
                if (rows.length === 0) { toast.error("El archivo está vacío"); return }
                const required = ["nombre", "fecha_inicio", "fecha_fin", "descripcion", "tipo_evento"]
                const headers = Object.keys(rows[0]).map(h => h.toLowerCase().trim())
                const missing = required.filter(r => !headers.includes(r))
                if (missing.length > 0) { toast.error(`Columnas faltantes: ${missing.join(", ")}`); return }
                setImportData(rows)
            } catch { toast.error("Error al leer el archivo") }
        }
        reader.readAsArrayBuffer(file)
    }

    const handleImport = async () => {
        setImporting(true)
        let ok = 0, fail = 0
        for (const row of importData) {
            const body = {
                name: row.nombre || row.Nombre || "",
                startDate: String(row.fecha_inicio || row.Fecha_inicio || ""),
                endDate: String(row.fecha_fin || row.Fecha_fin || ""),
                description: row.descripcion || row.Descripcion || "",
                eventType: row.tipo_evento || row.Tipo_evento || "Diplomado",
            }
            if (!body.name || !body.startDate || !body.endDate) { fail++; continue }
            const res = await fetch("/api/eventos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
            if (res.ok) ok++; else fail++
        }
        setImporting(false)
        if (fail > 0 && ok > 0) toast.success(`Importación parcial: ${ok} creados, ${fail} fallaron.`, { icon: '⚠️' })
        else if (fail > 0) toast.error(`Error al importar. (${fail} fallaron).`)
        else toast.success(`¡Importación exitosa! ${ok} eventos creados.`)

        setImportData([])
        fetchEvents()
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    const exportEvents = () => {
        const data = events.map(ev => ({
            nombre: ev.name,
            tipo_evento: ev.eventType,
            estado: ev.status || "Realizado",
            fecha_inicio: new Date(ev.startDate).toISOString().split("T")[0],
            fecha_fin: new Date(ev.endDate).toISOString().split("T")[0],
            descripcion: ev.description,
        }))
        const ws = XLSX.utils.json_to_sheet(data)
        ws["!cols"] = [{ wch: 30 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 45 }]
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Eventos")
        XLSX.writeFile(wb, `eventos_todos_${new Date().toISOString().split("T")[0]}.xlsx`)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h2 className="text-2xl font-semibold text-gray-800">Eventos</h2><p className="text-gray-500 text-sm mt-1">Gestión de eventos académicos</p></div>
                <div className="flex items-center gap-3">
                    <button onClick={exportEvents} disabled={events.length === 0} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Exportar
                    </button>
                    <button onClick={() => { setImportData([]); setShowImportModal(true) }} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Importar
                    </button>
                    <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Nuevo Evento
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input type="text" value={searchName} onChange={e => setSearchName(e.target.value)} placeholder="Buscar por nombre del evento..." className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-12 pr-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs" />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs">
                            <option value="">Todos los tipos</option>
                            {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-500 whitespace-nowrap">Desde</label>
                            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs" />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-500 whitespace-nowrap">Hasta</label>
                            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs" />
                        </div>
                        {hasFilters && (
                            <button onClick={clearFilters} className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50 shadow-theme-xs transition-colors whitespace-nowrap">Limpiar</button>
                        )}
                    </div>
                </div>
                {hasFilters && <p className="text-xs text-gray-400 mt-3">{filtered.length} evento{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}</p>}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
                {EVENT_STATUSES.map(s => (
                    <button key={s} onClick={() => { setActiveTab(s); setPage(1) }} className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeTab === s ? "bg-white text-gray-900 shadow-theme-xs" : "text-gray-500 hover:text-gray-700"}`}>
                        {s} <span className={`ml-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs ${activeTab === s ? "bg-brand-50 text-brand-600" : "bg-gray-200 text-gray-500"}`}>{countByStatus(s)}</span>
                    </button>
                ))}
            </div>

            {loading ? <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div></div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {paginated.map((ev) => (
                        <div key={ev.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs hover:shadow-theme-sm transition-shadow group">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${tb[ev.eventType] || "bg-gray-100 text-gray-600"}`}>{ev.eventType}</span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(ev)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded-lg transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                    <button onClick={() => askDelete(ev)} className="p-1.5 text-gray-400 hover:text-error-600 hover:bg-gray-100 rounded-lg transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                </div>
                            </div>
                            <h3 className="text-base font-semibold text-gray-800 mb-1.5">{ev.name}</h3>
                            <p className="text-sm text-gray-500 mb-4 line-clamp-2">{ev.description}</p>

                            {/* Certificates Section */}
                            <div className="mt-4 border-t border-gray-100 pt-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Certificados</span>
                                    <button onClick={() => openCreateCert(ev.id)} className="text-xs text-brand-500 font-medium hover:text-brand-600 transition-colors">+ Añadir</button>
                                </div>
                                {ev.certificates && ev.certificates.length > 0 ? (
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {ev.certificates.map((cert: Certificate) => (
                                            <div key={cert.id} className="p-2 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-between group/cert cursor-default hover:bg-white hover:border-gray-200 transition-colors">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <div className="w-8 h-8 rounded bg-brand-50 flex items-center justify-center text-brand-500 flex-shrink-0">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-medium text-gray-800 truncate" title={cert.participationType}>{cert.participationType}</p>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <button onClick={() => openViewerModal(cert)} className="text-[10px] font-medium text-brand-600 hover:text-brand-800 transition-colors hover:underline flex items-center gap-0.5">
                                                                <span className="w-4 h-4 rounded-full bg-brand-100 flex items-center justify-center text-brand-700">{cert._count?.assignments || 0}</span> Asig.
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover/cert:opacity-100 transition-opacity ml-2">
                                                    <button onClick={() => openCertPreview(cert, ev)} title="Vista previa" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                                                    <button onClick={() => openEditCert(cert)} title="Editar" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand-600 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                                    <button onClick={() => openAssignModal(cert)} title="Asignar" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-success-600 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg></button>
                                                    <button onClick={() => askCertDelete(cert)} title="Eliminar" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-error-600 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-4 text-center rounded-lg border border-dashed border-gray-200 bg-gray-50/50">
                                        <p className="text-xs text-gray-400">Sin certificados creados.</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-3">
                                <span className="text-xs text-gray-400 font-medium">📅 {formatDate(ev.startDate)} — {formatDate(ev.endDate)}</span>
                                <button onClick={() => askToggle(ev)} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${(ev.status || "Realizado") === "Realizado" ? "bg-success-50 text-success-600 hover:bg-success-100" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${(ev.status || "Realizado") === "Realizado" ? "bg-success-500" : "bg-gray-400"}`}></span>
                                    {ev.status || "Realizado"}
                                </button>
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && <div className="col-span-full text-center py-12 text-gray-400 text-sm">{hasFilters ? "No se encontraron eventos con los filtros aplicados" : "No hay eventos registrados"}</div>}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-6 py-4 shadow-theme-xs">
                    <p className="text-sm text-gray-500">Mostrando {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} de {filtered.length}</p>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed">← Anterior</button>
                        <span className="text-sm text-gray-500 px-2">{page} / {totalPages}</span>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Siguiente →</button>
                    </div>
                </div>
            )}
            {showModal && (
                <div className="fixed inset-0 z-[99999] flex items-start pt-[5vh] justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-800 mb-5">{editingEvent ? "Editar Evento" : "Nuevo Evento"}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && <div className="rounded-lg bg-error-50 border border-error-100 p-3 text-sm text-error-600">{error}</div>}
                            <div><label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className={ic} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label><SearchableSelect value={form.eventType} onChange={(val) => setForm({ ...form, eventType: val })} placeholder="Seleccionar tipo" options={EVENT_TYPES.map(t => ({ label: t, value: t }))} /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-2">Estado</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={ic}>{EVENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-2">Inicio</label><input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required className={ic} /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-2">Fin</label><input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} required className={ic} /></div>
                            </div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-2">Descripción <span className="text-gray-400 font-normal">(opcional)</span></label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className={`${ic} resize-none`} /></div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs">Cancelar</button>
                                <button type="submit" className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 shadow-theme-xs">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 z-[99999] flex items-start pt-[5vh] justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg">
                        <h3 className="text-lg font-semibold text-gray-800 mb-5">Importar Eventos desde Excel</h3>

                        {/* Template download */}
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 mb-5">
                            <p className="text-sm text-gray-600 mb-3">Descarga la plantilla con el formato correcto para importar eventos.</p>
                            <button onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Descargar Plantilla
                            </button>
                        </div>

                        {/* File upload */}
                        <div
                            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-brand-300 transition-colors cursor-pointer mb-5"
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-brand-400", "bg-brand-25") }}
                            onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-brand-400", "bg-brand-25") }}
                            onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-brand-400", "bg-brand-25"); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f) }}
                        >
                            <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            <p className="text-sm text-gray-500 mb-1">Arrastra tu archivo Excel aquí o <span className="text-brand-500 font-medium">haz clic para seleccionar</span></p>
                            <p className="text-xs text-gray-400">.xlsx, .xls</p>
                            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }} />
                        </div>

                        {/* Preview */}
                        {importData.length > 0 && (
                            <div className="mb-5">
                                <p className="text-sm font-medium text-gray-700 mb-3">{importData.length} evento{importData.length !== 1 ? "s" : ""} detectado{importData.length !== 1 ? "s" : ""}:</p>
                                <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200">
                                    <table className="w-full text-xs">
                                        <thead><tr className="bg-gray-50 border-b border-gray-100">
                                            <th className="px-3 py-2 text-left text-gray-500 font-medium">Nombre</th>
                                            <th className="px-3 py-2 text-left text-gray-500 font-medium">Tipo</th>
                                            <th className="px-3 py-2 text-left text-gray-500 font-medium">Inicio</th>
                                            <th className="px-3 py-2 text-left text-gray-500 font-medium">Fin</th>
                                        </tr></thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {importData.slice(0, 10).map((row, i) => (
                                                <tr key={i} className="hover:bg-gray-50">
                                                    <td className="px-3 py-2 text-gray-800 font-medium">{row.nombre || row.Nombre}</td>
                                                    <td className="px-3 py-2 text-gray-500">{row.tipo_evento || row.Tipo_evento}</td>
                                                    <td className="px-3 py-2 text-gray-500">{row.fecha_inicio || row.Fecha_inicio}</td>
                                                    <td className="px-3 py-2 text-gray-500">{row.fecha_fin || row.Fecha_fin}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {importData.length > 10 && <p className="text-xs text-gray-400 text-center py-2">...y {importData.length - 10} más</p>}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button type="button" onClick={() => setShowImportModal(false)} className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">Cerrar</button>
                            {importData.length > 0 && (
                                <button onClick={handleImport} disabled={importing} className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 shadow-theme-xs transition-colors disabled:opacity-50">
                                    {importing ? "Importando..." : `Importar ${importData.length} evento${importData.length !== 1 ? "s" : ""}`}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <ConfirmModal
                open={!!confirmAction}
                title={confirmAction?.type === "delete" ? "Eliminar evento" : confirmAction?.type === "cert-delete" ? "Eliminar certificado" : confirmAction?.type === "viewer-delete" ? "Eliminar asignaciones" : confirmAction?.type === "send-emails" ? "Enviar correos masivos" : "Cambiar estado"}
                message={confirmAction?.type === "delete" ? `¿Estás seguro de eliminar "${confirmAction?.event?.name}"? Esta acción no se puede deshacer.` : confirmAction?.type === "cert-delete" ? `¿Estás seguro de eliminar este certificado de tipo "${confirmAction?.cert?.participationType}"?` : confirmAction?.type === "viewer-delete" ? `¿Estás seguro de que deseas eliminar las ${selectedAssignments.length} asignaciones seleccionadas?` : confirmAction?.type === "send-emails" ? `¿Estás seguro de que deseas enviar el correo de notificación a las ${selectedAssignments.length > 0 ? selectedAssignments.length : viewerAssignments.length} personas ${selectedAssignments.length > 0 ? "seleccionadas" : "del certificado"}?` : `¿Cambiar el estado de "${confirmAction?.event?.name}" a ${(confirmAction?.event?.status || "Realizado") === "Realizado" ? "Pendiente" : "Realizado"}?`}
                confirmText={confirmAction?.type === "status" ? "Cambiar estado" : confirmAction?.type === "send-emails" ? "Enviar correos" : "Eliminar"}
                variant={confirmAction?.type === "delete" || confirmAction?.type === "cert-delete" || confirmAction?.type === "viewer-delete" ? "danger" : confirmAction?.type === "send-emails" ? "info" : "warning"}
                onConfirm={handleConfirm}
                onCancel={() => setConfirmAction(null)}
            />

            {/* Certificate Modal */}
            {showCertModal && (
                <div className="fixed inset-0 z-[99999] flex items-start pt-[5vh] justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-[90rem] rounded-2xl border border-gray-200 bg-white shadow-theme-lg max-h-[90vh] flex flex-col">
                        <div className="flex-none px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-800">{editingCert ? "Editar Certificado" : "Nuevo Certificado"}</h3>
                            <button onClick={() => setShowCertModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1">✕</button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            <form id="cert-form" onSubmit={handleCertSubmit} className="space-y-5">
                                {certError && <div className="rounded-lg bg-error-50 border border-error-100 p-3 text-sm text-error-600">{certError}</div>}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Evento</label>
                                        <select value={certForm.eventId} onChange={e => setCertForm({ ...certForm, eventId: e.target.value })} required disabled={!editingCert && !!certForm.eventId} className={ic}>
                                            <option value="">Seleccionar evento</option>
                                            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Participación</label>
                                        <SearchableSelect value={certForm.participationType} onChange={(val) => setCertForm({ ...certForm, participationType: val })} placeholder="Ej: Asistente" options={PARTICIPATION_TYPES.map(t => ({ label: t, value: t }))} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Expedición</label>
                                        <input type="date" value={certForm.issueDate} onChange={e => setCertForm({ ...certForm, issueDate: e.target.value })} required className={ic} />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-medium text-gray-700">Diseño HTML</label>
                                        <span className="text-xs text-gray-500 font-mono">Usar variables: {'{{NOMBRE_COMPLETO}}'}, {'{{CODIGO_VERIFICACION}}'}, etc.</span>
                                    </div>
                                    <CertificateBuilder initialHtml={certForm.templateHtml} onChange={html => setCertForm({ ...certForm, templateHtml: html })} />
                                </div>
                            </form>
                        </div>
                        <div className="flex-none px-6 py-4 border-t border-gray-100 flex gap-3 justify-end bg-gray-50 rounded-b-2xl">
                            <button type="button" onClick={() => setShowCertModal(false)} className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">Cancelar</button>
                            <button type="submit" form="cert-form" className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 shadow-theme-xs transition-colors">Guardar Certificado</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assignments Modal */}
            {showAssignModal && assignCert && (
                <div className="fixed inset-0 z-[99999] flex items-start pt-[5vh] justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg">
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">Asignar Certificado</h3>
                        <p className="text-sm text-gray-500 mb-5">{events.find(e => e.id === assignCert.eventId)?.name} — <span className="font-medium text-brand-600">{assignCert.participationType}</span></p>

                        <div className="flex p-1 bg-gray-100 rounded-lg mb-6">
                            <button onClick={() => setAssignMode('individual')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${assignMode === 'individual' ? 'bg-white shadow-theme-xs text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Individual</button>
                            <button onClick={() => setAssignMode('bulk')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${assignMode === 'bulk' ? 'bg-white shadow-theme-xs text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Masivo (Excel)</button>
                        </div>

                        <form onSubmit={handleAssignSubmit} className="space-y-4">
                            {assignMode === 'individual' ? (
                                <>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Identificación de la Persona *</label><input type="text" value={assignForm.identification} onChange={e => setAssignForm({ ...assignForm, identification: e.target.value })} required className={ic} placeholder="Ej: 123456789" /></div>
                                    {["Ponente", "Conferencista", "Docente", "Evaluador"].includes(assignCert.participationType) && (
                                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Detalles de Participación *</label><input type="text" value={assignForm.details} onChange={e => setAssignForm({ ...assignForm, details: e.target.value })} required className={ic} placeholder="Ej: Título de la conferencia..." /></div>
                                    )}
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="rounded-lg bg-brand-50 border border-brand-100 p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-brand-100/50 rounded-lg text-brand-600 mt-0.5"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-brand-800 mb-1">Instrucciones de carga masiva</h4>
                                                <p className="text-xs text-brand-600 leading-relaxed">Debe ser un archivo Excel (.xlsx, .xls) con las siguientes columnas exactas: <strong className="font-semibold">Identificacion, Nombre_Completo, Correo</strong>. <br /> Si el usuario no existe en la base de datos se creará automáticamente.</p>
                                                {assignCert && ["Ponente", "Conferencista", "Docente", "Evaluador"].includes(assignCert.participationType) && <p className="text-xs text-brand-700 leading-relaxed font-medium mt-1 mt-1">⚠️ Requiere columna adicional: <strong className="font-semibold">Detalles</strong>.</p>}
                                                <button type="button" onClick={downloadExampleXLSX} className="mt-3 text-xs font-semibold text-brand-700 bg-white/60 hover:bg-white px-3 py-1.5 rounded-md border border-brand-200 transition-colors inline-flex items-center gap-1.5"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> Descargar Plantilla</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:bg-gray-50 flex flex-col items-center justify-center transition-colors">
                                        <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mb-3">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        </div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Subir Archivo Excel</label>
                                        <p className="text-xs text-gray-500 mb-4">Seleccione su hoja de cálculo completada (.xlsx)</p>
                                        <input type="file" accept=".xlsx,.xls,.csv" required onChange={e => setBulkFile(e.target.files?.[0] || null)} className="w-full max-w-xs text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 transition-colors cursor-pointer" />
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

            {/* Viewer Modal */}
            {showViewerModal && viewerCert && (
                <div className="fixed inset-0 z-[99999] flex items-start pt-[5vh] justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-theme-lg max-h-[85vh] flex flex-col">
                        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-lg font-semibold text-gray-800">Asignaciones del Certificado</h3>
                                <button onClick={() => setShowViewerModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                            </div>
                            <input type="text" placeholder="Buscar por nombre o ID..." value={viewerSearch} onChange={e => setViewerSearch(e.target.value)} className={ic} />
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            {viewerLoading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div></div> : (
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-100"><tr className="text-left text-xs font-medium text-gray-500 uppercase">
                                        <th className="px-4 py-3"><input type="checkbox" checked={filteredViewerAssignments.length > 0 && selectedAssignments.length === filteredViewerAssignments.length} onChange={toggleAllAssignments} /></th>
                                        <th className="px-4 py-3">Persona</th><th className="px-4 py-3 text-right">Acción</th>
                                    </tr></thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredViewerAssignments.map(a => (
                                            <tr key={a.id} className="hover:bg-gray-50"><td className="px-4 py-2"><input type="checkbox" checked={selectedAssignments.includes(a.id)} onChange={() => toggleAssignmentSelection(a.id)} /></td><td className="px-4 py-2 text-sm">{a.person.fullName}</td><td className="px-4 py-2 text-right"><button onClick={() => viewAssignmentCert(a, events.find(e => e.id === viewerCert.eventId)?.name || "")} className="text-xs text-brand-600">Ver Certificado</button></td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                {selectedAssignments.length > 0 && (
                                    <button onClick={deleteSelectedAssignments} disabled={deletingAssignments || sendingEmails} className="inline-flex items-center gap-1.5 rounded-lg border border-error-100 bg-error-50 px-3 py-2 text-sm font-medium text-error-600 hover:bg-error-100 transition-colors disabled:opacity-50">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        Eliminar
                                    </button>
                                )}
                                <button
                                    onClick={askSendEmails}
                                    disabled={sendingEmails || viewerAssignments.length === 0}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-100 transition-colors disabled:opacity-50"
                                    title={selectedAssignments.length > 0 ? "Enviar a seleccionados" : "Enviar a todos"}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    {selectedAssignments.length > 0 ? `Notificar (${selectedAssignments.length})` : "Notificar a todos"}
                                </button>
                            </div>
                            <button onClick={() => setShowViewerModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-gray-900/80 p-4">
                    <div className="w-full max-w-5xl rounded-2xl border border-gray-200 bg-white shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><svg className="w-5 h-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>Vista Previa del Certificado</h3>
                            <div className="flex items-center gap-3">
                                {previewFromViewer && <button onClick={downloadPDF} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Descargar PDF</button>}
                                <button onClick={() => { setShowPreview(false); if (previewFromViewer) setShowViewerModal(true) }} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50">Cerrar</button>
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
        </div>
    )
}
