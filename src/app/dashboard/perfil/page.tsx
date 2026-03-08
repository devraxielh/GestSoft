"use client"
import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import { useSession } from "next-auth/react"

export default function ProfilePage() {
    const { data: session, update } = useSession()
    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(true)
    const [uploadingPhoto, setUploadingPhoto] = useState(false)

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        image: "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    })

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch("/api/perfil")
                if (res.ok) {
                    const data = await res.json()
                    setFormData(prev => ({
                        ...prev,
                        name: data.name || "",
                        email: data.email || "",
                        image: data.image || ""
                    }))
                } else {
                    const text = await res.text()
                    console.error("Profile load failed. Status:", res.status, "Response text:", text)
                    try {
                        const errorData = JSON.parse(text)
                        toast.error(errorData.error || `Error ${res.status} al cargar el perfil`)
                    } catch (e) {
                        toast.error(`Error ${res.status}: Respuesta del servidor no es JSON`)
                    }
                }
            } catch (error) {
                console.error("Error loading profile:", error)
                toast.error("Error de conexión al cargar el perfil")
            } finally {
                setFetching(false)
            }
        }
        fetchProfile()
    }, [])

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith("image/")) {
            toast.error("Por favor, suba un archivo de imagen")
            return
        }

        setUploadingPhoto(true)
        const uploadData = new FormData()
        uploadData.append("file", file)

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: uploadData
            })

            const data = await res.json()
            if (res.ok) {
                setFormData(prev => ({ ...prev, image: data.url }))
                toast.success("Foto subida correctamente")
            } else {
                toast.error(data.error || "Error al subir la foto")
            }
        } catch (error) {
            toast.error("Error de conexión al subir la foto")
        } finally {
            setUploadingPhoto(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
            toast.error("Las nuevas contraseñas no coinciden")
            return
        }

        setLoading(true)
        try {
            const updateBody: any = {
                name: formData.name,
                email: formData.email,
                image: formData.image
            }

            if (formData.newPassword) {
                updateBody.password = formData.newPassword
            }

            const res = await fetch("/api/perfil", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updateBody)
            })

            if (res.ok) {
                const updatedUser = await res.json()
                // Update next-auth session
                await update({
                    ...session,
                    user: {
                        ...session?.user,
                        name: updatedUser.name,
                        email: updatedUser.email,
                        image: updatedUser.image
                    }
                })

                setFormData(prev => ({
                    ...prev,
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: ""
                }))

                toast.success("Perfil actualizado correctamente")
            } else {
                const errorData = await res.json()
                console.error("Profile update failed:", errorData)
                toast.error(errorData.details || errorData.error || "Error al actualizar el perfil")
            }
        } catch (error) {
            console.error("Error updating profile:", error)
            toast.error("Error de conexión: " + (error instanceof Error ? error.message : String(error)))
        } finally {
            setLoading(false)
        }
    }

    if (fetching) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div>
                <h2 className="text-2xl font-semibold text-gray-800">Mi Perfil</h2>
                <p className="text-gray-500 text-sm mt-1">Administra tu información personal y seguridad</p>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile Picture Card */}
                <div className="md:col-span-1">
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs flex flex-col items-center text-center">
                        <div className="relative mb-4 group">
                            <div className="w-32 h-32 rounded-full border-4 border-gray-50 bg-gray-100 flex items-center justify-center overflow-hidden shadow-inner">
                                {formData.image ? (
                                    <img src={formData.image} alt="Perfil" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-3xl font-bold text-gray-300">
                                        {formData.name.charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-brand-500 border-4 border-white flex items-center justify-center text-white cursor-pointer hover:bg-brand-600 transition-colors shadow-theme-md">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                            </label>
                            {uploadingPhoto && (
                                <div className="absolute inset-0 rounded-full bg-white/60 flex items-center justify-center">
                                    <div className="w-6 h-6 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>
                        <h3 className="font-semibold text-gray-800">{formData.name || "Usuario"}</h3>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">{(session?.user as any)?.role || "Personal"}</p>
                    </div>
                </div>

                {/* Profile Data Form */}
                <div className="md:col-span-2 space-y-6">
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-50 text-brand-500">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800">Datos Personales</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Correo Electrónico</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 text-amber-500">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800">Cambiar Contraseña</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Nueva Contraseña</label>
                                    <input
                                        type="password"
                                        placeholder="Dejar en blanco para no cambiar"
                                        value={formData.newPassword}
                                        onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar Nueva Contraseña</label>
                                    <input
                                        type="password"
                                        value={formData.confirmPassword}
                                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-8 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    Guardando...
                                </>
                            ) : (
                                "Guardar Todos los Cambios"
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}
