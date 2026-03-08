"use client"
import { useState, useEffect, useCallback } from "react"
import toast from "react-hot-toast"
import ConfirmModal from "@/components/ConfirmModal"

interface Role { id: number; name: string }
interface User { id: number; name: string; email: string; active: boolean; roleId: number; role: Role }

export default function UsuariosPage() {
    const [users, setUsers] = useState<User[]>([])
    const [roles, setRoles] = useState<Role[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [form, setForm] = useState({ name: "", email: "", password: "", roleId: "", active: true })
    const [error, setError] = useState("")
    const [searchName, setSearchName] = useState("")
    const [filterRole, setFilterRole] = useState("")
    const [filterStatus, setFilterStatus] = useState("")
    const [selectedUsers, setSelectedUsers] = useState<number[]>([])
    const [confirmAction, setConfirmAction] = useState<{ type: "delete-single" | "delete-bulk"; userId?: number } | null>(null)
    const [deleting, setDeleting] = useState(false)

    const fetchData = useCallback(async () => { const [u, r] = await Promise.all([fetch("/api/usuarios"), fetch("/api/roles")]); setUsers(await u.json()); setRoles(await r.json()); setLoading(false) }, [])
    useEffect(() => { fetchData() }, [fetchData])

    const filteredUsers = users.filter(u => {
        if (searchName && !u.name.toLowerCase().includes(searchName.toLowerCase()) && !u.email.toLowerCase().includes(searchName.toLowerCase())) return false;
        if (filterRole && u.roleId.toString() !== filterRole) return false;
        if (filterStatus) {
            const isActive = filterStatus === "active";
            if (u.active !== isActive) return false;
        }
        return true;
    });

    const hasFilters = searchName || filterRole || filterStatus;
    const clearFilters = () => { setSearchName(""); setFilterRole(""); setFilterStatus(""); }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError("")
        const url = editingUser ? `/api/usuarios/${editingUser.id}` : "/api/usuarios"
        const body: any = { ...form }; if (editingUser && !form.password) delete body.password
        const res = await fetch(url, { method: editingUser ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        if (res.ok) {
            toast.success(editingUser ? "Usuario actualizado" : "Usuario creado", { style: { background: '#F0FDF4', color: '#166534', border: '1px solid #4ADE80' }, iconTheme: { primary: '#22C55E', secondary: '#F0FDF4' } })
            setShowModal(false); setEditingUser(null); setForm({ name: "", email: "", password: "", roleId: "", active: true }); fetchData()
        } else {
            toast.error("Error al guardar el usuario", { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' } })
            setError("Error al guardar el usuario")
        }
    }

    const handleDelete = async (id: number) => {
        const res = await fetch(`/api/usuarios/${id}`, { method: "DELETE" });
        if (res.ok) {
            toast.success("Usuario eliminado", { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' }, iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' } })
            fetchData()
        } else {
            toast.error("Error al eliminar el usuario")
        }
    }

    const handleBulkDelete = async () => {
        setDeleting(true)
        try {
            const res = await fetch('/api/usuarios/bulk-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userIds: selectedUsers }) })
            if (res.ok) {
                toast.success(`Se eliminaron ${selectedUsers.length} usuarios`, { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' }, iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' } })
                setSelectedUsers([]); fetchData()
            } else {
                const errData = await res.json().catch(() => ({}));
                toast.error(errData.error || "Error al eliminar")
            }
        } catch { toast.error("Error de conexión al eliminar") }
        setDeleting(false)
        setConfirmAction(null)
    }

    const handleConfirm = () => {
        if (!confirmAction) return;
        if (confirmAction.type === "delete-single" && confirmAction.userId) {
            handleDelete(confirmAction.userId)
        } else if (confirmAction.type === "delete-bulk") {
            handleBulkDelete()
        }
        if (confirmAction.type !== "delete-bulk") setConfirmAction(null)
    }

    const toggleActive = async (user: User) => {
        const res = await fetch(`/api/usuarios/${user.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...user, active: !user.active }) });
        if (res.ok) {
            toast.success(`Usuario ${!user.active ? "activado" : "desactivado"}`)
            fetchData()
        } else {
            toast.error("Error al cambiar estado")
        }
    }
    const openCreate = () => { setEditingUser(null); setForm({ name: "", email: "", password: "", roleId: roles[0]?.id?.toString() || "", active: true }); setError(""); setShowModal(true) }
    const openEdit = (u: User) => { setEditingUser(u); setForm({ name: u.name, email: u.email, password: "", roleId: u.roleId.toString(), active: u.active }); setError(""); setShowModal(true) }

    const toggleUserSelection = (id: number) => setSelectedUsers(prev => prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id])
    const toggleAllUsers = () => selectedUsers.length === filteredUsers.length ? setSelectedUsers([]) : setSelectedUsers(filteredUsers.map(u => u.id))

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h2 className="text-2xl font-semibold text-gray-800">Usuarios</h2><p className="text-gray-500 text-sm mt-1">Gestión de usuarios del sistema</p></div>
                <div className="flex items-center gap-3">
                    {selectedUsers.length > 0 && (
                        <button onClick={() => setConfirmAction({ type: "delete-bulk" })} disabled={deleting} className="inline-flex items-center gap-2 rounded-lg border border-error-200 bg-error-50 px-4 py-2.5 text-sm font-medium text-error-600 hover:bg-error-100 shadow-theme-xs transition-colors disabled:opacity-50">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Eliminar ({selectedUsers.length})
                        </button>
                    )}
                    <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Nuevo Usuario
                    </button>
                </div>
            </div>
            {loading ? <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div></div> : (
                <div className="space-y-4">
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                <input type="text" value={searchName} onChange={e => setSearchName(e.target.value)} placeholder="Buscar por nombre o correo..." className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-12 pr-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs" />
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs">
                                    <option value="">Todos los roles</option>
                                    {roles.map(r => <option key={r.id} value={r.id.toString()}>{r.name}</option>)}
                                </select>
                                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs">
                                    <option value="">Todos los estados</option>
                                    <option value="active">Activo</option>
                                    <option value="inactive">Inactivo</option>
                                </select>
                                {hasFilters && (
                                    <button onClick={clearFilters} className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50 shadow-theme-xs transition-colors whitespace-nowrap">Limpiar</button>
                                )}
                            </div>
                        </div>
                        {hasFilters && <p className="text-xs text-gray-400 mt-3">{filteredUsers.length} usuario{filteredUsers.length !== 1 ? "s" : ""} encontrado{filteredUsers.length !== 1 ? "s" : ""}</p>}
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs">
                        <div className="overflow-x-auto"><table className="w-full">
                            <thead><tr className="border-b border-gray-100">
                                <th className="px-4 py-4 text-left"><input type="checkbox" checked={filteredUsers.length > 0 && selectedUsers.length === filteredUsers.length} onChange={toggleAllUsers} className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/10" /></th>
                                <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Nombre</th>
                                <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Email</th>
                                <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Rol</th>
                                <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Estado</th>
                                <th className="px-6 py-4 text-right text-theme-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr></thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${selectedUsers.includes(user.id) ? "bg-brand-50/30" : ""}`}>
                                        <td className="px-4 py-4"><input type="checkbox" checked={selectedUsers.includes(user.id)} onChange={() => toggleUserSelection(user.id)} className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/10" /></td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-800">{user.name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                                        <td className="px-6 py-4"><span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-600">{user.role?.name}</span></td>
                                        <td className="px-6 py-4"><button onClick={() => toggleActive(user)} className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${user.active ? "bg-success-50 text-success-600 hover:bg-success-100" : "bg-error-50 text-error-600 hover:bg-error-100"}`}>{user.active ? "● Activo" : "● Inactivo"}</button></td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="inline-flex items-center gap-1">
                                                <button onClick={() => openEdit(user)} title="Editar" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand-600 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                                <button onClick={() => setConfirmAction({ type: "delete-single", userId: user.id })} title="Eliminar" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-error-600 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredUsers.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">{hasFilters ? "No se encontraron usuarios con los filtros aplicados" : "No hay usuarios"}</td></tr>}
                            </tbody>
                        </table></div>
                    </div>
                </div>
            )}
            {showModal && (
                <div className="fixed inset-0 z-[99999] flex items-start pt-[5vh] justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg">
                        <h3 className="text-lg font-semibold text-gray-800 mb-5">{editingUser ? "Editar Usuario" : "Nuevo Usuario"}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && <div className="rounded-lg bg-error-50 border border-error-100 p-3 text-sm text-error-600">{error}</div>}
                            <div><label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs" placeholder="Nombre" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-2">Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs" placeholder="correo@ejemplo.com" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-2">Contraseña {editingUser && <span className="text-gray-400 font-normal">(vacío = sin cambiar)</span>}</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} {...(!editingUser && { required: true })} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs" placeholder="••••••••" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-2">Rol</label><select value={form.roleId} onChange={e => setForm({ ...form, roleId: e.target.value })} required className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs"><option value="">Seleccione un rol</option>{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                            <div className="flex items-center gap-3"><input type="checkbox" id="active" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/10" /><label htmlFor="active" className="text-sm text-gray-700">Activo</label></div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 shadow-theme-xs transition-colors">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <ConfirmModal
                open={!!confirmAction}
                title={confirmAction?.type === "delete-bulk" ? "Eliminar usuarios" : "Eliminar usuario"}
                message={confirmAction?.type === "delete-bulk" ? `¿Estás seguro de que deseas eliminar los ${selectedUsers.length} usuarios seleccionados? Esta acción no se puede deshacer.` : `¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                variant="danger"
                onConfirm={handleConfirm}
                onCancel={() => setConfirmAction(null)}
            />
        </div>
    )
}
