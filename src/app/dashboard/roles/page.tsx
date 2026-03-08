"use client"

import { useState, useEffect, useCallback } from "react"
import toast from "react-hot-toast"
import ConfirmModal from "@/components/ConfirmModal"

interface Permission { id: number; name: string; description?: string }
interface Role { id: number; name: string; _count?: { users: number }; permissions?: Permission[] }
interface RoleUser { id: number; name: string; email: string; active: boolean; roleId: number }

export default function RolesPage() {
    const [roles, setRoles] = useState<Role[]>([])
    const [permissionsList, setPermissionsList] = useState<Permission[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingRole, setEditingRole] = useState<Role | null>(null)
    const [name, setName] = useState("")
    const [selectedPermissions, setSelectedPermissions] = useState<number[]>([])
    const [error, setError] = useState("")
    const [searchName, setSearchName] = useState("")
    const [selectedRoles, setSelectedRoles] = useState<number[]>([])
    const [confirmAction, setConfirmAction] = useState<{ type: "delete-single" | "delete-bulk"; roleId?: number } | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [showViewerModal, setShowViewerModal] = useState(false)
    const [viewerRole, setViewerRole] = useState<Role | null>(null)
    const [viewerUsers, setViewerUsers] = useState<RoleUser[]>([])
    const [viewerLoading, setViewerLoading] = useState(false)
    const [viewerSearch, setViewerSearch] = useState("")

    const fetchRoles = useCallback(async () => {
        const [resRoles, resPerms] = await Promise.all([fetch("/api/roles"), fetch("/api/permissions")])
        if (resRoles.ok) setRoles(await resRoles.json())
        if (resPerms.ok) setPermissionsList(await resPerms.json())
        setLoading(false)
    }, [])
    useEffect(() => { fetchRoles() }, [fetchRoles])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError("")
        const url = editingRole ? `/api/roles/${editingRole.id}` : "/api/roles"
        const res = await fetch(url, {
            method: editingRole ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, permissionIds: selectedPermissions })
        })
        if (res.ok) {
            toast.success(editingRole ? "Rol actualizado" : "Rol creado", { style: { background: '#F0FDF4', color: '#166534', border: '1px solid #4ADE80' }, iconTheme: { primary: '#22C55E', secondary: '#F0FDF4' } })
            setShowModal(false); setEditingRole(null); setName(""); setSelectedPermissions([]); fetchRoles()
        } else {
            toast.error("Error al guardar el rol", { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' } })
            setError("Error al guardar el rol")
        }
    }

    const handleDelete = async (id: number) => {
        const res = await fetch(`/api/roles/${id}`, { method: "DELETE" });
        if (res.ok) {
            toast.success("Rol eliminado", { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' }, iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' } })
            fetchRoles()
        } else {
            toast.error("Error al eliminar el rol")
        }
    }

    const handleBulkDelete = async () => {
        setDeleting(true)
        try {
            const res = await fetch('/api/roles/bulk-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roleIds: selectedRoles }) })
            if (res.ok) {
                toast.success(`Se eliminaron ${selectedRoles.length} roles`, { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' }, iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' } })
                setSelectedRoles([]); fetchRoles()
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
        if (confirmAction.type === "delete-single" && confirmAction.roleId) {
            handleDelete(confirmAction.roleId)
        } else if (confirmAction.type === "delete-bulk") {
            handleBulkDelete()
        }
        if (confirmAction.type !== "delete-bulk") setConfirmAction(null)
    }

    const openCreate = () => { setEditingRole(null); setName(""); setSelectedPermissions([]); setError(""); setShowModal(true) }
    const openEdit = (role: Role) => {
        setEditingRole(role)
        setName(role.name)
        setSelectedPermissions(role.permissions?.map(p => p.id) || [])
        setError("")
        setShowModal(true)
    }

    const togglePermission = (id: number) => {
        setSelectedPermissions(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
    }

    const toggleRoleSelection = (id: number) => setSelectedRoles(prev => prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id])
    const toggleAllRoles = () => selectedRoles.length === filteredRoles.length ? setSelectedRoles([]) : setSelectedRoles(filteredRoles.map(r => r.id))

    const filteredRoles = roles.filter(r => {
        if (searchName && !r.name.toLowerCase().includes(searchName.toLowerCase())) return false
        return true
    })

    const openViewerModal = async (role: Role) => {
        setViewerRole(role); setViewerSearch(""); setViewerLoading(true); setShowViewerModal(true); setViewerUsers([])
        try {
            const res = await fetch("/api/usuarios")
            const all: RoleUser[] = await res.json().catch(() => [])
            setViewerUsers(all.filter(u => u.roleId === role.id))
        } catch { toast.error("Error cargando usuarios") }
        setViewerLoading(false)
    }
    const filteredViewerUsers = viewerUsers.filter(u => {
        if (!viewerSearch) return true
        const q = viewerSearch.toLowerCase()
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h2 className="text-2xl font-semibold text-gray-800">Roles</h2><p className="text-gray-500 text-sm mt-1">Gestión de roles del sistema</p></div>
                <div className="flex items-center gap-3">
                    {selectedRoles.length > 0 && (
                        <button onClick={() => setConfirmAction({ type: "delete-bulk" })} disabled={deleting} className="inline-flex items-center gap-2 rounded-lg border border-error-200 bg-error-50 px-4 py-2.5 text-sm font-medium text-error-600 hover:bg-error-100 shadow-theme-xs transition-colors disabled:opacity-50">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Eliminar ({selectedRoles.length})
                        </button>
                    )}
                    <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Nuevo Rol
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div></div>
            ) : (
                <div className="space-y-4">
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                <input type="text" value={searchName} onChange={e => setSearchName(e.target.value)} placeholder="Buscar por nombre del rol..." className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-12 pr-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs" />
                            </div>
                            {searchName && (
                                <button onClick={() => setSearchName("")} className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50 shadow-theme-xs transition-colors whitespace-nowrap">Limpiar</button>
                            )}
                        </div>
                        {searchName && <p className="text-xs text-gray-400 mt-3">{filteredRoles.length} rol{filteredRoles.length !== 1 ? "es" : ""} encontrado{filteredRoles.length !== 1 ? "s" : ""}</p>}
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead><tr className="border-b border-gray-100">
                                    <th className="px-4 py-4 text-left"><input type="checkbox" checked={filteredRoles.length > 0 && selectedRoles.length === filteredRoles.length} onChange={toggleAllRoles} className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/10" /></th>
                                    <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Nombre</th>
                                    <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Usuarios</th>
                                    <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Permisos</th>
                                    <th className="px-6 py-4 text-right text-theme-xs font-medium text-gray-500 uppercase">Acciones</th>
                                </tr></thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredRoles.map((role) => (
                                        <tr key={role.id} className={`hover:bg-gray-50 transition-colors ${selectedRoles.includes(role.id) ? "bg-brand-50/30" : ""}`}>
                                            <td className="px-4 py-4"><input type="checkbox" checked={selectedRoles.includes(role.id)} onChange={() => toggleRoleSelection(role.id)} className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/10" /></td>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-800">{role.name}</td>
                                            <td className="px-6 py-4"><button onClick={() => openViewerModal(role)} className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-600 hover:bg-brand-100 transition-colors cursor-pointer">{role._count?.users || 0} usuario{(role._count?.users || 0) !== 1 ? "s" : ""}</button></td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {role.permissions && role.permissions.length > 0 ? (
                                                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                                                            {role.permissions.length} permiso(s)
                                                        </span>
                                                    ) : <span className="text-xs text-gray-400">Ninguno</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="inline-flex items-center gap-1">
                                                    <button onClick={() => openEdit(role)} title="Editar" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand-600 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                                    <button onClick={() => setConfirmAction({ type: "delete-single", roleId: role.id })} title="Eliminar" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-error-600 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredRoles.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">{searchName ? "No se encontraron roles con ese nombre" : "No hay roles registrados"}</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-[99999] flex items-start pt-[5vh] justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg">
                        <h3 className="text-lg font-semibold text-gray-800 mb-5">{editingRole ? "Editar Rol" : "Nuevo Rol"}</h3>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && <div className="rounded-lg bg-error-50 border border-error-100 p-3 text-sm text-error-600">{error}</div>}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del rol</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs" placeholder="Nombre del rol" />
                            </div>

                            {permissionsList.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-3">Permisos Asignados</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2">
                                        {Object.entries(
                                            permissionsList.reduce((acc, perm) => {
                                                const parts = perm.name.split('_');
                                                const resource = parts.slice(1).join('_') || 'others';
                                                if (!acc[resource]) acc[resource] = [];
                                                acc[resource].push(perm);
                                                return acc;
                                            }, {} as Record<string, Permission[]>)
                                        ).map(([resource, perms]) => {
                                            const resNames: Record<string, string> = { user: "Usuarios", role: "Roles", faculty: "Facultades", program: "Programas", event: "Eventos", certificate: "Certificados", person: "Personas", assignment: "Asignaciones" };
                                            const actNames: Record<string, string> = { create: "Crear", read: "Ver", update: "Editar", delete: "Eliminar" };

                                            const toggleAllResource = (e: React.ChangeEvent<HTMLInputElement>) => {
                                                const resIds = perms.map(p => p.id);
                                                if (e.target.checked) setSelectedPermissions(prev => Array.from(new Set([...prev, ...resIds])));
                                                else setSelectedPermissions(prev => prev.filter(id => !resIds.includes(id)));
                                            };
                                            const isAllSelected = perms.every(p => selectedPermissions.includes(p.id));
                                            const isSomeSelected = perms.some(p => selectedPermissions.includes(p.id)) && !isAllSelected;

                                            return (
                                                <div key={resource} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                                                    <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                                                        <h4 className="text-sm font-semibold text-gray-800 capitalize">
                                                            {resNames[resource] || resource}
                                                        </h4>
                                                        <input
                                                            type="checkbox"
                                                            checked={isAllSelected}
                                                            ref={el => { if (el) el.indeterminate = isSomeSelected }}
                                                            onChange={toggleAllResource}
                                                            className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {perms.map(perm => {
                                                            const action = perm.name.split('_')[0];
                                                            return (
                                                                <label key={perm.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded-md cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedPermissions.includes(perm.id)}
                                                                        onChange={() => togglePermission(perm.id)}
                                                                        className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
                                                                    />
                                                                    <span className="text-sm text-gray-700">{actNames[action] || action}</span>
                                                                </label>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

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
                title={confirmAction?.type === "delete-bulk" ? "Eliminar roles" : "Eliminar rol"}
                message={confirmAction?.type === "delete-bulk" ? `¿Estás seguro de que deseas eliminar los ${selectedRoles.length} roles seleccionados? Esta acción no se puede deshacer.` : `¿Estás seguro de eliminar este rol? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                variant="danger"
                onConfirm={handleConfirm}
                onCancel={() => setConfirmAction(null)}
            />

            {/* Viewer Modal */}
            {showViewerModal && viewerRole && (
                <div className="fixed inset-0 z-[99999] flex items-start pt-[5vh] justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-theme-lg max-h-[85vh] flex flex-col">
                        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800">Usuarios del Rol</h3>
                                    <p className="text-sm text-gray-500 mt-0.5">Rol: <span className="font-medium text-brand-600">{viewerRole.name}</span></p>
                                </div>
                                <button onClick={() => setShowViewerModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">✕</button>
                            </div>
                            <input type="text" placeholder="Buscar por nombre o correo..." value={viewerSearch} onChange={e => setViewerSearch(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs" />
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            {viewerLoading ? (
                                <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div></div>
                            ) : filteredViewerUsers.length === 0 ? (
                                <div className="text-center py-12 text-gray-400 text-sm">{viewerSearch ? "No se encontraron usuarios" : "No hay usuarios asignados a este rol"}</div>
                            ) : (
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-100"><tr className="text-left text-xs font-medium text-gray-500 uppercase">
                                        <th className="px-4 py-3">Nombre</th>
                                        <th className="px-4 py-3">Email</th>
                                        <th className="px-4 py-3">Estado</th>
                                    </tr></thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredViewerUsers.map(u => (
                                            <tr key={u.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm font-medium text-gray-800">{u.name}</td>
                                                <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                                                <td className="px-4 py-3"><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${u.active ? "bg-success-50 text-success-600" : "bg-error-50 text-error-600"}`}>{u.active ? "● Activo" : "● Inactivo"}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center">
                            <span className="text-xs text-gray-400">{filteredViewerUsers.length} usuario{filteredViewerUsers.length !== 1 ? "s" : ""}</span>
                            <button onClick={() => setShowViewerModal(false)} className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
