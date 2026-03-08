"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import ConfirmModal from "@/components/ConfirmModal"
import SearchableSelect from "@/components/SearchableSelect"
import * as XLSX from "xlsx"
import toast from "react-hot-toast"

interface Faculty { id: number; name: string }
interface Program { id: number; name: string; directorName: string; address: string | null; email: string | null; phone: string | null; facultyId: number; faculty?: Faculty }

export default function ProgramasPage() {
    const [programs, setPrograms] = useState<Program[]>([])
    const [faculties, setFaculties] = useState<Faculty[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingProgram, setEditingProgram] = useState<Program | null>(null)
    const [form, setForm] = useState({ name: "", directorName: "", address: "", email: "", phone: "", facultyId: "" })
    const [search, setSearch] = useState("")
    const [facultyFilter, setFacultyFilter] = useState("")
    const [error, setError] = useState("")
    const [confirmAction, setConfirmAction] = useState<{ type: "delete-single" | "delete-bulk"; program?: Program } | null>(null)
    const [showImportModal, setShowImportModal] = useState(false)
    const [importing, setImporting] = useState(false)
    const [importData, setImportData] = useState<any[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [selectedPrograms, setSelectedPrograms] = useState<number[]>([])
    const [deleting, setDeleting] = useState(false)

    const fetchData = useCallback(async () => {
        try {
            const [progRes, facRes] = await Promise.all([fetch("/api/programas"), fetch("/api/facultades")])
            setPrograms(await progRes.json())
            setFaculties(await facRes.json())
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        if (!form.facultyId) {
            setError("Debes seleccionar una facultad")
            return
        }
        const url = editingProgram ? `/api/programas/${editingProgram.id}` : "/api/programas"
        const method = editingProgram ? "PUT" : "POST"

        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form)
        })

        if (res.ok) {
            toast.success(editingProgram ? "Programa actualizado" : "Programa creado", { style: { background: '#F0FDF4', color: '#166534', border: '1px solid #4ADE80' }, iconTheme: { primary: '#22C55E', secondary: '#F0FDF4' } })
            setShowModal(false)
            setEditingProgram(null)
            setForm({ name: "", directorName: "", address: "", email: "", phone: "", facultyId: "" })
            fetchData()
        } else {
            const data = await res.json()
            const err = data.error || "Error al guardar el programa"
            setError(err)
            toast.error(err)
        }
    }

    const handleDelete = async (id: number) => {
        const res = await fetch(`/api/programas/${id}`, { method: "DELETE" })
        if (res.ok) {
            toast.success("Programa eliminado", { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' }, iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' } })
            fetchData()
        } else {
            toast.error("Error al eliminar el programa", { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' } })
        }
        setConfirmAction(null)
    }

    const handleBulkDelete = async () => {
        setDeleting(true)
        try {
            const res = await fetch('/api/programas/bulk-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ programIds: selectedPrograms }) })
            if (res.ok) {
                toast.success(`Se eliminaron ${selectedPrograms.length} programas`, { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' }, iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' } })
                setSelectedPrograms([]); fetchData()
            } else {
                const errData = await res.json().catch(() => ({}));
                toast.error(errData.error || "Error al eliminar")
            }
        } catch { toast.error("Error de conexión al eliminar") }
        setDeleting(false); setConfirmAction(null)
    }

    const handleConfirm = () => {
        if (!confirmAction) return;
        if (confirmAction.type === "delete-single" && confirmAction.program) {
            handleDelete(confirmAction.program.id)
        } else if (confirmAction.type === "delete-bulk") {
            handleBulkDelete(); return
        }
    }

    const openCreate = () => {
        setEditingProgram(null)
        setForm({ name: "", directorName: "", address: "", email: "", phone: "", facultyId: faculties.length > 0 ? String(faculties[0].id) : "" })
        setError("")
        setShowModal(true)
    }

    const openEdit = (prog: Program) => {
        setEditingProgram(prog)
        setForm({ name: prog.name, directorName: prog.directorName || "", address: prog.address || "", email: prog.email || "", phone: prog.phone || "", facultyId: String(prog.facultyId) })
        setError("")
        setShowModal(true)
    }

    const filtered = programs.filter(p => {
        const matchSearch = `${p.name} ${p.faculty?.name || ""} ${p.directorName} ${p.address || ""} ${p.email || ""} ${p.phone || ""}`.toLowerCase().includes(search.toLowerCase())
        const matchFaculty = facultyFilter ? String(p.facultyId) === facultyFilter : true
        return matchSearch && matchFaculty
    })

    const toggleProgramSelection = (id: number) => setSelectedPrograms(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id])
    const toggleAllPrograms = () => selectedPrograms.length === filtered.length ? setSelectedPrograms([]) : setSelectedPrograms(filtered.map(p => p.id))

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
        const ws = XLSX.utils.json_to_sheet([{ nombre: "Ingeniería de Sistemas", director: "Carlos Pérez", direccion: "Bloque 4", correo: "contacto@programa.edu", telefono: "3000000000", id_facultad: 1 }])
        ws["!cols"] = [{ wch: 30 }, { wch: 25 }, { wch: 35 }, { wch: 30 }, { wch: 15 }, { wch: 15 }]
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Programas")
        XLSX.writeFile(wb, "plantilla_importacion_programas.xlsx")
    }

    const processImport = async () => {
        if (!importData.length) return; setImporting(true); let ok = 0; let fail = 0
        for (const row of importData) {
            try {
                const res = await fetch("/api/programas", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: row.nombre || "Sin nombre",
                        directorName: row.director || "Sin asignar",
                        address: row.direccion || null,
                        email: row.correo || null,
                        phone: row.telefono || null,
                        facultyId: row.id_facultad || ""
                    })
                })
                if (res.ok) ok++; else fail++
            } catch { fail++ }
        }

        setImporting(false); fetchData()
        if (fail > 0 && ok > 0) toast.success(`Importación parcial: ${ok} creados, ${fail} fallaron (posibles duplicados o id_facultad inválido).`, { icon: '⚠️' })
        else if (fail > 0) toast.error(`Error al importar. Verifica el formato (${fail} fallaron).`)
        else toast.success(`¡Importación exitosa! ${ok} programas creados.`)

        setImportData([]) // Clear import queue
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    const exportPrograms = () => {
        const data = filtered.map(p => ({
            id: p.id,
            nombre: p.name,
            director: p.directorName,
            direccion: p.address || "",
            correo: p.email || "",
            telefono: p.phone || "",
            id_facultad: p.facultyId,
            facultad: p.faculty?.name || ""
        }))
        const ws = XLSX.utils.json_to_sheet(data)
        ws["!cols"] = [{ wch: 10 }, { wch: 30 }, { wch: 25 }, { wch: 35 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 30 }]
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Programas")
        XLSX.writeFile(wb, `programas_${new Date().toISOString().split("T")[0]}.xlsx`)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-800">Programas</h2>
                    <p className="text-gray-500 text-sm mt-1">Gestión de programas académicos y sus facultades</p>
                </div>
                <div className="flex items-center gap-3">
                    {selectedPrograms.length > 0 && (
                        <button onClick={() => setConfirmAction({ type: "delete-bulk" })} disabled={deleting} className="inline-flex items-center gap-2 rounded-lg border border-error-200 bg-error-50 px-4 py-2.5 text-sm font-medium text-error-600 hover:bg-error-100 shadow-theme-xs transition-colors disabled:opacity-50">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Eliminar ({selectedPrograms.length})
                        </button>
                    )}
                    <button onClick={() => { setShowImportModal(true); setImportData([]) }} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Importar
                    </button>
                    <button onClick={exportPrograms} disabled={programs.length === 0} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Exportar
                    </button>
                    <button onClick={openCreate} className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors">
                        + Nuevo Programa
                    </button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-md">
                    <input type="text" placeholder="Buscar por nombre, director..." value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 transition-colors" />
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <select value={facultyFilter} onChange={e => setFacultyFilter(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 transition-colors">
                    <option value="">Todas las Facultades</option>
                    {faculties.map(fac => (
                        <option key={fac.id} value={fac.id}>{fac.name}</option>
                    ))}
                </select>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-500">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-4"><input type="checkbox" checked={filtered.length > 0 && selectedPrograms.length === filtered.length} onChange={toggleAllPrograms} className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/10" /></th>
                                <th className="px-6 py-4 font-medium">Nombre del Programa</th>
                                <th className="px-6 py-4 font-medium">Director</th>
                                <th className="px-6 py-4 font-medium">Contacto</th>
                                <th className="px-6 py-4 font-medium">Facultad</th>
                                <th className="px-6 py-4 text-right font-medium">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center">
                                        <div className="flex justify-center"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div></div>
                                    </td>
                                </tr>
                            ) : programs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                        No hay programas registrados
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((prog) => (
                                    <tr key={prog.id} className={`hover:bg-gray-50/50 transition-colors ${selectedPrograms.includes(prog.id) ? "bg-brand-50/30" : ""}`}>
                                        <td className="px-4 py-4"><input type="checkbox" checked={selectedPrograms.includes(prog.id)} onChange={() => toggleProgramSelection(prog.id)} className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/10" /></td>
                                        <td className="px-6 py-4 font-medium text-gray-800">{prog.name}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-800">{prog.directorName}</span>
                                                {prog.address && <span className="text-sm text-gray-500 mt-1 flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>{prog.address}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            <div className="flex flex-col gap-1">
                                                {prog.email && <span className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>{prog.email}</span>}
                                                {prog.phone && <span className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>{prog.phone}</span>}
                                                {!prog.email && !prog.phone && <span className="text-gray-400 italic">Sin datos</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                                                {prog.faculty?.name || "Sin Facultad"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="inline-flex items-center gap-1">
                                                <button onClick={() => openEdit(prog)} title="Editar" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand-600 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                                <button onClick={() => setConfirmAction({ type: "delete-single", program: prog })} title="Eliminar" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-error-600 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
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
                <div className="fixed inset-0 z-[99999] flex items-start pt-[5vh] justify-center bg-gray-900/50 p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg animate-in zoom-in-95 duration-200">
                        <div className="mb-5">
                            <h3 className="text-lg font-semibold text-gray-800">{editingProgram ? "Editar Programa" : "Nuevo Programa"}</h3>
                            <p className="text-sm text-gray-500 mt-1">Completa los datos del programa académico.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="rounded-lg bg-error-50 border border-error-100 p-3 text-sm text-error-600">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Programa</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                    className={inputClasses}
                                    placeholder="Ej: Ingeniería de Sistemas"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Director/Jefe de Programa</label>
                                <input
                                    type="text"
                                    value={form.directorName}
                                    onChange={(e) => setForm({ ...form, directorName: e.target.value })}
                                    required
                                    className={inputClasses}
                                    placeholder="Ej: Dr. Carlos Pérez"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Dirección <span className="text-gray-400 font-normal">(opcional)</span></label>
                                <input
                                    type="text"
                                    value={form.address}
                                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                                    className={inputClasses}
                                    placeholder="Bloque 4, Oficina 401..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Correo <span className="text-gray-400 font-normal">(opcional)</span></label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        className={inputClasses}
                                        placeholder="contacto@programa.edu"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono <span className="text-gray-400 font-normal">(opcional)</span></label>
                                    <input
                                        type="tel"
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        className={inputClasses}
                                        placeholder="300 000 0000"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Facultad</label>
                                <SearchableSelect
                                    value={form.facultyId}
                                    onChange={(val) => setForm({ ...form, facultyId: val })}
                                    placeholder="Selecciona una facultad..."
                                    options={faculties.map(fac => ({ label: fac.name, value: String(fac.id) }))}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 shadow-theme-xs transition-colors">
                                    Guardar Programa
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={!!confirmAction}
                title={confirmAction?.type === "delete-bulk" ? "Eliminar programas" : "Eliminar Programa"}
                message={confirmAction?.type === "delete-bulk" ? `¿Estás seguro de que deseas eliminar los ${selectedPrograms.length} programas seleccionados? Esta acción no se puede deshacer.` : `¿Estás seguro de que deseas eliminar el programa "${confirmAction?.program?.name}"? Esta acción no se puede deshacer y fallará si hay personas asignadas.`}
                confirmText="Eliminar"
                variant="danger"
                onConfirm={handleConfirm}
                onCancel={() => setConfirmAction(null)}
            />

            {showImportModal && (
                <div className="fixed inset-0 z-[99999] flex items-start pt-[5vh] justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg">
                        <h3 className="text-lg font-semibold text-gray-800 mb-5">Importar Programas desde Excel</h3>

                        {/* Template download */}
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 mb-5">
                            <p className="text-sm text-gray-600 mb-3">Descarga la plantilla con el formato correcto para importar programas.</p>
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

                        {importData.length > 0 && <div className="mb-5 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">Se encontraron <strong>{importData.length}</strong> programas para importar.</div>}

                        <div className="flex gap-3 pt-1">
                            <button type="button" onClick={() => { setShowImportModal(false); setImportData([]) }} className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">Cerrar</button>
                            <button type="button" onClick={processImport} disabled={!importData.length || importing} className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 shadow-theme-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                {importing ? "Importando..." : "Iniciar Importación"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
