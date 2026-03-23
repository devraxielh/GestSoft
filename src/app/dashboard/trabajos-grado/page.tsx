"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import toast from "react-hot-toast"
import ConfirmModal from "@/components/ConfirmModal"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import { generateVerificationCode } from "@/lib/hash"

interface Person { id: number; fullName: string; identification: string }
interface Program { id: number; name: string }
interface Thesis {
    id: number;
    title: string;
    level: string;
    defenseDate: string | null;
    grade: number | null;
    status: string;
    programId: number;
    program?: Program;
    students: Person[];
    advisors: Person[];
    juries: Person[];
}

export default function ThesisPage() {
    const [theses, setTheses] = useState<Thesis[]>([])
    const [programs, setPrograms] = useState<Program[]>([])
    const [persons, setPersons] = useState<Person[]>([])
    const [logoUrl, setLogoUrl] = useState("/logo.webp")

    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingThesis, setEditingThesis] = useState<Thesis | null>(null)
    const [confirmAction, setConfirmAction] = useState<{ id: number, title?: string } | null>(null)
    const [previewThesis, setPreviewThesis] = useState<Thesis | null>(null)

    // Search, Filter, Pagination, Selection
    const [search, setSearch] = useState("")
    const [programFilter, setProgramFilter] = useState("")
    const [statusFilter, setStatusFilter] = useState("")
    const [levelFilter, setLevelFilter] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false)
    const [isDeletingBatch, setIsDeletingBatch] = useState(false)
    const [sendingEmails, setSendingEmails] = useState(false)
    const [showImportModal, setShowImportModal] = useState(false)
    const [importing, setImporting] = useState(false)
    const [importData, setImportData] = useState<any[]>([])
    const itemsPerPage = 20
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Form state
    const [title, setTitle] = useState("")
    const [level, setLevel] = useState("Pregrado")
    const [defenseDate, setDefenseDate] = useState("")
    const [grade, setGrade] = useState("")
    const [status, setStatus] = useState("En desarrollo")
    const [programId, setProgramId] = useState("")
    const [studentIds, setStudentIds] = useState<number[]>([])
    const [advisorIds, setAdvisorIds] = useState<number[]>([])
    const [juryIds, setJuryIds] = useState<number[]>([])

    useEffect(() => { setCurrentPage(1); setSelectedIds([]) }, [search, programFilter, statusFilter, levelFilter])

    useEffect(() => {
        fetch("/api/configuracion").then(r => r.json()).then(d => { if (d?.logoUrl) setLogoUrl(d.logoUrl) }).catch(() => { })
    }, [])

    const fetchData = useCallback(async () => {
        try {
            const [resTheses, resPrograms, resPersons] = await Promise.all([
                fetch("/api/trabajos-grado"),
                fetch("/api/programas"),
                fetch("/api/personas")
            ])
            if (resTheses.ok) setTheses(await resTheses.json().catch(() => []))
            if (resPrograms.ok) setPrograms(await resPrograms.json().catch(() => []))
            if (resPersons.ok) setPersons(await resPersons.json().catch(() => []))
        } catch (error) {
            toast.error("Error al cargar los datos")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    const openCreate = () => {
        setEditingThesis(null)
        setTitle("")
        setLevel("Pregrado")
        setDefenseDate("")
        setGrade("")
        setStatus("En desarrollo")
        setProgramId("")
        setStudentIds([])
        setAdvisorIds([])
        setJuryIds([])
        setShowModal(true)
    }

    const openEdit = (t: Thesis) => {
        setEditingThesis(t)
        setTitle(t.title)
        setLevel(t.level)
        setDefenseDate(t.defenseDate ? new Date(t.defenseDate).toISOString().split('T')[0] : "")
        setGrade(t.grade !== null ? t.grade.toString() : "")
        setStatus(t.status)
        setProgramId(t.programId.toString())
        setStudentIds(t.students.map(s => s.id))
        setAdvisorIds(t.advisors.map(a => a.id))
        setJuryIds(t.juries.map(j => j.id))
        setShowModal(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title || !level || !programId) {
            toast.error("Por favor completa los campos requeridos")
            return
        }

        const payload = {
            title, level,
            defenseDate: defenseDate || null,
            grade: grade ? parseFloat(grade) : null,
            status, programId: Number(programId),
            studentIds, advisorIds, juryIds
        }

        const url = editingThesis ? `/api/trabajos-grado/${editingThesis.id}` : "/api/trabajos-grado"
        const res = await fetch(url, {
            method: editingThesis ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })

        if (res.ok) {
            toast.success(editingThesis ? "Trabajo actualizado" : "Trabajo creado", { style: { background: '#F0FDF4', color: '#166534', border: '1px solid #4ADE80' }, iconTheme: { primary: '#22C55E', secondary: '#F0FDF4' } })
            setShowModal(false)
            fetchData()
        } else {
            const data = await res.json().catch(() => ({}))
            toast.error(data.error || "Error al guardar el trabajo de grado", { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' } })
        }
    }

    const handleDelete = async () => {
        if (!confirmAction) return
        const res = await fetch(`/api/trabajos-grado/${confirmAction.id}`, { method: "DELETE" })
        if (res.ok) {
            toast.success("Trabajo eliminado", { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' }, iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' } })
            fetchData()
        } else {
            toast.error("Error al eliminar", { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' } })
        }
        setConfirmAction(null)
    }

    const handleBatchDelete = async () => {
        setIsDeletingBatch(true)
        try {
            const res = await fetch("/api/trabajos-grado/bulk", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: selectedIds }) })
            if (res.ok) { fetchData(); setSelectedIds([]); setShowBatchDeleteModal(false); toast.success("Trabajos eliminados") }
            else { const d = await res.json(); toast.error(d.error || "Error al eliminar") }
        } catch { toast.error("Error de red") }
    }

    const handleBatchEmail = async () => {
        setSendingEmails(true)
        try {
            const res = await fetch("/api/trabajos-grado/send-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ thesisIds: selectedIds })
            })
            const data = await res.json()
            if (res.ok) {
                toast.success(`Correos enviados: ${data.sent}. Fallidos: ${data.failed}`)
                setSelectedIds([])
            } else {
                toast.error(data.error || "Error al enviar correos")
            }
        } catch {
            toast.error("Error de red")
        } finally {
            setSendingEmails(false)
        }
    }

    const handleFileUpload = (file: File) => {
        setImportData([])
        const reader = new FileReader(); reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result; const wb = XLSX.read(bstr, { type: "binary" })
                const wsname = wb.SheetNames[0]; const ws = wb.Sheets[wsname]
                const data = XLSX.utils.sheet_to_json(ws); setImportData(data)
            } catch { toast.error("No se pudo leer el archivo Excel.") }
        }
        reader.readAsBinaryString(file)
    }

    const downloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([{
            Titulo: "Sistema web...",
            Nivel: "Pregrado",
            Estado: "En desarrollo",
            Fecha_Sustentacion: "2024-12-01",
            Nota: "4.5",
            id_programa: 1,
            Estudiantes: "11223344; Juan Pérez; juan@correo.com | 55667788; Ana López; ana@correo.com",
            Asesores: "99887766; Carlos Ruiz; carlos@correo.com",
            Jurados: ""
        }])
        ws["!cols"] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 40 }, { wch: 40 }, { wch: 40 }]
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Trabajos")

        const maxRows = Math.max(4, 2, programs.length)
        const refData = []
        for (let i = 0; i < maxRows; i++) {
            const niveles = ["Pregrado", "Especializacion", "Maestria", "Doctorado"]
            const estados = ["En desarrollo", "Terminada"]
            refData.push({
                Niveles_Permitidos: niveles[i] || "",
                Estados_Permitidos: estados[i] || "",
                ID_Programa: programs[i] ? programs[i].id : "",
                Nombre_Programa: programs[i] ? programs[i].name : ""
            })
        }
        const wsRef = XLSX.utils.json_to_sheet(refData)
        wsRef["!cols"] = [{ wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 40 }]
        XLSX.utils.book_append_sheet(wb, wsRef, "Datos_Referencia")
        XLSX.writeFile(wb, "plantilla_importacion_trabajos.xlsx")
    }

    const generatePDF = (thesis: Thesis) => {
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
        const pageW = doc.internal.pageSize.getWidth()
        const pageH = doc.internal.pageSize.getHeight()
        const margin = 25

        const firstStudent = thesis.students[0] || { fullName: "PENDIENTE", identification: "00000" }
        const verCode = generateVerificationCode({
            fullName: firstStudent.fullName,
            identification: firstStudent.identification,
            title: thesis.title,
            level: thesis.level,
            programId: String(thesis.programId)
        })

        // Fondo blanco
        doc.setFillColor(255, 255, 255)
        doc.rect(0, 0, pageW, pageH, "F")

        // 1. Logo
        try {
            const img = new window.Image()
            img.src = logoUrl
            doc.addImage(img, "WEBP", margin, 15, 40, 14)
        } catch { }

        // 2. Ciudad y Fecha
        doc.setFont("helvetica", "normal")
        doc.setFontSize(10)
        doc.setTextColor(0, 0, 0)
        const dateStr = `${new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}`
        doc.text(dateStr, pageW - margin, 25, { align: "right" })

        let y = 50

        // 3. Asunto
        doc.setFont("helvetica", "bold")
        doc.text("ASUNTO: CERTIFICADO DE TRABAJO DE GRADO", margin, y)
        y += 15

        // 4. Saludo
        doc.setFont("helvetica", "normal")
        doc.text("A QUIEN INTERESE:", margin, y)
        y += 12

        // 5. Cuerpo del texto
        const programName = thesis.program?.name || "[PROGRAMA NO ASIGNADO]"
        const introText = thesis.status === "Terminada"
            ? `hace constar que los estudiantes mencionados a continuación, sustentaron satisfactoriamente su trabajo de grado titulado:`
            : `hace constar que los estudiantes mencionados a continuación, se encuentran adelantando su trabajo de grado titulado:`;

        const bodyText = `La Dirección del Programa de ${programName} de GestSoft, ${introText}`

        const splitBody = doc.splitTextToSize(bodyText, pageW - (margin * 2))
        doc.text(splitBody, margin, y)
        y += splitBody.length * 6 + 4

        // 6. Título
        doc.setFont("helvetica", "bolditalic")
        const splitTitle = doc.splitTextToSize(`"${thesis.title.toUpperCase()}"`, pageW - (margin * 2 + 10))
        doc.text(splitTitle, margin + 5, y)
        y += splitTitle.length * 6 + 8

        // 7. Estado/Nota
        doc.setFont("helvetica", "normal")
        const statusText = thesis.status === "Terminada"
            ? `Cumpliendo satisfactoriamente los requisitos.`
            : `El trabajo se encuentra en desarrollo.`

        const splitStatus = doc.splitTextToSize(statusText, pageW - (margin * 2))
        doc.text(splitStatus, margin, y)
        y += splitStatus.length * 6 + 10

        // 8. Participantes
        const drawPeople = (label: string, people: Person[]) => {
            if (people.length === 0) return
            doc.setFont("helvetica", "bold")
            doc.text(`${label}:`, margin, y)
            y += 6
            doc.setFont("helvetica", "normal")
            people.forEach(p => {
                doc.text(`• ${p.fullName} - Documento de Identidad: ${p.identification}`, margin + 5, y)
                y += 5
            })
            y += 4
        }

        drawPeople("ESTUDIANTES", thesis.students)
        drawPeople("ASESORES", thesis.advisors)
        drawPeople("JURADOS", thesis.juries)

        if (thesis.defenseDate || thesis.grade) {
            y += 2
            doc.setFont("helvetica", "bold")
            doc.text("INFORMACIÓN ADICIONAL:", margin, y)
            y += 6
            doc.setFont("helvetica", "normal")
            if (thesis.defenseDate) {
                const d = new Date(thesis.defenseDate).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })
                doc.text(`Fecha de Sustentación: ${d}`, margin + 5, y)
                y += 5
            }
            if (thesis.grade) {
                doc.text(`Calificación Obtenida: ${thesis.grade}`, margin + 5, y)
                y += 5
            }
        }

        y += 20
        doc.text("Para constancia de lo anterior, se firma la presente certificación.", margin, y)

        // 9. Firma
        y += 35
        doc.setDrawColor(0, 0, 0)
        doc.setLineWidth(0.5)
        doc.line(margin, y, margin + 60, y)
        y += 5
        doc.setFont("helvetica", "bold")
        doc.text("DIRECTOR DE PROGRAMA", margin, y)
        doc.setFont("helvetica", "normal")
        doc.text(programName, margin, y + 5)

        // 10. Verificación
        const footerY = pageH - 25
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.setDrawColor(220, 220, 220)
        doc.rect(margin, footerY - 5, pageW - (margin * 2), 12)
        doc.text(`CÓDIGO DE VERIFICACIÓN: ${verCode}`, margin + 3, footerY + 2)
        doc.text(`Verifique en: gestsoft.app/verificacion`, pageW - margin - 3, footerY + 2, { align: "right" })

        doc.save(`certificado_trabajo_grado_${thesis.id}.pdf`)
    }

    const processImport = async () => {
        if (!importData.length) return; setImporting(true); let ok = 0; let fail = 0; let failDesc = []
        for (const row of importData) {
            try {
                const parseParticipants = (field: any) => {
                    if (!field) return [];
                    const strField = String(field);
                    return strField.split('|').map(p => {
                        const parts = p.split(';');
                        if (parts.length >= 1 && parts[0].trim()) {
                            return {
                                identification: parts[0].trim(),
                                fullName: parts[1] ? parts[1].trim() : "",
                                email: parts[2] ? parts[2].trim() : ""
                            }
                        }
                        return null;
                    }).filter(Boolean);
                };

                const studentsToImport = parseParticipants(row.Estudiantes);
                const advisorsToImport = parseParticipants(row.Asesores);
                const juriesToImport = parseParticipants(row.Jurados);

                const res = await fetch("/api/trabajos-grado/import", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: row.Titulo || row.titulo || "Sin título",
                        level: row.Nivel || row.nivel || "Pregrado",
                        defenseDate: row.Fecha_Sustentacion || row.fecha || null,
                        grade: row.Nota ? parseFloat(row.Nota) : null,
                        status: row.Estado || row.estado || "En desarrollo",
                        programId: row.id_programa || row.ID_Programa || "",
                        students: studentsToImport,
                        advisors: advisorsToImport,
                        juries: juriesToImport
                    })
                })

                if (res.ok) { ok++; } else {
                    fail++;
                    const err = await res.json().catch(() => ({}));
                    if (err && err.error) failDesc.push(err.error)
                    else failDesc.push("Error del servidor HTTP " + res.status)
                }
            } catch (err: any) { fail++; failDesc.push(err.message || "Excepción de red") }
        }
        setImporting(false); fetchData()
        if (fail > 0 && ok > 0) toast.error(`Importación parcial: ${ok} creados, ${fail} fallaron.`, { duration: 5000 })
        else if (fail > 0) toast.error(`Error al importar. Fallaron los ${fail}.`, { duration: 5000 })
        else toast.success(`¡Importación exitosa! ${ok} trabajos creados.`)
        setImportData([]); if (fileInputRef.current) fileInputRef.current.value = ""; setShowImportModal(false)
    }

    const exportTheses = () => {
        const data = filtered.map(t => ({
            ID: t.id,
            Titulo: t.title,
            Nivel: t.level,
            Estado: t.status,
            Nota: t.grade || "-",
            Fecha_Sustentacion: t.defenseDate ? new Date(t.defenseDate).toLocaleDateString() : "-",
            Programa: t.program?.name || "",
            Estudiantes: t.students.map(s => s.fullName).join(", "),
            Asesores: t.advisors.map(a => a.fullName).join(", "),
            Jurados: t.juries.map(j => j.fullName).join(", ")
        }))
        const ws = XLSX.utils.json_to_sheet(data)
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "TrabajosDeGrado")
        XLSX.writeFile(wb, `trabajos_grado_${new Date().toISOString().split("T")[0]}.xlsx`)
    }

    const toggleSelectionGroup = (id: number, type: 'student' | 'advisor' | 'jury') => {
        if (type === 'student') setStudentIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
        else if (type === 'advisor') setAdvisorIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
        else setJuryIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
    }

    const MultiSelectPerson = ({ titleField, type, selectedIds }: { titleField: string, type: 'student' | 'advisor' | 'jury', selectedIds: number[] }) => {
        const [search, setSearch] = useState("")
        const unselectedPersons = persons.filter(p => !selectedIds.includes(p.id))
        const selectedPersons = persons.filter(p => selectedIds.includes(p.id))
        const filteredGroup = unselectedPersons.filter(p => p.fullName.toLowerCase().includes(search.toLowerCase()) || p.identification.includes(search)).slice(0, 50)

        return (
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/50 flex flex-col h-[320px]">
                <div className="flex justify-between items-center mb-2 shrink-0">
                    <label className="block text-sm font-medium text-gray-700">{titleField}</label>
                    <span className="text-xs font-semibold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">{selectedIds.length}</span>
                </div>
                {selectedPersons.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3 max-h-24 overflow-y-auto p-1.5 border border-gray-200 bg-white rounded-md shrink-0 shadow-theme-xs">
                        {selectedPersons.map(p => (
                            <span key={p.id} className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-brand-50 text-brand-700 text-[11px] font-medium border border-brand-200">
                                <span className="truncate max-w-[120px]" title={p.fullName}>{p.fullName}</span>
                                <button type="button" onClick={() => toggleSelectionGroup(p.id, type)} className="text-brand-400 hover:text-brand-700 hover:bg-brand-200 rounded-full p-0.5 transition-colors focus:outline-none shrink-0" title="Quitar">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </span>
                        ))}
                    </div>
                )}
                <input type="text" placeholder="Buscar para añadir..." value={search} onChange={e => setSearch(e.target.value)} className="w-full mb-2 shrink-0 rounded border border-gray-200 px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500 bg-white placeholder-gray-400 shadow-theme-xs" />
                <div className="grow overflow-y-auto border border-gray-200 rounded-md bg-white divide-y divide-gray-50 shadow-theme-xs">
                    {filteredGroup.length > 0 ? filteredGroup.map(p => (
                        <div key={p.id} onClick={() => toggleSelectionGroup(p.id, type)} className="flex items-center justify-between p-2 hover:bg-brand-50 cursor-pointer group transition-colors">
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-xs font-medium text-gray-700 truncate">{p.fullName}</span>
                                <span className="text-[10px] text-gray-400 truncate">ID: {p.identification}</span>
                            </div>
                            <svg className="w-4 h-4 text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </div>
                    )) : (<div className="p-4 text-xs text-gray-400 text-center flex flex-col items-center justify-center h-full">Sin resultados</div>)}
                </div>
            </div>
        )
    }

    const filtered = theses.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
        const matchesProgram = programFilter ? String(t.programId) === programFilter : true;
        const matchesStatus = statusFilter ? t.status === statusFilter : true;
        const matchesLevel = levelFilter ? t.level === levelFilter : true;
        return matchesSearch && matchesProgram && matchesStatus && matchesLevel;
    })
    const totalPages = Math.ceil(filtered.length / itemsPerPage)
    const currentTheses = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    const inputCls = "w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs"

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-800">Trabajos de Grado</h2>
                    <p className="text-gray-500 text-sm mt-1">Gestión de tesis y proyectos académicos</p>
                </div>
                <div className="flex items-center gap-3">
                    {selectedIds.length > 0 && (
                        <>
                            <button onClick={handleBatchEmail} disabled={sendingEmails} className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-100 shadow-theme-xs transition-colors disabled:opacity-50">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                {sendingEmails ? "Enviando..." : `Enviar Correos (${selectedIds.length})`}
                            </button>
                            <button onClick={() => setShowBatchDeleteModal(true)} className="inline-flex items-center gap-2 rounded-lg border border-error-200 bg-error-50 px-4 py-2.5 text-sm font-medium text-error-600 hover:bg-error-100 shadow-theme-xs transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Eliminar
                            </button>
                        </>
                    )}
                    <button onClick={() => { setShowImportModal(true); setImportData([]) }} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Importar
                    </button>
                    <button onClick={exportTheses} disabled={theses.length === 0} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Exportar
                    </button>
                    <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Nuevo Trabajo
                    </button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por título..." className="w-full rounded-lg border border-gray-200 bg-white pl-12 pr-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs" />
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)} className="w-full sm:w-60 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none shadow-theme-xs appearance-none">
                        <option value="">Todos los programas</option>
                        {programs.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                    </select>

                    <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="w-full sm:w-40 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none shadow-theme-xs appearance-none">
                        <option value="">Todos los niveles</option>
                        <option value="Pregrado">Pregrado</option>
                        <option value="Especializacion">Especialización</option>
                        <option value="Maestria">Maestría</option>
                        <option value="Doctorado">Doctorado</option>
                    </select>

                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-40 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none shadow-theme-xs appearance-none">
                        <option value="">Todos los estados</option>
                        <option value="En desarrollo">En desarrollo</option>
                        <option value="Terminada">Terminada</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div></div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 w-12"><input type="checkbox" checked={currentTheses.length > 0 && currentTheses.every(t => selectedIds.includes(t.id))} onChange={(e) => { if (e.target.checked) { const selectedSet = new Set(selectedIds); const newIds = currentTheses.map(t => t.id).filter(id => !selectedSet.has(id)); setSelectedIds([...selectedIds, ...newIds]); } else { const currentIds = new Set(currentTheses.map(t => t.id)); setSelectedIds(selectedIds.filter(id => !currentIds.has(id))); } }} /></th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Título y Nivel</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Programa</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Participantes</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {currentTheses.map((t) => (
                                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4"><input type="checkbox" checked={selectedIds.includes(t.id)} onChange={(e) => { if (e.target.checked) setSelectedIds([...selectedIds, t.id]); else setSelectedIds(selectedIds.filter(id => id !== t.id)); }} /></td>
                                        <td className="px-6 py-4"><div className="text-sm font-medium text-gray-800 line-clamp-2">{t.title}</div><div className="text-[10px] text-brand-600 font-bold uppercase mt-1">{t.level}</div></td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{t.program?.name || "Sin programa"}</td>
                                        <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${t.status === 'Terminada' ? 'bg-success-50 text-success-700 border-success-200' : 'bg-warning-50 text-warning-700 border-warning-200'}`}>{t.status.toUpperCase()}</span></td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="text-[11px]">
                                                    <span className="font-bold text-brand-600">Est:</span>
                                                    <span className="text-gray-700 ml-1">
                                                        {t.students.map(s => s.fullName).join(", ") || "Ninguno"}
                                                    </span>
                                                </div>
                                                <div className="text-[11px]">
                                                    <span className="font-bold text-blue-600">Ases:</span>
                                                    <span className="text-gray-600 ml-1 italic">
                                                        {t.advisors.map(a => a.fullName).join(", ") || "Ninguno"}
                                                    </span>
                                                </div>
                                                {t.juries.length > 0 && (
                                                    <div className="text-[11px]">
                                                        <span className="font-bold text-amber-600">Jur:</span>
                                                        <span className="text-gray-500 ml-1">
                                                            {t.juries.map(j => j.fullName).join(", ")}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right inline-flex gap-1">
                                            <button onClick={() => setPreviewThesis(t)} className="p-1.5 text-gray-400 hover:text-brand-600"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                                            <button onClick={() => openEdit(t)} className="p-1.5 text-gray-400 hover:text-brand-600"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                            <button onClick={() => setConfirmAction({ id: t.id, title: t.title })} className="p-1.5 text-gray-400 hover:text-error-600"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-[99999] flex items-start pt-[5vh] justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-4xl rounded-2xl bg-white shadow-theme-lg max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b shrink-0"><h3 className="text-lg font-semibold">{editingThesis ? "Editar Trabajo" : "Nuevo Trabajo"}</h3></div>
                        <div className="p-6 overflow-y-auto grow">
                            <form id="thesis-form" onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="md:col-span-2"><label className="block text-sm font-medium mb-2">Título *</label><textarea required value={title} onChange={e => setTitle(e.target.value)} rows={2} className={inputCls} /></div>
                                    <div><label className="block text-sm font-medium mb-2">Nivel *</label><select value={level} onChange={e => setLevel(e.target.value)} className={inputCls}><option value="Pregrado">Pregrado</option><option value="Especializacion">Especialización</option><option value="Maestria">Maestría</option><option value="Doctorado">Doctorado</option></select></div>
                                    <div><label className="block text-sm font-medium mb-2">Programa *</label><select required value={programId} onChange={e => setProgramId(e.target.value)} className={inputCls}><option value="">Seleccione...</option>{programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                                    <div><label className="block text-sm font-medium mb-2">Estado</label><select value={status} onChange={e => setStatus(e.target.value)} className={inputCls}><option value="En desarrollo">En desarrollo</option><option value="Terminada">Terminada</option></select></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-sm font-medium mb-2">Sustentación</label><input type="date" value={defenseDate} onChange={e => setDefenseDate(e.target.value)} className={inputCls} /></div>
                                        <div><label className="block text-sm font-medium mb-2">Nota</label><input type="number" step="0.1" value={grade} onChange={e => setGrade(e.target.value)} className={inputCls} /></div>
                                    </div>
                                </div>
                                <div className="border-t pt-6"><h4 className="font-semibold mb-4">Participantes</h4><div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><MultiSelectPerson titleField="Estudiantes" type="student" selectedIds={studentIds} /><MultiSelectPerson titleField="Asesores" type="advisor" selectedIds={advisorIds} /><MultiSelectPerson titleField="Jurados" type="jury" selectedIds={juryIds} /></div></div>
                            </form>
                        </div>
                        <div className="p-6 border-t flex gap-3"><button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-lg border py-2.5">Cancelar</button><button form="thesis-form" type="submit" className="flex-1 rounded-lg bg-brand-500 text-white py-2.5">Guardar</button></div>
                    </div>
                </div>
            )}

            <ConfirmModal open={showBatchDeleteModal} title="Eliminar Múltiples" message={`¿Deseas eliminar ${selectedIds.length} trabajos?`} confirmText="Eliminar" variant="danger" onConfirm={handleBatchDelete} onCancel={() => setShowBatchDeleteModal(false)} />
            <ConfirmModal open={!!confirmAction} title="Eliminar Trabajo" message={`¿Deseas eliminar "${confirmAction?.title}"?`} confirmText="Eliminar" variant="danger" onConfirm={handleDelete} onCancel={() => setConfirmAction(null)} />

            {showImportModal && (
                <div className="fixed inset-0 z-[99999] flex items-start pt-[5vh] justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-theme-lg">
                        <h3 className="text-lg font-semibold mb-5">Importar desde Excel</h3>
                        <div className="rounded-xl bg-gray-50 p-4 mb-5 text-sm">Descarga la plantilla y sube tu archivo excel con los datos de los trabajos de grado.<button onClick={downloadTemplate} className="block mt-2 text-brand-600 font-bold underline">Descargar Plantilla</button></div>
                        <div className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer mb-5" onClick={() => fileInputRef.current?.click()}>Subir archivo .xlsx<input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }} /></div>
                        {importData.length > 0 && <div className="mb-5 text-sm bg-gray-50 p-3 rounded">Se encontraron {importData.length} trabajos.</div>}
                        <div className="flex gap-3"><button onClick={() => setShowImportModal(false)} className="flex-1 border rounded-lg py-2.5">Cerrar</button><button onClick={processImport} disabled={!importData.length || importing} className="flex-1 bg-brand-500 text-white rounded-lg py-2.5">{importing ? "Importando..." : "Iniciar"}</button></div>
                    </div>
                </div>
            )}

            {/* ===== MODAL VISTA PREVIA CERTIFICADO (CARTA FORMAL) ===== */}
            {previewThesis && (
                <div className="fixed inset-0 z-[99999] flex items-start pt-[3vh] justify-center bg-gray-900/60 p-4 overflow-auto">
                    <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-theme-lg flex flex-col max-h-[95vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
                            <h3 className="text-base font-semibold">Vista Previa</h3>
                            <div className="flex gap-2"><button onClick={() => generatePDF(previewThesis)} className="bg-brand-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium">PDF</button><button onClick={() => setPreviewThesis(null)} className="p-1.5 text-gray-400">×</button></div>
                        </div>
                        <div className="overflow-y-auto grow p-6 bg-gray-100">
                            <div className="bg-white mx-auto shadow-sm p-12 max-w-[580px] font-serif text-gray-900 leading-relaxed" style={{ minHeight: '750px' }}>
                                <div className="flex justify-between items-start mb-12">
                                    <img src={logoUrl} alt="Logo" className="h-12 object-contain" />
                                    <div className="text-right text-sm"><p>{new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}</p></div>
                                </div>
                                <div className="mb-10"><p className="font-bold uppercase text-xs">Asunto: Certificado de Trabajo de Grado</p></div>
                                <div className="mb-6"><p>A QUIEN INTERESE:</p></div>
                                <div className="mb-6 space-y-4 text-sm sm:text-base">
                                    <p>La Dirección del Programa de <strong>{previewThesis.program?.name}</strong> hace constar que los estudiantes mencionados {previewThesis.status === 'Terminada' ? 'sustentaron satisfactoriamente' : 'se encuentran adelantando'} su trabajo titulado:</p>
                                    <p className="text-center font-bold italic px-4 py-3 bg-gray-50 border-y uppercase text-xs sm:text-sm">"{previewThesis.title}"</p>
                                    <p>{previewThesis.status === 'Terminada' ? `Cumpliendo satisfactoriamente los requisitos.` : `El trabajo se encuentra en desarrollo.`}</p>
                                </div>
                                <div className="space-y-4 mb-10">
                                    {[{ label: "Estudiantes", people: previewThesis.students }, { label: "Asesores", people: previewThesis.advisors }, { label: "Jurados", people: previewThesis.juries }].filter(g => g.people.length > 0).map(g => (
                                        <div key={g.label}><p className="font-bold text-[10px] uppercase border-b pb-1 mb-1">{g.label}:</p><ul className="text-xs list-disc pl-5">{g.people.map(p => (<li key={p.id}>{p.fullName} - ID: {p.identification}</li>))}</ul></div>
                                    ))}
                                </div>
                                {(previewThesis.defenseDate || previewThesis.grade) && (
                                    <div className="mb-10 text-[11px]"><p className="font-bold border-b pb-1 mb-1 uppercase">Información:</p><ul className="list-disc pl-5">{previewThesis.defenseDate && <li>Sustentación: {new Date(previewThesis.defenseDate).toLocaleDateString()}</li>}{previewThesis.grade && <li>Nota: {previewThesis.grade}</li>}</ul></div>
                                )}
                                <p className="text-sm mb-16">Se firma la presente certificación para los fines pertinentes.</p>
                                <div className="pt-8 border-t border-gray-900 w-64"><p className="font-bold text-sm">DIRECTOR DE PROGRAMA</p><p className="text-xs">{previewThesis.program?.name}</p></div>
                                <div className="mt-12 text-[10px] text-gray-500 border p-3 flex justify-between bg-gray-50">
                                    <span>VERIFICACIÓN: <strong>{generateVerificationCode({ fullName: previewThesis.students[0]?.fullName || "X", identification: previewThesis.students[0]?.identification || "0", title: previewThesis.title, level: previewThesis.level, programId: String(previewThesis.programId) })}</strong></span>
                                    <span>Verifique en: <strong>gestsoft.app/verificacion</strong></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
