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
    const [currentPage, setCurrentPage] = useState(1)
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false)
    const [isDeletingBatch, setIsDeletingBatch] = useState(false)
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

    useEffect(() => { setCurrentPage(1); setSelectedIds([]) }, [search, programFilter])

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
            // Note: Since we don't have a batch delete API route specifically for theses yet, we will delete one by one. Or you can add the route. For simplicity we will loop.
            let successCounts = 0;
            for (const id of selectedIds) {
                const res = await fetch(`/api/trabajos-grado/${id}`, { method: "DELETE" })
                if (res.ok) successCounts++;
            }
            if (successCounts > 0) {
                toast.success(`Se eliminaron ${successCounts} trabajos de grado`, { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' }, iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' } })
                setSelectedIds([])
                fetchData()
            }
        } catch (error) {
            toast.error("Error al eliminar en lote")
        } finally {
            setIsDeletingBatch(false)
            setShowBatchDeleteModal(false)
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
        // Primera hoja: Plantilla principal
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

        // Segunda hoja: Datos de referencia (Niveles, Estados, Programas)
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

        // Código de verificación calculado (igual que los certificados)
        // Se genera basado en el primer estudiante, pero el API de verificación 
        // reconocerá cualquiera de los estudiantes del trabajo.
        const firstStudent = thesis.students[0] || { fullName: "PENDIENTE", identification: "00000" }
        const verCode = generateVerificationCode({
            fullName: firstStudent.fullName,
            identification: firstStudent.identification,
            title: thesis.title,
            level: thesis.level,
            programId: String(thesis.programId)
        })

        // Fondo blanco (carta)
        doc.setFillColor(255, 255, 255)
        doc.rect(0, 0, pageW, pageH, "F")

        // Borde decorativo
        doc.setDrawColor(15, 52, 96)
        doc.setLineWidth(1)
        doc.rect(8, 8, pageW - 16, pageH - 16, "S")
        doc.setDrawColor(0, 180, 216)
        doc.setLineWidth(0.4)
        doc.rect(10, 10, pageW - 20, pageH - 20, "S")

        // Logo centrado arriba
        try {
            const img = new window.Image()
            img.src = logoUrl
            doc.addImage(img, "WEBP", pageW / 2 - 20, 16, 40, 14)
        } catch { }

        // Línea separadora debajo del logo
        doc.setDrawColor(0, 180, 216)
        doc.setLineWidth(0.5)
        doc.line(20, 34, pageW - 20, 34)

        // Título del certificado
        doc.setFont("helvetica", "bold")
        doc.setFontSize(16)
        doc.setTextColor(15, 52, 96)
        doc.text("CERTIFICADO DE TRABAJO DE GRADO", pageW / 2, 44, { align: "center" })

        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text("Sistema de Gestión Académica · GestSoft", pageW / 2, 51, { align: "center" })

        // Badge de estado
        const isFinished = thesis.status === "Terminada"
        doc.setFillColor(isFinished ? 34 : 234, isFinished ? 197 : 179, isFinished ? 94 : 8)
        doc.roundedRect(pageW / 2 - 20, 55, 40, 8, 3, 3, "F")
        doc.setFontSize(8)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(isFinished ? 20 : 100, isFinished ? 83 : 50, isFinished ? 45 : 7)
        doc.text(thesis.status.toUpperCase(), pageW / 2, 60.5, { align: "center" })

        // Título del trabajo
        doc.setFontSize(14)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(15, 52, 96)
        const titleLines = doc.splitTextToSize(thesis.title, pageW - 50)
        doc.text(titleLines, pageW / 2, 73, { align: "center" })

        let y = 73 + titleLines.length * 7 + 6

        // Separador
        doc.setDrawColor(220, 220, 220)
        doc.setLineWidth(0.3)
        doc.line(20, y, pageW - 20, y)
        y += 8

        // Info básica
        const drawInfo = (label: string, value: string) => {
            doc.setFont("helvetica", "bold")
            doc.setFontSize(9.5)
            doc.setTextColor(80, 80, 80)
            doc.text(label + ":", 22, y)
            doc.setFont("helvetica", "normal")
            doc.setTextColor(30, 30, 30)
            const lines = doc.splitTextToSize(value, pageW - 80)
            doc.text(lines, 65, y)
            y += lines.length * 6 + 2
        }

        drawInfo("Nivel", thesis.level)
        drawInfo("Programa", thesis.program?.name || "No asignado")
        if (thesis.defenseDate) drawInfo("Fecha Sustentación", new Date(thesis.defenseDate).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }))
        if (thesis.grade) drawInfo("Nota Final", String(thesis.grade))
        y += 5

        // Sección de participantes
        const drawSection = (sectionTitle: string, people: Person[], color: [number, number, number]) => {
            if (!people.length) return
            doc.setFillColor(...color)
            doc.roundedRect(20, y, pageW - 40, 8, 2, 2, "F")
            doc.setFont("helvetica", "bold")
            doc.setFontSize(9)
            doc.setTextColor(255, 255, 255)
            doc.text(sectionTitle, 25, y + 5.5)
            y += 11
            doc.setFont("helvetica", "normal")
            doc.setFontSize(9)
            doc.setTextColor(40, 40, 40)
            people.forEach((p, i) => {
                doc.text(`${i + 1}. ${p.fullName}  ·  ID: ${p.identification}`, 26, y)
                y += 6.5
            })
            y += 4
        }

        drawSection("ESTUDIANTES", thesis.students, [15, 52, 96])
        drawSection("ASESORES", thesis.advisors, [0, 120, 180])
        drawSection("JURADOS", thesis.juries, [0, 160, 210])

        // Caja de verificación
        const boxY = pageH - 44
        doc.setDrawColor(0, 180, 216)
        doc.setLineWidth(0.4)
        doc.setFillColor(240, 250, 255)
        doc.roundedRect(20, boxY, pageW - 40, 18, 3, 3, "FD")
        doc.setFont("helvetica", "bold")
        doc.setFontSize(7)
        doc.setTextColor(80, 80, 80)
        doc.text("CÓDIGO DE VERIFICACIÓN", 25, boxY + 5.5)
        doc.setFont("courier", "bold")
        doc.setFontSize(13)
        doc.setTextColor(15, 52, 96)
        doc.text(verCode, 25, boxY + 13.5)
        doc.setFont("helvetica", "normal")
        doc.setFontSize(7)
        doc.setTextColor(120, 120, 120)
        doc.text("Este código identifica de forma única este documento en el sistema.", pageW - 22, boxY + 13.5, { align: "right" })

        // Pie de página
        doc.setFont("helvetica", "italic")
        doc.setFontSize(7.5)
        doc.setTextColor(150, 150, 150)
        doc.text(`Generado el ${new Date().toLocaleDateString("es-CO")} · GestSoft`, pageW / 2, pageH - 12, { align: "center" })

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

                if (res.ok) {
                    ok++;
                } else {
                    fail++;
                    const err = await res.json().catch(() => ({}));
                    if (err && err.error) failDesc.push(err.error)
                    else failDesc.push("Error del servidor HTTP " + res.status)
                }
            } catch (err: any) {
                fail++;
                failDesc.push(err.message || "Excepción de red")
            }
        }

        setImporting(false); fetchData()
        if (fail > 0 && ok > 0) toast.error(`Importación parcial: ${ok} creados, ${fail} fallaron. Último error: ${failDesc[failDesc.length - 1] || 'Revisa el formato'}`, { duration: 5000 })
        else if (fail > 0) toast.error(`Error al importar. Fallaron los ${fail}. Primer error: ${failDesc[0] || 'Desconocido'}`, { duration: 5000 })
        else toast.success(`¡Importación exitosa! ${ok} trabajos creados.`)

        setImportData([])
        if (fileInputRef.current) fileInputRef.current.value = ""
        setShowImportModal(false)
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

                <input
                    type="text" placeholder="Buscar para añadir..." value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full mb-2 shrink-0 rounded border border-gray-200 px-3 py-2 text-xs focus:ring-1 focus:ring-brand-500 bg-white placeholder-gray-400 shadow-theme-xs"
                />

                <div className="grow overflow-y-auto border border-gray-200 rounded-md bg-white divide-y divide-gray-50 shadow-theme-xs">
                    {filteredGroup.length > 0 ? filteredGroup.map(p => (
                        <div key={p.id} onClick={() => toggleSelectionGroup(p.id, type)} className="flex items-center justify-between p-2 hover:bg-brand-50 cursor-pointer group transition-colors">
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-xs font-medium text-gray-700 truncate">{p.fullName}</span>
                                <span className="text-[10px] text-gray-400 truncate">ID: {p.identification}</span>
                            </div>
                            <svg className="w-4 h-4 text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </div>
                    )) : (
                        <div className="p-4 text-xs text-gray-400 text-center flex flex-col items-center justify-center h-full">
                            <svg className="w-6 h-6 mb-1 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                            {search ? "Sin resultados" : "Todos seleccionados o sin personas"}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    const filtered = theses.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
        const matchesProgram = programFilter ? String(t.programId) === programFilter : true;
        return matchesSearch && matchesProgram;
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
                        <button onClick={() => setShowBatchDeleteModal(true)} className="inline-flex items-center gap-2 rounded-lg border border-error-200 bg-error-50 px-4 py-2.5 text-sm font-medium text-error-600 hover:bg-error-100 shadow-theme-xs transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Eliminar ({selectedIds.length})
                        </button>
                    )}
                    <button onClick={() => { setShowImportModal(true); setImportData([]) }} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Importar
                    </button>
                    <button onClick={exportTheses} disabled={theses.length === 0} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Exportar
                    </button>
                    <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Nuevo Trabajo
                    </button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por título..." className="w-full rounded-lg border border-gray-200 bg-white pl-12 pr-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs" />
                </div>
                <div className="w-full sm:w-80">
                    <div className="relative">
                        <select
                            value={programFilter}
                            onChange={(e) => setProgramFilter(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs appearance-none pr-10"
                        >
                            <option value="">Todos los programas</option>
                            {programs.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div></div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="px-6 py-4 w-12 text-left">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer h-4 w-4"
                                            checked={currentTheses.length > 0 && currentTheses.every(t => selectedIds.includes(t.id))}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    const newIds = currentTheses.map(t => t.id).filter(id => !selectedIds.includes(id));
                                                    setSelectedIds([...selectedIds, ...newIds]);
                                                } else {
                                                    setSelectedIds(selectedIds.filter(id => !currentTheses.find(t => t.id === id)));
                                                }
                                            }}
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Título y Nivel</th>
                                    <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Programa</th>
                                    <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Estado</th>
                                    <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Participantes</th>
                                    <th className="px-6 py-4 text-right text-theme-xs font-medium text-gray-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {currentTheses.map((t) => (
                                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer h-4 w-4"
                                                checked={selectedIds.includes(t.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedIds([...selectedIds, t.id]);
                                                    } else {
                                                        setSelectedIds(selectedIds.filter(id => id !== t.id));
                                                    }
                                                }}
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-800 line-clamp-2 mb-1" title={t.title}>{t.title}</div>
                                            <div className="flex gap-2">
                                                <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wider">{t.level}</span>
                                                {t.grade !== null && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-100 uppercase tracking-wider">Nota: {t.grade}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 line-clamp-2">
                                            {t.program?.name || "Sin programa"}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${t.status === 'Terminada' ? 'bg-success-50 text-success-700 border-success-200' : 'bg-warning-50 text-warning-700 border-warning-200'}`}>
                                                {t.status}
                                            </span>
                                            {t.defenseDate && <div className="text-xs text-gray-500 mt-1">{new Date(t.defenseDate).toLocaleDateString()}</div>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-0.5 text-xs text-gray-500">
                                                <span><strong className="text-gray-700">{t.students.length}</strong> Estudiantes</span>
                                                <span><strong className="text-gray-700">{t.advisors.length}</strong> Asesores</span>
                                                <span><strong className="text-gray-700">{t.juries.length}</strong> Jurados</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="inline-flex items-center gap-1">
                                                <button onClick={() => setPreviewThesis(t)} title="Ver e imprimir certificado PDF" className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                </button>
                                                <button onClick={() => openEdit(t)} title="Editar" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand-600 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                                <button onClick={() => setConfirmAction({ id: t.id, title: t.title })} title="Eliminar" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-error-600 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {currentTheses.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">{search || programFilter ? "Sin resultados" : "No hay trabajos de grado registrados"}</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-gray-100 bg-white px-6 py-4">
                            <span className="text-sm text-gray-500">Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filtered.length)} de {filtered.length} trabajos de grado</span>
                            <div className="flex gap-2">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Anterior</button>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Siguiente</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-[99999] flex items-start pt-[5vh] justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-4xl rounded-2xl border border-gray-200 bg-white shadow-theme-lg max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-100 shrink-0">
                            <h3 className="text-lg font-semibold text-gray-800">{editingThesis ? "Editar Trabajo de Grado" : "Nuevo Trabajo de Grado"}</h3>
                        </div>

                        <div className="p-6 overflow-y-auto grow">
                            <form id="thesis-form" onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Título del Trabajo <span className="text-red-500">*</span></label>
                                        <textarea required value={title} onChange={e => setTitle(e.target.value)} rows={2} className={inputCls} placeholder="Ej. Diseño de un sistema web..." />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Nivel <span className="text-red-500">*</span></label>
                                        <select value={level} onChange={e => setLevel(e.target.value)} className={inputCls}>
                                            <option value="Pregrado">Pregrado</option>
                                            <option value="Especializacion">Especialización</option>
                                            <option value="Maestria">Maestría</option>
                                            <option value="Doctorado">Doctorado</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Programa <span className="text-red-500">*</span></label>
                                        <select required value={programId} onChange={e => setProgramId(e.target.value)} className={inputCls}>
                                            <option value="">Seleccione un programa...</option>
                                            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                                        <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls}>
                                            <option value="En desarrollo">En desarrollo</option>
                                            <option value="Terminada">Terminada</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Sustentación</label>
                                            <input type="date" value={defenseDate} onChange={e => setDefenseDate(e.target.value)} className={inputCls} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Nota</label>
                                            <input type="number" step="0.1" min="0" max="5" value={grade} onChange={e => setGrade(e.target.value)} placeholder="0.0 - 5.0" className={inputCls} />
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-gray-200 pt-6">
                                    <h4 className="font-semibold text-gray-800 mb-4">Participantes</h4>
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                        <MultiSelectPerson titleField="Estudiantes" type="student" selectedIds={studentIds} />
                                        <MultiSelectPerson titleField="Asesores" type="advisor" selectedIds={advisorIds} />
                                        <MultiSelectPerson titleField="Jurados" type="jury" selectedIds={juryIds} />
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="p-6 border-t border-gray-100 flex gap-3 shrink-0">
                            <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</button>
                            <button form="thesis-form" type="submit" className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors">Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={showBatchDeleteModal}
                title="Eliminar Múltiples Trabajos"
                message={`¿Estás seguro de que deseas eliminar los ${selectedIds.length} trabajos de grado seleccionados? Esta acción no se puede deshacer.`}
                confirmText={isDeletingBatch ? "Eliminando..." : "Eliminar Todo"}
                variant="danger"
                onConfirm={handleBatchDelete}
                onCancel={() => setShowBatchDeleteModal(false)}
            />

            <ConfirmModal
                open={!!confirmAction}
                title="Eliminar Trabajo de Grado"
                message={`¿Estás seguro de que deseas eliminar el trabajo de grado "${confirmAction?.title || ''}"? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setConfirmAction(null)}
            />

            {showImportModal && (
                <div className="fixed inset-0 z-[99999] flex items-start pt-[5vh] justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg">
                        <h3 className="text-lg font-semibold text-gray-800 mb-5">Importar Trabajos de Grado desde Excel</h3>

                        {/* Template download */}
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 mb-5">
                            <p className="text-sm text-gray-600 mb-2">Descarga la plantilla con el formato correcto para importar trabajos de grado.</p>
                            <p className="text-xs text-brand-600 mb-3 font-medium bg-brand-50 p-2 rounded border border-brand-100">
                                Para participantes, usa el formato: <br />
                                <code>Identificación; Nombre Completo; Correo</code><br />
                                (O simplemente usa la <code>Identificación</code> si ya existe la persona).<br />
                                Separa múltiples personas con <code>|</code>
                            </p>
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

                        {importData.length > 0 && <div className="mb-5 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">Se encontraron <strong>{importData.length}</strong> trabajos para importar.</div>}

                        <div className="flex gap-3 pt-1">
                            <button type="button" onClick={() => { setShowImportModal(false); setImportData([]) }} className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">Cerrar</button>
                            <button type="button" onClick={processImport} disabled={!importData.length || importing} className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 shadow-theme-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                {importing ? "Importando..." : "Iniciar Importación"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== MODAL VISTA PREVIA CERTIFICADO (CARTA) ===== */}
            {previewThesis && (
                <div className="fixed inset-0 z-[99999] flex items-start pt-[3vh] justify-center bg-gray-900/60 p-4 overflow-auto">
                    <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-theme-lg flex flex-col max-h-[95vh]">
                        {/* Header del modal */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                            <h3 className="text-base font-semibold text-gray-800">Vista Previa del Certificado</h3>
                            <div className="flex gap-2 items-center">
                                <button onClick={() => generatePDF(previewThesis)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors shadow-theme-xs">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    Descargar PDF
                                </button>
                                <button onClick={() => setPreviewThesis(null)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        </div>

                        {/* Carta */}
                        <div className="overflow-y-auto grow p-6 bg-gray-100">
                            <div className="bg-white mx-auto shadow-lg rounded border border-gray-300 p-10 max-w-[560px] font-serif" style={{ minHeight: '700px' }}>
                                {/* Borde ornamental */}
                                <div className="border-2 border-[#0f3460] p-6 rounded relative" style={{ outline: '3px solid #00b4d8', outlineOffset: '-12px' }}>

                                    {/* Logo centrado */}
                                    <div className="flex justify-center mb-4">
                                        <img src={logoUrl} alt="Logo" className="h-14 object-contain" />
                                    </div>

                                    {/* Línea separadora */}
                                    <div className="h-0.5 bg-gradient-to-r from-transparent via-[#00b4d8] to-transparent mb-4" />

                                    {/* Título */}
                                    <h1 className="text-center text-xl font-bold text-[#0f3460] tracking-wide uppercase mb-1">
                                        Certificado de Trabajo de Grado
                                    </h1>
                                    <p className="text-center text-xs text-gray-400 mb-4">Sistema de Gestión Académica · GestSoft</p>

                                    {/* Badge estado */}
                                    <div className="flex justify-center mb-5">
                                        <span className={`px-4 py-1 rounded-full text-xs font-bold ${previewThesis.status === 'Terminada' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {previewThesis.status.toUpperCase()}
                                        </span>
                                    </div>

                                    {/* Título del trabajo */}
                                    <p className="text-center text-base font-semibold text-[#0f3460] mb-6 leading-snug">{previewThesis.title}</p>

                                    {/* Info */}
                                    <div className="border-t border-gray-200 pt-4 mb-4 space-y-2">
                                        {[
                                            ["Nivel", previewThesis.level],
                                            ["Programa", previewThesis.program?.name || "No asignado"],
                                            ...(previewThesis.defenseDate ? [["Fecha de Sustentación", new Date(previewThesis.defenseDate).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })]] : []),
                                            ...(previewThesis.grade ? [["Nota Final", String(previewThesis.grade)]] : [])
                                        ].map(([label, val]) => (
                                            <div key={label} className="flex gap-2 text-sm">
                                                <span className="font-bold text-gray-500 w-36 shrink-0">{label}:</span>
                                                <span className="text-gray-800">{val}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Participantes */}
                                    {[
                                        { label: "Estudiantes", people: previewThesis.students, color: "bg-[#0f3460] text-white" },
                                        { label: "Asesores", people: previewThesis.advisors, color: "bg-[#007494] text-white" },
                                        { label: "Jurados", people: previewThesis.juries, color: "bg-[#00a0d2] text-white" }
                                    ].filter(g => g.people.length > 0).map(g => (
                                        <div key={g.label} className="mb-3">
                                            <div className={`px-3 py-1 rounded text-xs font-bold mb-1 ${g.color}`}>{g.label.toUpperCase()}</div>
                                            {g.people.map((p, i) => (
                                                <div key={p.id} className="text-sm text-gray-700 pl-3 py-0.5 border-l-2 border-gray-200">
                                                    {i + 1}. {p.fullName} <span className="text-gray-400">· ID: {p.identification}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ))}

                                    {/* Código de verificación */}
                                    <div className="mt-6 border border-[#00b4d8] bg-[#f0faff] rounded p-3">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Código de Verificación</p>
                                        <p className="font-mono text-base font-bold text-[#0f3460] tracking-widest">
                                            {generateVerificationCode({
                                                fullName: previewThesis.students[0]?.fullName || "PENDIENTE",
                                                identification: previewThesis.students[0]?.identification || "00000",
                                                title: previewThesis.title,
                                                level: previewThesis.level,
                                                programId: String(previewThesis.programId)
                                            })}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-1">Verifica en <strong>gestsoft.app/verificacion</strong></p>
                                    </div>

                                    {/* Pie */}
                                    <p className="text-center text-[10px] text-gray-400 mt-6 italic">
                                        Generado el {new Date().toLocaleDateString("es-CO")} · GestSoft
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
