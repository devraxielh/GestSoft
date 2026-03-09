"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import ConfirmModal from "@/components/ConfirmModal"
import * as XLSX from "xlsx"
import toast from "react-hot-toast"
import SearchableSelect from "@/components/SearchableSelect"
import PersonFormModal from "@/components/PersonFormModal"

interface Person { id: number; fullName: string; identification: string }
interface Docente {
    id: number;
    personId: number;
    programId: number;
    contractType: string | null;
    dedication: string | null;
    teacherType: string | null;
    person?: Person;
}

interface DocentesModalProps {
    isOpen: boolean;
    onClose: () => void;
    programId: number;
    programName: string;
    onChange?: () => void;
}

export default function DocentesModal({ isOpen, onClose, programId, programName, onChange }: DocentesModalProps) {
    const [docentes, setDocentes] = useState<Docente[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingDocente, setEditingDocente] = useState<Docente | null>(null)
    const [form, setForm] = useState({ personId: "", contractType: "", dedication: "", teacherType: "Puro" })
    const [personas, setPersonas] = useState<Person[]>([])
    const [showPersonModal, setShowPersonModal] = useState(false)
    const [search, setSearch] = useState("")
    const [error, setError] = useState("")
    const [confirmAction, setConfirmAction] = useState<{ docente: Docente } | null>(null)
    const [showImportModal, setShowImportModal] = useState(false)
    const [importing, setImporting] = useState(false)
    const [importData, setImportData] = useState<any[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)

    const fetchData = useCallback(async () => {
        if (!isOpen) return
        setLoading(true)
        try {
            const res = await fetch(`/api/docentes?programId=${programId}`)
            const data = await res.json()
            setDocentes(Array.isArray(data) ? data : [])
        } catch (e) {
            console.error("🚨 Error fetching docentes:", e)
            setDocentes([])
        } finally {
            setLoading(false)
        }
    }, [isOpen, programId])

    useEffect(() => { fetchData() }, [fetchData])

    const fetchPersonas = async () => {
        try {
            const res = await fetch("/api/personas")
            if (res.ok) setPersonas(await res.json())
        } catch (e) { console.error(e) }
    }
    useEffect(() => { if (showModal) fetchPersonas() }, [showModal])

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (!form.personId) {
            setError("Por favor selecciona un docente.")
            toast.error("Por favor selecciona un docente.")
            return
        }

        const url = editingDocente ? `/api/docentes/${editingDocente.id}` : "/api/docentes"
        const method = editingDocente ? "PUT" : "POST"
        const sendData = { ...form, programId: programId }

        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sendData)
        })

        if (res.ok) {
            toast.success(editingDocente ? "Docente actualizado" : "Docente asignado", { style: { background: '#F0FDF4', color: '#166534', border: '1px solid #4ADE80' }, iconTheme: { primary: '#22C55E', secondary: '#F0FDF4' } })
            setShowModal(false)
            setEditingDocente(null)
            setForm({ personId: "", contractType: "", dedication: "", teacherType: "Puro" })
            fetchData(); onChange?.()
        } else {
            const data = await res.json()
            const err = data.error || "Error al guardar el docente"
            setError(err)
            toast.error(err)
        }
    }

    const handleDelete = async (id: number) => {
        const res = await fetch(`/api/docentes/${id}`, { method: "DELETE" })
        if (res.ok) {
            toast.success("Asignación eliminada", { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' }, iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' } })
            fetchData(); onChange?.()
        } else {
            toast.error("Error al eliminar el docente")
        }
        setConfirmAction(null)
    }

    const openCreate = () => {
        setEditingDocente(null)
        setForm({ personId: "", contractType: "", dedication: "", teacherType: "Puro" })
        setError("")
        setShowModal(true)
    }

    const openEdit = (doc: Docente) => {
        setEditingDocente(doc)
        setForm({
            personId: String(doc.personId),
            contractType: doc.contractType || "",
            dedication: doc.dedication || "",
            teacherType: doc.teacherType || "Puro"
        })
        setError("")
        setShowModal(true)
    }

    const filtered = docentes.filter(d => {
        const matchSearch = `${d.person?.fullName || ""} ${d.contractType || ""} ${d.dedication || ""} ${d.teacherType || ""}`.toLowerCase().includes(search.toLowerCase())
        return matchSearch
    })

    const inputClasses = "w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs transition-colors"

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
        const ws = XLSX.utils.json_to_sheet([{ id_persona: 10, tipo_contrato: "Planta", dedicacion: "Tiempo Completo", tipo_docente: "Investigador" }])
        ws["!cols"] = [{ wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 }]
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Docentes")
        XLSX.writeFile(wb, "plantilla_importacion_docentes.xlsx")
    }

    const processImport = async () => {
        if (!importData.length) return; setImporting(true); let ok = 0; let fail = 0
        for (const row of importData) {
            try {
                const res = await fetch("/api/docentes", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        personId: row.id_persona,
                        contractType: row.tipo_contrato || null,
                        dedication: row.dedicacion || null,
                        teacherType: row.tipo_docente || "Puro",
                        programId
                    })
                })
                if (res.ok) ok++; else fail++
            } catch { fail++ }
        }
        setImporting(false); fetchData(); onChange?.(); setImportData([]); if (fileInputRef.current) fileInputRef.current.value = ""
        toast.success(`Importación terminada: ${ok} exitosos, ${fail} errores.`)
    }

    const exportDocentes = () => {
        const data = filtered.map(d => ({
            id: d.id,
            docente: d.person?.fullName || "",
            identificacion: d.person?.identification || "",
            tipo_contrato: d.contractType || "",
            dedicacion: d.dedication || "",
            tipo_docente: d.teacherType || ""
        }))
        const ws = XLSX.utils.json_to_sheet(data)
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Docentes")
        XLSX.writeFile(wb, `docentes_${programName.replace(/\s+/g, '_')}.xlsx`)
    }

    return (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-gray-900/50 p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-5xl rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
                            <span className="p-2 bg-brand-50 text-brand-600 rounded-lg">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            </span>
                            Docentes del Programa
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Gestión de docentes para <span className="font-medium text-brand-600">{programName}</span></p>
                    </div>
                    <button onClick={onClose} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div className="relative flex-1 max-w-md">
                        <input type="text" placeholder="Buscar por nombre, contrato..." value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 transition-colors" />
                        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={() => { setShowImportModal(true); setImportData([]) }} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            Importar
                        </button>
                        <button onClick={exportDocentes} disabled={docentes.length === 0} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors disabled:opacity-40">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Exportar
                        </button>
                        <button onClick={openCreate} className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Asignar Docente
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto rounded-xl border border-gray-200 bg-white shadow-theme-xs">
                    <table className="w-full text-left text-sm text-gray-500 relative">
                        <thead className="sticky top-0 bg-white z-10">
                            <tr className="border-b border-gray-100">
                                <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Docente</th>
                                <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Contrato</th>
                                <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Dedicación</th>
                                <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Tipo</th>
                                <th className="px-6 py-4 text-right text-theme-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="flex justify-center"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div></div>
                                    </td>
                                </tr>
                            ) : docentes.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                        No hay docentes asignados a este programa
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-800">
                                            <div className="flex flex-col">
                                                <span>{doc.person?.fullName}</span>
                                                <span className="text-xs text-gray-500 font-normal">ID: {doc.person?.identification}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{doc.contractType || <span className="text-gray-300 italic">No definido</span>}</td>
                                        <td className="px-6 py-4 text-gray-600">{doc.dedication || <span className="text-gray-300 italic">No definido</span>}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${doc.teacherType === "Investigador" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"}`}>
                                                {doc.teacherType}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="inline-flex items-center gap-1">
                                                <button onClick={() => openEdit(doc)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand-600 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                                <button onClick={() => setConfirmAction({ docente: doc })} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-error-600 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-[1000001] flex items-center justify-center bg-gray-900/50 p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg">
                        <div className="mb-5">
                            <h3 className="text-lg font-semibold text-gray-800">{editingDocente ? "Editar Docente" : "Asignar Docente"}</h3>
                            <p className="text-sm text-gray-500 mt-1">Completa los datos de asignación del docente.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && <div className="rounded-lg bg-error-50 border border-error-100 p-3 text-sm text-error-600">{error}</div>}

                            <div className="z-50">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-gray-700">Docente (Persona)</label>
                                    {!editingDocente && (
                                        <button type="button" onClick={() => setShowPersonModal(true)} className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1 bg-brand-50 px-2 py-1 rounded transition-colors">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                            Crear persona
                                        </button>
                                    )}
                                </div>
                                <SearchableSelect
                                    options={personas.map(p => ({ value: String(p.id), label: p.fullName, description: `ID: ${p.identification}` }))}
                                    value={form.personId}
                                    onChange={(val) => setForm({ ...form, personId: val })}
                                    placeholder="Buscar persona..."
                                    disabled={!!editingDocente}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Contrato</label>
                                <select
                                    value={form.contractType}
                                    onChange={(e) => setForm({ ...form, contractType: e.target.value })}
                                    className={inputClasses}
                                    required
                                >
                                    <option value="">Seleccionar contrato...</option>
                                    <option value="Indefinido">Indefinido</option>
                                    <option value="Semestral">Semestral</option>
                                    <option value="Anual">Anual</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Dedicación</label>
                                <select
                                    value={form.dedication}
                                    onChange={(e) => setForm({ ...form, dedication: e.target.value })}
                                    className={inputClasses}
                                    required
                                >
                                    <option value="">Seleccionar dedicación...</option>
                                    <option value="Tiempo Completo">Tiempo Completo</option>
                                    <option value="Medio Tiempo">Medio Tiempo</option>
                                    <option value="Tiempo Parcial">Tiempo Parcial</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Docente</label>
                                <select value={form.teacherType} onChange={(e) => setForm({ ...form, teacherType: e.target.value })} className={inputClasses}>
                                    <option value="Puro">Puro</option>
                                    <option value="Investigador">Investigador</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs">Cancelar</button>
                                <button type="submit" className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 shadow-theme-xs">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={!!confirmAction}
                title="Eliminar asignación"
                message={`¿Estás seguro de que deseas eliminar la asignación del docente "${confirmAction?.docente.person?.fullName}" de este programa?`}
                confirmText="Eliminar"
                variant="danger"
                onConfirm={() => confirmAction && handleDelete(confirmAction.docente.id)}
                onCancel={() => setConfirmAction(null)}
            />

            {showImportModal && (
                <div className="fixed inset-0 z-[1000001] flex items-center justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg">
                        <h3 className="text-lg font-semibold text-gray-800 mb-5">Importar Docentes</h3>
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 mb-5">
                            <p className="text-sm text-gray-600 mb-3">Formato: id_persona, tipo_contrato, dedicacion, tipo_docente</p>
                            <button onClick={downloadTemplate} className="text-sm font-medium text-brand-600">Descargar Plantilla</button>
                        </div>
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-brand-300 cursor-pointer mb-5" onClick={() => fileInputRef.current?.click()}>
                            <p className="text-sm text-gray-500">Haz clic para seleccionar Excel</p>
                            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }} />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowImportModal(false)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg">Cerrar</button>
                            <button onClick={processImport} disabled={!importData.length || importing} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg disabled:opacity-50">Iniciar</button>
                        </div>
                    </div>
                </div>
            )}

            <PersonFormModal
                isOpen={showPersonModal}
                onClose={() => setShowPersonModal(false)}
                onSuccess={(newPerson) => {
                    setPersonas(prev => [...prev, { id: newPerson.id, fullName: newPerson.fullName, identification: newPerson.identification }]);
                    setForm({ ...form, personId: String(newPerson.id) });
                }}
            />
        </div>
    )
}
