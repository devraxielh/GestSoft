"use client"
import { useState, useEffect } from "react"
import toast from "react-hot-toast"

export default function ConfiguracionesPage() {
    const [companyName, setCompanyName] = useState("GestSoft")
    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(true)
    const [showPass, setShowPass] = useState(false)
    const [uploadingLogo, setUploadingLogo] = useState(false)
    const [currentLogo, setCurrentLogo] = useState("/logo.webp")

    const [smtpForm, setSmtpForm] = useState({
        host: "",
        port: "",
        user: "",
        pass: "",
        from: ""
    })

    const [dbInfo] = useState({
        name: "GestSoft",
        host: "127.0.0.1",
        port: "3307",
        provider: "mysql"
    })

    // Load configuration on mount
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await fetch("/api/configuracion")
                if (res.ok) {
                    const data = await res.json()
                    setCompanyName(data.companyName || "GestSoft")
                    setCurrentLogo(data.logoUrl || "/logo.webp")
                    setSmtpForm({
                        host: data.smtpHost || "",
                        port: data.smtpPort || "",
                        user: data.smtpUser || "",
                        pass: data.smtpPass || "",
                        from: data.smtpFrom || ""
                    })
                }
            } catch (error) {
                console.error("Error loading config:", error)
                toast.error("Error al cargar la configuración")
            } finally {
                setFetching(false)
            }
        }
        fetchConfig()
    }, [])

    const handleSaveConfig = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch("/api/configuracion", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    companyName,
                    smtpHost: smtpForm.host,
                    smtpPort: smtpForm.port,
                    smtpUser: smtpForm.user,
                    smtpPass: smtpForm.pass,
                    smtpFrom: smtpForm.from,
                    logoUrl: currentLogo
                })
            })

            if (res.ok) {
                toast.success("Configuración guardada correctamente")
            } else {
                toast.error("Error al guardar la configuración")
            }
        } catch (error) {
            toast.error("Error de conexión al guardar")
        } finally {
            setLoading(false)
        }
    }

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith("image/")) {
            toast.error("Por favor, suba un archivo de imagen")
            return
        }

        setUploadingLogo(true)
        const formData = new FormData()
        formData.append("file", file)

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData
            })

            const data = await res.json()
            if (res.ok) {
                setCurrentLogo(data.url)
                toast.success("Logo subido. Recuerde guardar los cambios.")
            } else {
                toast.error(data.error || "Error al subir el logo")
            }
        } catch (error) {
            toast.error("Error de conexión al subir el logo")
        } finally {
            setUploadingLogo(false)
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
        <div className="space-y-6 pb-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-800">Configuraciones</h2>
                    <p className="text-gray-500 text-sm mt-1">Administra los parámetros globales del sistema</p>
                </div>
                <button
                    onClick={() => handleSaveConfig()}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors disabled:opacity-50"
                >
                    {loading ? "Guardando..." : "Guardar Todos los Cambios"}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* General Settings (Company Name & Logo) */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs lg:col-span-2">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-50 text-indigo-500">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800">Información General</h3>
                    </div>

                    <div className="mb-8 max-w-md">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre de la Empresa</label>
                        <input
                            type="text"
                            value={companyName}
                            onChange={e => setCompanyName(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 transition-all"
                            placeholder="Ingrese el nombre de la empresa"
                        />
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-8 border-t border-gray-50 pt-8">
                        <div className="relative group">
                            <div className="w-48 h-48 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden p-4">
                                <img
                                    src={currentLogo}
                                    alt="Logo Actual"
                                    className="max-w-full max-h-full object-contain"
                                />
                                {uploadingLogo && (
                                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                                        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 space-y-4 text-center md:text-left">
                            <div>
                                <h4 className="font-medium text-gray-800 mb-1">Logo del Software</h4>
                                <p className="text-sm text-gray-500">Se recomienda una imagen en formato WEBP o PNG con fondo transparente.</p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <label className={`
                                    cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-100 px-5 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-200 transition-colors
                                    ${uploadingLogo ? "opacity-50 pointer-events-none" : ""}
                                `}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    Cambiar Logo
                                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                </label>

                                <button
                                    onClick={() => setCurrentLogo("/logo.webp")}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors"
                                >
                                    Restablecer
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 italic font-mono">Ubicación: {currentLogo}</p>
                        </div>
                    </div>
                </div>

                {/* SMTP Settings */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-50 text-brand-500">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800">Servidor SMTP</h3>
                    </div>

                    <form onSubmit={handleSaveConfig} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Host</label>
                                <input
                                    type="text"
                                    value={smtpForm.host}
                                    onChange={e => setSmtpForm({ ...smtpForm, host: e.target.value })}
                                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 transition-all"
                                    placeholder="smtp.example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Puerto</label>
                                <input
                                    type="text"
                                    value={smtpForm.port}
                                    onChange={e => setSmtpForm({ ...smtpForm, port: e.target.value })}
                                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 transition-all"
                                    placeholder="587"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Usuario</label>
                                <input
                                    type="text"
                                    value={smtpForm.user}
                                    onChange={e => setSmtpForm({ ...smtpForm, user: e.target.value })}
                                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña (SMTP_PASS)</label>
                                <div className="relative">
                                    <input
                                        type={showPass ? "text" : "password"}
                                        value={smtpForm.pass}
                                        onChange={e => setSmtpForm({ ...smtpForm, pass: e.target.value })}
                                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 pr-10 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPass(!showPass)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showPass ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Remitente (From)</label>
                            <input
                                type="text"
                                value={smtpForm.from}
                                onChange={e => setSmtpForm({ ...smtpForm, from: e.target.value })}
                                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 transition-all"
                            />
                        </div>
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 shadow-theme-xs transition-colors disabled:opacity-50"
                            >
                                {loading ? "Guardando..." : "Guardar Cambios SMTP"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Database Info */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 text-amber-500">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800">Base de Datos</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-3 border-b border-gray-50">
                            <span className="text-sm text-gray-500">Nombre</span>
                            <span className="text-sm font-medium text-gray-800">{dbInfo.name}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-gray-50">
                            <span className="text-sm text-gray-500">Host</span>
                            <span className="text-sm font-medium text-gray-800 font-mono">{dbInfo.host}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-gray-50">
                            <span className="text-sm text-gray-500">Puerto</span>
                            <span className="text-sm font-medium text-gray-800 font-mono">{dbInfo.port}</span>
                        </div>
                        <div className="flex justify-between items-center py-3">
                            <span className="text-sm text-gray-500">Motor</span>
                            <span className="text-sm font-medium text-gray-800 uppercase">{dbInfo.provider}</span>
                        </div>

                        <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-100">
                            <p className="text-xs text-amber-700 leading-relaxed">
                                <strong className="block mb-1">Nota importante:</strong>
                                La configuración de la base de datos se lee directamente del archivo de entorno (.env). Para realizar cambios permanentes, modifique los valores en el servidor.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
