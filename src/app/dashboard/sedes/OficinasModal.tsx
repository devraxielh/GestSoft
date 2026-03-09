import { useState, useEffect, useCallback, useRef } from "react"
import * as XLSX from "xlsx"
import ConfirmModal from "@/components/ConfirmModal"
import toast from "react-hot-toast"
import DirectivosModal from "./DirectivosModal"

interface Sede { id: number; name: string }
interface Oficina { id: number; name: string; sedeId: number; description: string | null; sede?: Sede; _count?: { directivos: number } }

interface Props {
    isOpen: boolean
    onClose: () => void
    sedeId: number
    sedeName: string
    onChange?: () => void
}

export default function OficinasModal({ isOpen, onClose, sedeId, sedeName, onChange }: Props) {
    const [oficinas, setOficinas] = useState<Oficina[]>([])
    const [loading, setLoading] = useState(true)
    const [showFormModal, setShowFormModal] = useState(false)
    const [editingOficina, setEditingOficina] = useState<Oficina | null>(null)
    const [form, setForm] = useState({ name: "", description: "" })
    const [search, setSearch] = useState("")
    const [error, setError] = useState("")
    const [confirmAction, setConfirmAction] = useState<{ type: "delete-single" | "delete-bulk"; oficina?: Oficina } | null>(null)

    const [showImportModal, setShowImportModal] = useState(false)
    const [importData, setImportData] = useState<any[]>([])
    const [importing, setImporting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [selectedOficinas, setSelectedOficinas] = useState<number[]>([])
    const [deleting, setDeleting] = useState(false)

    const [selectedOficinaForDirectivos, setSelectedOficinaForDirectivos] = useState<Oficina | null>(null)

    const fetchOficinas = useCallback(async () => {
        if (!isOpen) return
        setLoading(true)
        try {
            const res = await fetch("/api/oficinas");
            if (!res.ok) { setOficinas([]); setLoading(false); return }
            const allOficinas: Oficina[] = await res.json()
            setOficinas(allOficinas.filter(o => o.sedeId === sedeId))
        } catch (e) {
            console.error("Error fetching oficinas:", e)
            setOficinas([])
        }
        setLoading(false)
    }, [isOpen, sedeId])

    useEffect(() => { fetchOficinas() }, [fetchOficinas])

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError("")
        const url = editingOficina ? `/api/oficinas/${editingOficina.id}` : "/api/oficinas"
        const sendData = {
            ...form,
            sedeId: sedeId
        }
        const res = await fetch(url, { method: editingOficina ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sendData) })
        if (res.ok) {
            toast.success(editingOficina ? "Oficina actualizada" : "Oficina creada", { style: { background: '#F0FDF4', color: '#166534', border: '1px solid #4ADE80' }, iconTheme: { primary: '#22C55E', secondary: '#F0FDF4' } })
            setShowFormModal(false); setEditingOficina(null); setForm({ name: "", description: "" }); fetchOficinas(); onChange?.()
        } else {
            toast.error("Error al guardar", { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' } })
            setError("Error al guardar")
        }
    }

    const handleDelete = async (id: number) => {
        const res = await fetch(`/api/oficinas/${id}`, { method: "DELETE" });
        if (res.ok) {
            toast.success("Oficina eliminada", { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' }, iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' } })
            fetchOficinas(); onChange?.()
        } else {
            toast.error("Error al eliminar")
        }
    }
    const handleBulkDelete = async () => {
        setDeleting(true)
        try {
            const res = await fetch('/api/oficinas/bulk-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oficinaIds: selectedOficinas }) })
            if (res.ok) {
                toast.success(`Se eliminaron ${selectedOficinas.length} oficinas`, { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' }, iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' } })
                setSelectedOficinas([]); fetchOficinas(); onChange?.()
            } else {
                toast.error("Error al eliminar")
            }
        } catch { toast.error("Error de conexión al eliminar") }
        setDeleting(false); setConfirmAction(null)
    }
    const handleConfirm = () => {
        if (!confirmAction) return;
        if (confirmAction.type === "delete-single" && confirmAction.oficina) {
            handleDelete(confirmAction.oficina.id)
        } else if (confirmAction.type === "delete-bulk") {
            handleBulkDelete(); return
        }
        setConfirmAction(null)
    }

    const openCreate = () => { setEditingOficina(null); setForm({ name: "", description: "" }); setError(""); setShowFormModal(true) }
    const openEdit = (o: Oficina) => { setEditingOficina(o); setForm({ name: o.name, description: o.description || "" }); setError(""); setShowFormModal(true) }

    const filtered = oficinas.filter(o =>
        `${o.name} ${o.description || ""}`.toLowerCase().includes(search.toLowerCase())
    )

    const toggleOficinaSelection = (id: number) => setSelectedOficinas(prev => prev.includes(id) ? prev.filter(oid => oid !== id) : [...prev, id])
    const toggleAllOficinas = () => selectedOficinas.length === filtered.length ? setSelectedOficinas([]) : setSelectedOficinas(filtered.map(o => o.id))

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
        const ws = XLSX.utils.json_to_sheet([{ nombre: "Oficina de Registro", descripcion: "Encargada de admisiones" }])
        ws["!cols"] = [{ wch: 30 }, { wch: 50 }]
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Oficinas")
        XLSX.writeFile(wb, "plantilla_importacion_oficinas.xlsx")
    }

    const processImport = async () => {
        if (!importData.length) return; setImporting(true); let ok = 0; let fail = 0
        for (const row of importData) {
            const body = {
                name: row.nombre || row.Nombre || "",
                sedeId: sedeId,
                description: row.descripcion || row.Descripcion || row.Descripción || ""
            }
            if (!body.name) { fail++; continue }
            const res = await fetch("/api/oficinas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
            if (res.ok) ok++; else fail++
        }
        setImporting(false);
        if (fail > 0 && ok > 0) toast.success(`${ok} importadas, ${fail} fallidas`, { icon: '⚠️' })
        else if (fail > 0) toast.error(`${fail} fallidas`)
        else toast.success(`${ok} importadas correctamente`)
        setImportData([]); fetchOficinas(); onChange?.(); if (fileInputRef.current) fileInputRef.current.value = ""
    }

    const exportOficinas = () => {
        const data = oficinas.map(o => ({
            nombre: o.name,
            descripcion: o.description || ""
        }))
        const ws = XLSX.utils.json_to_sheet(data)
        ws["!cols"] = [{ wch: 30 }, { wch: 50 }]
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Oficinas")
        XLSX.writeFile(wb, `oficinas_${sedeName}_${new Date().toISOString().split("T")[0]}.xlsx`)
    }

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-gray-900/50 p-4">
            <div className="w-full max-w-5xl rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-semibold text-gray-800">Oficinas de {sedeName} <span className="text-base font-normal text-gray-400">({oficinas.length})</span></h2>
                        <p className="text-gray-500 text-sm mt-1">Gestión de dependencias para esta sede</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                    <div className="relative flex-1 min-w-[250px] max-w-md">
                        <input type="text" placeholder="Buscar por nombre..." value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 transition-colors" />
                        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>

                    <div className="flex items-center gap-2">
                        {selectedOficinas.length > 0 && (
                            <button onClick={() => setConfirmAction({ type: "delete-bulk" })} disabled={deleting} className="inline-flex items-center gap-2 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm font-medium text-error-600 hover:bg-error-100 shadow-theme-xs transition-colors disabled:opacity-50">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Eliminar ({selectedOficinas.length})
                            </button>
                        )}
                        <button onClick={() => { setShowImportModal(true); setImportData([]) }} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            Importar
                        </button>
                        <button onClick={exportOficinas} disabled={oficinas.length === 0} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Exportar
                        </button>
                        <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Nueva
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto rounded-xl border border-gray-200 bg-white shadow-theme-xs">
                    {loading ? <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div></div> : (
                        <table className="w-full relative">
                            <thead className="sticky top-0 bg-white z-10"><tr className="border-b border-gray-100">
                                <th className="px-4 py-4 text-left"><input type="checkbox" checked={filtered.length > 0 && selectedOficinas.length === filtered.length} onChange={toggleAllOficinas} className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/10" /></th>
                                <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Nombre</th>
                                <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Descripción</th>
                                <th className="px-6 py-4 text-right text-theme-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr></thead>
                            <tbody className="divide-y divide-gray-100">
                                {filtered.map((o) => (
                                    <tr key={o.id} className={`hover:bg-gray-50 transition-colors ${selectedOficinas.includes(o.id) ? "bg-brand-50/30" : ""}`}>
                                        <td className="px-4 py-4"><input type="checkbox" checked={selectedOficinas.includes(o.id)} onChange={() => toggleOficinaSelection(o.id)} className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/10" /></td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-800">{o.name}</span>
                                                <button onClick={() => setSelectedOficinaForDirectivos(o)} className="text-xs text-brand-600 hover:text-brand-700 hover:underline mt-1 font-medium inline-flex items-center gap-1 w-fit border border-brand-200 bg-brand-50 px-2.5 py-1 rounded-full shadow-sm transition-colors text-left">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                                    Gestionar Personal ({o._count?.directivos ?? 0})
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {o.description ? <span className="line-clamp-2 max-w-xs">{o.description}</span> : <span className="text-gray-400 italic">Sin descripción</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="inline-flex items-center gap-1">
                                                <button onClick={() => openEdit(o)} title="Editar" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand-600 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                                <button onClick={() => setConfirmAction({ type: "delete-single", oficina: o })} title="Eliminar" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-error-600 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm">{search ? "No se encontraron oficinas" : "No hay oficinas registradas"}</td></tr>}
                            </tbody>
                        </table>
                    )}
                </div>

                {showFormModal && (
                    <div className="fixed inset-0 z-[999999] flex items-start pt-[10vh] justify-center bg-gray-900/50 p-4">
                        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg">
                            <h3 className="text-lg font-semibold text-gray-800 mb-5">{editingOficina ? "Editar Oficina" : "Nueva Oficina"}</h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && <div className="rounded-lg bg-error-50 border border-error-100 p-3 text-sm text-error-600">{error}</div>}

                                <div><label className="block text-sm font-medium text-gray-700 mb-2">Nombre de la Oficina</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className={inputCls} placeholder="Ej: Oficina de Registro" /></div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Descripción <span className="text-gray-400 font-normal">(opcional)</span></label>
                                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={`${inputCls} resize-none h-24`} placeholder="Ej: Encargada del proceso de admisiones..." />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setShowFormModal(false)} className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">Cancelar</button>
                                    <button type="submit" className="flex-1 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 shadow-theme-xs transition-colors">Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showImportModal && (
                    <div className="fixed inset-0 z-[999999] flex items-start pt-[10vh] justify-center bg-gray-900/50 p-4">
                        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg">
                            <h3 className="text-lg font-semibold text-gray-800 mb-5">Importar Oficinas</h3>
                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 mb-5">
                                <button onClick={downloadTemplate} className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    Descargar Plantilla
                                </button>
                            </div>
                            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-brand-300 transition-colors cursor-pointer mb-5" onClick={() => fileInputRef.current?.click()}>
                                <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                <p className="text-sm text-gray-500">Haz clic para seleccionar .xlsx</p>
                                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }} />
                            </div>
                            {importData.length > 0 && <div className="mb-5 text-sm rounded-lg p-3 bg-brand-50 text-brand-700 border border-brand-100">Se encontraron <strong>{importData.length}</strong> oficinas.</div>}
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => { setShowImportModal(false); setImportData([]) }} className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cerrar</button>
                                <button type="button" onClick={processImport} disabled={!importData.length || importing} className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors disabled:opacity-50">
                                    {importing ? "Importando..." : "Importar"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {confirmAction && (
                    <div className="fixed inset-0 z-[999999] flex items-center justify-center">
                        <ConfirmModal
                            open={!!confirmAction}
                            title={confirmAction?.type === "delete-bulk" ? "Eliminar oficinas" : "Eliminar Oficina"}
                            message={confirmAction?.type === "delete-bulk" ? `¿Estás seguro de que deseas eliminar las ${selectedOficinas.length} oficinas seleccionadas? Esta acción no se puede deshacer.` : `¿Estás seguro de que deseas eliminar la oficina "${confirmAction?.oficina?.name}"? Se perderán todos sus datos.`}
                            confirmText="Eliminar"
                            variant="danger"
                            onConfirm={handleConfirm}
                            onCancel={() => setConfirmAction(null)}
                        />
                    </div>
                )}

                {selectedOficinaForDirectivos && (
                    <DirectivosModal
                        isOpen={true}
                        onClose={() => setSelectedOficinaForDirectivos(null)}
                        oficinaId={selectedOficinaForDirectivos.id}
                        oficinaName={selectedOficinaForDirectivos.name}
                        onChange={fetchOficinas}
                    />
                )}
            </div>
        </div>
    )
}
