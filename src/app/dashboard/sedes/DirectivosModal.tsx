import { useState, useEffect, useCallback } from "react"
import ConfirmModal from "@/components/ConfirmModal"
import toast from "react-hot-toast"
import SearchableSelect from "@/components/SearchableSelect"
import PersonFormModal from "@/components/PersonFormModal"

interface Person { id: number; identification: string; fullName: string }
interface Oficina { id: number; name: string }
interface Directivo { id: number; oficinaId: number; personId: number; cargo: string; joinedAt: string; person: Person; oficina: Oficina }

interface Props {
    isOpen: boolean
    onClose: () => void
    oficinaId: number
    oficinaName: string
    onChange?: () => void
}

export default function DirectivosModal({ isOpen, onClose, oficinaId, oficinaName, onChange }: Props) {
    const [directivos, setDirectivos] = useState<Directivo[]>([])
    const [persons, setPersons] = useState<Person[]>([])

    const [loading, setLoading] = useState(true)
    const [showFormModal, setShowFormModal] = useState(false)
    const [editingDirectivo, setEditingDirectivo] = useState<Directivo | null>(null)

    const [form, setForm] = useState({ personId: "", cargo: "Integrante" })
    const [search, setSearch] = useState("")
    const [error, setError] = useState("")
    const [confirmAction, setConfirmAction] = useState<{ type: "delete-single" | "delete-bulk"; directivo?: Directivo } | null>(null)

    const [selectedDirectivos, setSelectedDirectivos] = useState<number[]>([])
    const [deleting, setDeleting] = useState(false)
    const [showPersonModal, setShowPersonModal] = useState(false)

    const fetchDirectivos = useCallback(async () => {
        if (!isOpen) return
        setLoading(true)
        const res = await fetch(`/api/directivos?oficinaId=${oficinaId}`)
        setDirectivos(await res.json())
        setLoading(false)
    }, [isOpen, oficinaId])

    const fetchPersons = useCallback(async () => {
        if (!isOpen) return
        const res = await fetch("/api/personas");
        setPersons(await res.json());
    }, [isOpen])

    useEffect(() => { fetchDirectivos(); fetchPersons() }, [fetchDirectivos, fetchPersons])

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError("")
        if (!form.personId) { setError("Debes seleccionar a una persona"); return }

        const url = editingDirectivo ? `/api/directivos/${editingDirectivo.id}` : "/api/directivos"
        const sendData = {
            oficinaId,
            personId: form.personId,
            cargo: form.cargo
        }
        const res = await fetch(url, { method: editingDirectivo ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sendData) })
        if (res.ok) {
            toast.success(editingDirectivo ? "Asignación actualizada" : "Persona asignada", { style: { background: '#F0FDF4', color: '#166534', border: '1px solid #4ADE80' }, iconTheme: { primary: '#22C55E', secondary: '#F0FDF4' } })
            setShowFormModal(false); setEditingDirectivo(null); setForm({ personId: "", cargo: "Integrante" }); fetchDirectivos(); onChange?.()
        } else {
            toast.error("Error al guardar", { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' } })
            setError("Error al guardar")
        }
    }

    const handleDelete = async (id: number) => {
        const res = await fetch(`/api/directivos/${id}`, { method: "DELETE" });
        if (res.ok) {
            toast.success("Asignación eliminada", { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' }, iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' } })
            fetchDirectivos(); onChange?.()
        } else { toast.error("Error al eliminar") }
    }

    const handleBulkDelete = async () => {
        setDeleting(true)
        try {
            const res = await fetch('/api/directivos/bulk-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ directivoIds: selectedDirectivos }) })
            if (res.ok) {
                toast.success(`Se eliminaron ${selectedDirectivos.length} asignaciones`, { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' }, iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' } })
                setSelectedDirectivos([]); fetchDirectivos()
            } else {
                toast.error("Error al eliminar")
            }
        } catch { toast.error("Error de conexión al eliminar") }
        setDeleting(false); setConfirmAction(null)
    }

    const handleConfirm = () => {
        if (!confirmAction) return;
        if (confirmAction.type === "delete-single" && confirmAction.directivo) {
            handleDelete(confirmAction.directivo.id)
        } else if (confirmAction.type === "delete-bulk") {
            handleBulkDelete(); return
        }
        setConfirmAction(null)
    }

    const openCreate = () => {
        setEditingDirectivo(null)
        setForm({ personId: "", cargo: "Integrante" })
        setError("")
        setShowFormModal(true)
    }

    const openEdit = (d: Directivo) => {
        setEditingDirectivo(d)
        setForm({ personId: d.personId.toString(), cargo: d.cargo })
        setError("")
        setShowFormModal(true)
    }

    const filtered = directivos.filter(d =>
        `${d.person.fullName} ${d.person.identification} ${d.cargo}`.toLowerCase().includes(search.toLowerCase())
    )

    const toggleDirectivoSelection = (id: number) => setSelectedDirectivos(prev => prev.includes(id) ? prev.filter(did => did !== id) : [...prev, id])
    const toggleAllDirectivos = () => selectedDirectivos.length === filtered.length ? setSelectedDirectivos([]) : setSelectedDirectivos(filtered.map(d => d.id))

    const inputCls = "w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs transition-colors"

    const cargos = ["Rector General", "Rector", "Secretario General", "Director", "Jefe de Oficina", "Subdirector", "Coordinador", "Asesora Externa de Calidad", "Secretario", "Asistente", "Miembro", "Integrante"]

    return (
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center bg-gray-900/50 p-4">
            <div className="w-full max-w-5xl rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-semibold text-gray-800">
                            Personal de {oficinaName}
                        </h2>
                        <p className="text-gray-500 text-sm mt-1">Gestión de personas asignadas a esta oficina</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                    <div className="relative flex-1 min-w-[250px] max-w-md">
                        <input type="text" placeholder="Buscar por nombre, cargo..." value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 transition-colors" />
                        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>

                    <div className="flex items-center gap-2">
                        {selectedDirectivos.length > 0 && (
                            <button onClick={() => setConfirmAction({ type: "delete-bulk" })} disabled={deleting} className="inline-flex items-center gap-2 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm font-medium text-error-600 hover:bg-error-100 shadow-theme-xs transition-colors disabled:opacity-50">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Eliminar ({selectedDirectivos.length})
                            </button>
                        )}
                        <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Asignar Persona
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto rounded-xl border border-gray-200 bg-white shadow-theme-xs">
                    {loading ? <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div></div> : (
                        <table className="w-full relative">
                            <thead className="sticky top-0 bg-white z-10"><tr className="border-b border-gray-100">
                                <th className="px-4 py-4 text-left"><input type="checkbox" checked={filtered.length > 0 && selectedDirectivos.length === filtered.length} onChange={toggleAllDirectivos} className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/10" /></th>
                                <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Persona (C.I.)</th>
                                <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Cargo</th>
                                <th className="px-6 py-4 text-right text-theme-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr></thead>
                            <tbody className="divide-y divide-gray-100">
                                {filtered.map((d) => (
                                    <tr key={d.id} className={`hover:bg-gray-50 transition-colors ${selectedDirectivos.includes(d.id) ? "bg-brand-50/30" : ""}`}>
                                        <td className="px-4 py-4"><input type="checkbox" checked={selectedDirectivos.includes(d.id)} onChange={() => toggleDirectivoSelection(d.id)} className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/10" /></td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-800">{d.person.fullName}</span>
                                                <span className="text-xs text-gray-500">{d.person.identification}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${d.cargo.toLowerCase() === 'director' ? 'bg-brand-100 text-brand-800' : 'bg-gray-100 text-gray-700'}`}>
                                                {d.cargo}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="inline-flex items-center gap-1">
                                                <button onClick={() => openEdit(d)} title="Editar" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand-600 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                                <button onClick={() => setConfirmAction({ type: "delete-single", directivo: d })} title="Quitar Asignación" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-error-600 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm">{search ? "No se encontraron asignaciones" : "Nadie asignado a esta oficina"}</td></tr>}
                            </tbody>
                        </table>
                    )}
                </div>

                {showFormModal && (
                    <div className="fixed inset-0 z-[10000000] flex items-start pt-[10vh] justify-center bg-gray-900/50 p-4">
                        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg">
                            <h3 className="text-lg font-semibold text-gray-800 mb-5">{editingDirectivo ? "Modificar Cargo" : "Nueva Asignación"}</h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && <div className="rounded-lg bg-error-50 border border-error-100 p-3 text-sm text-error-600">{error}</div>}

                                {!editingDirectivo && (
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-sm font-medium text-gray-700">Persona a asignar *</label>
                                            <button
                                                type="button"
                                                onClick={() => setShowPersonModal(true)}
                                                className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1 bg-brand-50 hover:bg-brand-100 px-2 py-1 rounded transition-colors"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                Crear persona
                                            </button>
                                        </div>
                                        <SearchableSelect
                                            options={persons.map(p => ({ value: String(p.id), label: p.fullName, description: `ID: ${p.identification}` }))}
                                            value={form.personId}
                                            onChange={(val) => setForm({ ...form, personId: val })}
                                            placeholder="Buscar persona..."
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Cargo Asignado *</label>
                                    <select
                                        value={form.cargo}
                                        onChange={e => setForm({ ...form, cargo: e.target.value })}
                                        required
                                        className={`${inputCls} appearance-none bg-no-repeat bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_1rem_center] pr-10`}
                                    >
                                        {cargos.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setShowFormModal(false)} className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">Cancelar</button>
                                    <button type="submit" className="flex-1 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 shadow-theme-xs transition-colors">Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {confirmAction && (
                    <div className="fixed inset-0 z-[10000000] flex items-center justify-center">
                        <ConfirmModal
                            open={!!confirmAction}
                            title={confirmAction?.type === "delete-bulk" ? "Quitar múltiples asignaciones" : "Quitar Asignación"}
                            message={confirmAction?.type === "delete-bulk" ? `¿Estás seguro de que deseas quitar de este cargo a las ${selectedDirectivos.length} personas seleccionadas? Esta acción no se puede deshacer.` : `¿Estás seguro de que deseas quitar de su cargo a "${confirmAction?.directivo?.person?.fullName}"? Esta acción no se puede deshacer.`}
                            confirmText="Eliminar"
                            variant="danger"
                            onConfirm={handleConfirm}
                            onCancel={() => setConfirmAction(null)}
                        />
                    </div>
                )}
            </div>

            <PersonFormModal
                isOpen={showPersonModal}
                onClose={() => setShowPersonModal(false)}
                onSuccess={(newPerson) => {
                    setPersons(prev => [...prev, newPerson]);
                    setForm(prev => ({ ...prev, personId: newPerson.id.toString() }));
                }}
            />
        </div>
    )
}
