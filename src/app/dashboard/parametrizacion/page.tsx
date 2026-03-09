"use client"
import { useState, useEffect, useCallback } from "react"
import toast from "react-hot-toast"
import ConfirmModal from "@/components/ConfirmModal"

interface Factor {
    id: number
    number: number
    name: string
    description: string | null
}

export default function ParametrizacionPage() {
    const [factores, setFactores] = useState<Factor[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<Factor | null>(null)
    const [form, setForm] = useState({ number: "", name: "", description: "" })
    const [error, setError] = useState("")
    const [search, setSearch] = useState("")
    const [confirmDelete, setConfirmDelete] = useState<Factor | null>(null)

    const fetchFactores = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/factores")
            if (res.ok) setFactores(await res.json())
        } catch (e) {
            console.error(e)
        }
        setLoading(false)
    }, [])

    useEffect(() => { fetchFactores() }, [fetchFactores])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        const url = editing ? `/api/factores/${editing.id}` : "/api/factores"
        const method = editing ? "PUT" : "POST"
        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form)
        })
        if (res.ok) {
            toast.success(editing ? "Factor actualizado" : "Factor creado", {
                style: { background: '#F0FDF4', color: '#166534', border: '1px solid #4ADE80' },
                iconTheme: { primary: '#22C55E', secondary: '#F0FDF4' }
            })
            setShowModal(false)
            setEditing(null)
            setForm({ number: "", name: "", description: "" })
            fetchFactores()
        } else {
            const data = await res.json().catch(() => ({}))
            const err = data.error || "Error al guardar"
            setError(err)
            toast.error(err)
        }
    }

    const handleDelete = async (id: number) => {
        const res = await fetch(`/api/factores/${id}`, { method: "DELETE" })
        if (res.ok) {
            toast.success("Factor eliminado", {
                style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' },
                iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' }
            })
            fetchFactores()
        } else {
            toast.error("Error al eliminar")
        }
        setConfirmDelete(null)
    }

    const openCreate = () => {
        setEditing(null)
        setForm({ number: String((factores.length > 0 ? Math.max(...factores.map(f => f.number)) : 0) + 1), name: "", description: "" })
        setError("")
        setShowModal(true)
    }

    const openEdit = (f: Factor) => {
        setEditing(f)
        setForm({ number: String(f.number), name: f.name, description: f.description || "" })
        setError("")
        setShowModal(true)
    }

    const filtered = factores.filter(f =>
        `${f.number} ${f.name} ${f.description || ""}`.toLowerCase().includes(search.toLowerCase())
    )

    const inputCls = "w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs transition-colors"

    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-800 flex items-center gap-3">
                        <span className="p-2.5 bg-brand-50 text-brand-600 rounded-xl">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                        </span>
                        Parametrización
                    </h1>
                    <p className="text-gray-500 text-sm mt-1.5 ml-[52px]">Gestión de factores de condiciones de calidad</p>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="relative flex-1 max-w-md">
                    <input
                        type="text"
                        placeholder="Buscar factores..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 transition-colors"
                    />
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Nuevo Factor
                </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-xs">
                {loading ? (
                    <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div></div>
                ) : (
                    <table className="w-full">
                        <thead><tr className="border-b border-gray-100">
                            <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase w-20">N°</th>
                            <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Factor</th>
                            <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Descripción</th>
                            <th className="px-6 py-4 text-right text-theme-xs font-medium text-gray-500 uppercase w-28">Acciones</th>
                        </tr></thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map(f => (
                                <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-brand-50 text-brand-700 text-sm font-bold">
                                            {f.number}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{f.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {f.description ? <span className="line-clamp-2 max-w-md">{f.description}</span> : <span className="text-gray-400 italic">Sin descripción</span>}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="inline-flex items-center gap-1">
                                            <button onClick={() => openEdit(f)} title="Editar" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand-600 transition-colors">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                            <button onClick={() => setConfirmDelete(f)} title="Eliminar" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-error-600 transition-colors">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm">
                                    {search ? "No se encontraron factores" : "No hay factores registrados. Crea el primero."}
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[99999] flex items-start pt-[10vh] justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg">
                        <h3 className="text-lg font-semibold text-gray-800 mb-5">{editing ? "Editar Factor" : "Nuevo Factor"}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && <div className="rounded-lg bg-error-50 border border-error-100 p-3 text-sm text-error-600">{error}</div>}

                            <div className="grid grid-cols-4 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">N°</label>
                                    <input
                                        type="number"
                                        value={form.number}
                                        onChange={e => setForm({ ...form, number: e.target.value })}
                                        required
                                        min="1"
                                        className={inputCls}
                                        placeholder="1"
                                    />
                                </div>
                                <div className="col-span-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Factor</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        required
                                        className={inputCls}
                                        placeholder="Ej: Denominación del programa"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Descripción <span className="text-gray-400 font-normal">(opcional)</span></label>
                                <textarea
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    className={`${inputCls} resize-none h-24`}
                                    placeholder="Descripción del factor..."
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 shadow-theme-xs transition-colors">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm Delete */}
            <ConfirmModal
                open={!!confirmDelete}
                title="Eliminar Factor"
                message={`¿Estás seguro de que deseas eliminar el factor "${confirmDelete?.name}"? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                variant="danger"
                onConfirm={() => confirmDelete && handleDelete(confirmDelete.id)}
                onCancel={() => setConfirmDelete(null)}
            />
        </div>
    )
}
