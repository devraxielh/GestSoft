"use client"
import { useState, useEffect, useCallback } from "react"
import * as XLSX from "xlsx"
import { useRef } from "react"
import ConfirmModal from "@/components/ConfirmModal"
import toast from "react-hot-toast"

interface Faculty { id: number; name: string; deanName: string; address: string | null; email: string | null; phone: string | null }

export default function FacultadesPage() {
    const [faculties, setFaculties] = useState<Faculty[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null)
    const [form, setForm] = useState({ name: "", deanName: "", address: "", email: "", phone: "" })
    const [search, setSearch] = useState("")
    const [error, setError] = useState("")
    const [confirmAction, setConfirmAction] = useState<{ type: "delete-single" | "delete-bulk"; faculty?: Faculty } | null>(null)
    const [showImportModal, setShowImportModal] = useState(false)
    const [importData, setImportData] = useState<any[]>([])
    const [importing, setImporting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [selectedFaculties, setSelectedFaculties] = useState<number[]>([])
    const [deleting, setDeleting] = useState(false)

    const fetchFaculties = useCallback(async () => { const res = await fetch("/api/facultades"); setFaculties(await res.json()); setLoading(false) }, [])
    useEffect(() => { fetchFaculties() }, [fetchFaculties])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError("")
        const url = editingFaculty ? `/api/facultades/${editingFaculty.id}` : "/api/facultades"
        const res = await fetch(url, { method: editingFaculty ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
        if (res.ok) {
            toast.success(editingFaculty ? "Facultad actualizada" : "Facultad creada", { style: { background: '#F0FDF4', color: '#166534', border: '1px solid #4ADE80' }, iconTheme: { primary: '#22C55E', secondary: '#F0FDF4' } })
            setShowModal(false); setEditingFaculty(null); setForm({ name: "", deanName: "", address: "", email: "", phone: "" }); fetchFaculties()
        } else {
            toast.error("Error al guardar", { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' } })
            setError("Error al guardar")
        }
    }

    const handleDelete = async (id: number) => {
        const res = await fetch(`/api/facultades/${id}`, { method: "DELETE" });
        if (res.ok) {
            toast.success("Facultad eliminada", { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' }, iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' } })
            fetchFaculties()
        } else {
            toast.error("Error al eliminar")
        }
    }
    const handleBulkDelete = async () => {
        setDeleting(true)
        try {
            const res = await fetch('/api/facultades/bulk-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ facultyIds: selectedFaculties }) })
            if (res.ok) {
                toast.success(`Se eliminaron ${selectedFaculties.length} facultades`, { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' }, iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' } })
                setSelectedFaculties([]); fetchFaculties()
            } else {
                const errData = await res.json().catch(() => ({}));
                toast.error(errData.error || "Error al eliminar")
            }
        } catch { toast.error("Error de conexión al eliminar") }
        setDeleting(false); setConfirmAction(null)
    }
    const handleConfirm = () => {
        if (!confirmAction) return;
        if (confirmAction.type === "delete-single" && confirmAction.faculty) {
            handleDelete(confirmAction.faculty.id)
        } else if (confirmAction.type === "delete-bulk") {
            handleBulkDelete(); return
        }
        setConfirmAction(null)
    }
    const openCreate = () => { setEditingFaculty(null); setForm({ name: "", deanName: "", address: "", email: "", phone: "" }); setError(""); setShowModal(true) }
    const openEdit = (f: Faculty) => { setEditingFaculty(f); setForm({ name: f.name, deanName: f.deanName || "", address: f.address || "", email: f.email || "", phone: f.phone || "" }); setError(""); setShowModal(true) }

    const filtered = faculties.filter(f =>
        `${f.name} ${f.deanName} ${f.address || ""} ${f.email || ""} ${f.phone || ""}`.toLowerCase().includes(search.toLowerCase())
    )

    const toggleFacultySelection = (id: number) => setSelectedFaculties(prev => prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id])
    const toggleAllFaculties = () => selectedFaculties.length === filtered.length ? setSelectedFaculties([]) : setSelectedFaculties(filtered.map(f => f.id))

    const inputCls = "w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs transition-colors"

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
        const ws = XLSX.utils.json_to_sheet([{ nombre: "Ingeniería", decano: "Juan Pérez", direccion: "Bloque 4", correo: "contacto@ing.edu", telefono: "3000000000" }])
        ws["!cols"] = [{ wch: 30 }, { wch: 25 }, { wch: 35 }, { wch: 30 }, { wch: 15 }]
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Facultades")
        XLSX.writeFile(wb, "plantilla_importacion_facultades.xlsx")
    }

    const processImport = async () => {
        if (!importData.length) return; setImporting(true); let ok = 0; let fail = 0 // Removed error/success overrides
        for (const row of importData) {
            const body = {
                name: row.nombre || row.Nombre || "",
                deanName: row.decano || row.Decano || "Sin asignar",
                address: row.direccion || row.Direccion || row.Dirección || "",
                email: row.correo || row.Correo || row.email || row.Email || "",
                phone: row.telefono || row.Telefono || row.Teléfono || ""
            }
            if (!body.name) { fail++; continue }
            const res = await fetch("/api/facultades", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
            if (res.ok) ok++; else fail++
        }
        setImporting(false);
        if (fail > 0 && ok > 0) toast.success(`${ok} importadas, ${fail} fallidas`, { icon: '⚠️' })
        else if (fail > 0) toast.error(`${fail} fallidas`)
        else toast.success(`${ok} importadas correctamente`)
        setImportData([]); fetchFaculties(); if (fileInputRef.current) fileInputRef.current.value = ""
    }

    const exportFaculties = () => {
        const data = faculties.map(f => ({
            nombre: f.name,
            decano: f.deanName,
            direccion: f.address || "",
            correo: f.email || "",
            telefono: f.phone || ""
        }))
        const ws = XLSX.utils.json_to_sheet(data)
        ws["!cols"] = [{ wch: 30 }, { wch: 25 }, { wch: 35 }, { wch: 30 }, { wch: 15 }]
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Facultades")
        XLSX.writeFile(wb, `facultades_${new Date().toISOString().split("T")[0]}.xlsx`)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h2 className="text-2xl font-semibold text-gray-800">Facultades</h2><p className="text-gray-500 text-sm mt-1">Gestión de facultades</p></div>
                <div className="flex items-center gap-3">
                    {selectedFaculties.length > 0 && (
                        <button onClick={() => setConfirmAction({ type: "delete-bulk" })} disabled={deleting} className="inline-flex items-center gap-2 rounded-lg border border-error-200 bg-error-50 px-4 py-2.5 text-sm font-medium text-error-600 hover:bg-error-100 shadow-theme-xs transition-colors disabled:opacity-50">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Eliminar ({selectedFaculties.length})
                        </button>
                    )}
                    <button onClick={() => { setShowImportModal(true); setImportData([]) }} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Importar
                    </button>
                    <button onClick={exportFaculties} disabled={faculties.length === 0} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Exportar
                    </button>
                    <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Nueva Facultad
                    </button>
                </div>
            </div>

            <div className="relative max-w-md">
                <input type="text" placeholder="Buscar por nombre, decano, dirección..." value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 transition-colors" />
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>

            {loading ? <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div></div> : (
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs">
                    <table className="w-full">
                        <thead><tr className="border-b border-gray-100">
                            <th className="px-4 py-4 text-left"><input type="checkbox" checked={filtered.length > 0 && selectedFaculties.length === filtered.length} onChange={toggleAllFaculties} className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/10" /></th>
                            <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Nombre</th>
                            <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Decano</th>
                            <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Contacto</th>
                            <th className="px-6 py-4 text-right text-theme-xs font-medium text-gray-500 uppercase">Acciones</th>
                        </tr></thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map((f) => (
                                <tr key={f.id} className={`hover:bg-gray-50 transition-colors ${selectedFaculties.includes(f.id) ? "bg-brand-50/30" : ""}`}>
                                    <td className="px-4 py-4"><input type="checkbox" checked={selectedFaculties.includes(f.id)} onChange={() => toggleFacultySelection(f.id)} className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/10" /></td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{f.name}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-800">{f.deanName}</span>
                                            {f.address && <span className="text-sm text-gray-500 mt-1 flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>{f.address}</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        <div className="flex flex-col gap-1">
                                            {f.email && <span className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>{f.email}</span>}
                                            {f.phone && <span className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>{f.phone}</span>}
                                            {!f.email && !f.phone && <span className="text-gray-400 italic">Sin datos</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="inline-flex items-center gap-1">
                                            <button onClick={() => openEdit(f)} title="Editar" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand-600 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                            <button onClick={() => setConfirmAction({ type: "delete-single", faculty: f })} title="Eliminar" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-error-600 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">{search ? "No se encontraron facultades" : "No hay facultades"}</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
            {showModal && (
                <div className="fixed inset-0 z-[99999] flex items-start pt-[5vh] justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-800 mb-5">{editingFaculty ? "Editar Facultad" : "Nueva Facultad"}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && <div className="rounded-lg bg-error-50 border border-error-100 p-3 text-sm text-error-600">{error}</div>}

                            <div><label className="block text-sm font-medium text-gray-700 mb-2">Nombre de la Facultad</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className={inputCls} placeholder="Ej: Facultad de Ingeniería" /></div>

                            <div><label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Decano</label><input type="text" value={form.deanName} onChange={e => setForm({ ...form, deanName: e.target.value })} required className={inputCls} placeholder="Ej: Dr. Juan Pérez" /></div>

                            <div><label className="block text-sm font-medium text-gray-700 mb-2">Dirección <span className="text-gray-400 font-normal">(opcional)</span></label><input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className={inputCls} placeholder="Sede principal, Bloque 4..." /></div>

                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-2">Correo <span className="text-gray-400 font-normal">(opcional)</span></label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="contacto@facultad.edu" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-2">Teléfono <span className="text-gray-400 font-normal">(opcional)</span></label><input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="300 000 0000" /></div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 shadow-theme-xs transition-colors">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showImportModal && (
                <div className="fixed inset-0 z-[99999] flex items-start pt-[5vh] justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg">
                        <h3 className="text-lg font-semibold text-gray-800 mb-5">Importar Facultades desde Excel</h3>

                        {/* Template download */}
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 mb-5">
                            <p className="text-sm text-gray-600 mb-3">Descarga la plantilla con el formato correcto para importar facultades.</p>
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

                        {importData.length > 0 && <div className="mb-5 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">Se encontraron <strong>{importData.length}</strong> facultades para importar.</div>}

                        <div className="flex gap-3 pt-1">
                            <button type="button" onClick={() => { setShowImportModal(false); setImportData([]) }} className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">Cerrar</button>
                            <button type="button" onClick={processImport} disabled={!importData.length || importing} className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 shadow-theme-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                {importing ? "Importando..." : "Iniciar Importación"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={!!confirmAction}
                title={confirmAction?.type === "delete-bulk" ? "Eliminar facultades" : "Eliminar Facultad"}
                message={confirmAction?.type === "delete-bulk" ? `¿Estás seguro de que deseas eliminar las ${selectedFaculties.length} facultades seleccionadas? Esta acción no se puede deshacer.` : `¿Estás seguro de que deseas eliminar la facultad "${confirmAction?.faculty?.name}"? Esta acción no se puede deshacer y fallará si hay programas asignados.`}
                confirmText="Eliminar"
                variant="danger"
                onConfirm={handleConfirm}
                onCancel={() => setConfirmAction(null)}
            />
        </div>
    )
}
