"use client"
import { useState, useEffect, useCallback } from "react"
import toast from "react-hot-toast"
import ConfirmModal from "@/components/ConfirmModal"
import SearchableSelect from "@/components/SearchableSelect"

interface Program { id: number; name: string; faculty?: { id: number; name: string } }
interface Documento {
    id: number
    type: string
    year: number
    programId: number
    description: string | null
    status: string | null
    coverPage: string | null
    program?: Program
}

const DOCUMENT_TYPES = ["Registro Calificado", "Documento de acreditación"]

export default function DocumentosPage() {
    const [documentos, setDocumentos] = useState<Documento[]>([])
    const [programs, setPrograms] = useState<Program[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<Documento | null>(null)
    const [form, setForm] = useState({ type: DOCUMENT_TYPES[0], year: String(new Date().getFullYear()), programId: "", description: "", status: "En construcción" })
    const [error, setError] = useState("")
    const [search, setSearch] = useState("")
    const [filterType, setFilterType] = useState("")
    const [filterFaculty, setFilterFaculty] = useState("")
    const [confirmDelete, setConfirmDelete] = useState<Documento | null>(null)
    const [selectedDocs, setSelectedDocs] = useState<number[]>([])

    const fetchDocumentos = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/documentos")
            if (res.ok) setDocumentos(await res.json())
        } catch (e) { console.error(e) }
        setLoading(false)
    }, [])

    const fetchPrograms = useCallback(async () => {
        try {
            const res = await fetch("/api/programas")
            if (res.ok) setPrograms(await res.json())
        } catch (e) { console.error(e) }
    }, [])

    useEffect(() => { fetchDocumentos(); fetchPrograms() }, [fetchDocumentos, fetchPrograms])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        if (!form.programId) { setError("Selecciona un programa"); toast.error("Selecciona un programa"); return }
        const url = editing ? `/api/documentos/${editing.id}` : "/api/documentos"
        const method = editing ? "PUT" : "POST"
        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form)
        })
        if (res.ok) {
            toast.success(editing ? "Documento actualizado" : "Documento creado", {
                style: { background: '#F0FDF4', color: '#166534', border: '1px solid #4ADE80' },
                iconTheme: { primary: '#22C55E', secondary: '#F0FDF4' }
            })
            setShowModal(false); setEditing(null)
            setForm({ type: DOCUMENT_TYPES[0], year: String(new Date().getFullYear()), programId: "", description: "", status: "En construcción" })
            fetchDocumentos()
        } else {
            const data = await res.json().catch(() => ({}))
            setError(data.error || "Error al guardar"); toast.error(data.error || "Error al guardar")
        }
    }

    const handleDelete = async (id: number) => {
        const res = await fetch(`/api/documentos/${id}`, { method: "DELETE" })
        if (res.ok) {
            toast.success("Documento eliminado", { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' }, iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' } })
            fetchDocumentos()
        } else { toast.error("Error al eliminar") }
        setConfirmDelete(null)
    }

    const handleBulkDelete = async () => {
        let okCount = 0; let failCount = 0
        for (const id of selectedDocs) {
            const res = await fetch(`/api/documentos/${id}`, { method: "DELETE" })
            if (res.ok) okCount++; else failCount++
        }
        if (okCount > 0) toast.success(`Se eliminaron ${okCount} documentos`, { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' }, iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' } })
        if (failCount > 0) toast.error(`${failCount} documentos no se pudieron eliminar`)
        setSelectedDocs([])
        fetchDocumentos()
    }

    const openCreate = () => {
        setEditing(null)
        setForm({ type: DOCUMENT_TYPES[0], year: String(new Date().getFullYear()), programId: "", description: "", status: "En construcción" })
        setError(""); setShowModal(true)
    }

    const openEdit = (d: Documento) => {
        setEditing(d)
        setForm({ type: d.type, year: String(d.year), programId: String(d.programId), description: d.description || "", status: d.status || "" })
        setError(""); setShowModal(true)
    }

    const faculties = [...new Set(programs.map(p => p.faculty?.name).filter(Boolean))] as string[]

    const filtered = documentos.filter(d => {
        const matchSearch = `${d.type} ${d.year} ${d.program?.name || ""} ${d.program?.faculty?.name || ""} ${d.description || ""}`.toLowerCase().includes(search.toLowerCase())
        const matchType = !filterType || d.type === filterType
        const matchFaculty = !filterFaculty || d.program?.faculty?.name === filterFaculty
        return matchSearch && matchType && matchFaculty
    })

    const toggleSelection = (id: number) => setSelectedDocs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    const toggleAll = () => selectedDocs.length === filtered.length ? setSelectedDocs([]) : setSelectedDocs(filtered.map(d => d.id))

    const inputCls = "w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs transition-colors"

    const typeBadge = (type: string) => {
        if (type === "Registro Calificado") return "bg-blue-50 text-blue-700 border-blue-200"
        return "bg-purple-50 text-purple-700 border-purple-200"
    }

    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-800 flex items-center gap-3">
                        <span className="p-2.5 bg-brand-50 text-brand-600 rounded-xl">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </span>
                        Documentos
                    </h1>
                    <p className="text-gray-500 text-sm mt-1.5 ml-[52px]">Gestión de documentos de programas académicos</p>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3 flex-1">
                    <div className="relative flex-1 max-w-md">
                        <input type="text" placeholder="Buscar documentos..." value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 transition-colors" />
                        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <select value={filterType} onChange={e => setFilterType(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10">
                        <option value="">Todos los tipos</option>
                        {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={filterFaculty} onChange={e => setFilterFaculty(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10">
                        <option value="">Todas las facultades</option>
                        {faculties.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-3">
                    {selectedDocs.length > 0 && (
                        <button onClick={handleBulkDelete} className="inline-flex items-center gap-2 rounded-lg border border-error-200 bg-error-50 px-3 py-2.5 text-sm font-medium text-error-600 hover:bg-error-100 shadow-theme-xs transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Eliminar ({selectedDocs.length})
                        </button>
                    )}
                    <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Nuevo Documento
                    </button>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-xs">
                {loading ? (
                    <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div></div>
                ) : (
                    <table className="w-full">
                        <thead><tr className="border-b border-gray-100">
                            <th className="px-4 py-4 text-left"><input type="checkbox" checked={filtered.length > 0 && selectedDocs.length === filtered.length} onChange={toggleAll} className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/10" /></th>
                            <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Tipo</th>
                            <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Año</th>
                            <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Programa</th>
                            <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Descripción</th>
                            <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Estado</th>
                            <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Portada</th>
                            <th className="px-6 py-4 text-right text-theme-xs font-medium text-gray-500 uppercase w-28">Acciones</th>
                        </tr></thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map(d => (
                                <tr key={d.id} className={`hover:bg-gray-50 transition-colors ${selectedDocs.includes(d.id) ? "bg-brand-50/30" : ""}`}>
                                    <td className="px-4 py-4"><input type="checkbox" checked={selectedDocs.includes(d.id)} onChange={() => toggleSelection(d.id)} className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/10" /></td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${typeBadge(d.type)}`}>{d.type}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center justify-center w-14 h-8 rounded-lg bg-gray-100 text-gray-800 text-sm font-bold">{d.year}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <a href={`/dashboard/documentos/${d.id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline cursor-pointer">{d.program?.name || "—"}</a>
                                            {d.program?.faculty && <span className="text-xs text-gray-500">{d.program.faculty.name}</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {d.description ? <span className="line-clamp-2 max-w-xs">{d.description}</span> : <span className="text-gray-400 italic">—</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        {d.status ? <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${d.status === "Terminado" ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{d.status}</span> : <span className="text-gray-400">—</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        {d.coverPage ? <img src={d.coverPage} alt="Portada" className="w-10 h-14 object-cover rounded border border-gray-200 shadow-sm" /> : <span className="text-gray-400 text-xs">—</span>}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="inline-flex items-center gap-1">
                                            <button onClick={() => openEdit(d)} title="Editar" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand-600 transition-colors">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                            <button onClick={() => setConfirmDelete(d)} title="Eliminar" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-error-600 transition-colors">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-400 text-sm">
                                    {search || filterType || filterFaculty ? "No se encontraron documentos" : "No hay documentos registrados. Crea el primero."}
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[99999] flex items-start pt-[10vh] justify-center bg-gray-900/50 p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg">
                        <h3 className="text-lg font-semibold text-gray-800 mb-5">{editing ? "Editar Documento" : "Nuevo Documento"}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && <div className="rounded-lg bg-error-50 border border-error-100 p-3 text-sm text-error-600">{error}</div>}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Documento</label>
                                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} required className={inputCls}>
                                    {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Año</label>
                                <input type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} required min="1900" max="2100" className={inputCls} placeholder="2024" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Programa</label>
                                <SearchableSelect
                                    options={programs.map(p => ({ value: String(p.id), label: p.name, description: p.faculty?.name || "" }))}
                                    value={form.programId}
                                    onChange={(val) => setForm({ ...form, programId: val })}
                                    placeholder="Buscar programa..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Descripción <span className="text-gray-400 font-normal">(opcional)</span></label>
                                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={`${inputCls} resize-none h-20`} placeholder="Descripción del documento..." />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={inputCls}>
                                    <option value="En construcción">En construcción</option>
                                    <option value="Terminado">Terminado</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 shadow-theme-xs transition-colors">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={!!confirmDelete}
                title="Eliminar Documento"
                message={`¿Estás seguro de que deseas eliminar este documento de "${confirmDelete?.program?.name || ""}" (${confirmDelete?.year})? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                variant="danger"
                onConfirm={() => confirmDelete && handleDelete(confirmDelete.id)}
                onCancel={() => setConfirmDelete(null)}
            />
        </div>
    )
}
