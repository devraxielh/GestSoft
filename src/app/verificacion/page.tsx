"use client"
import { useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import { generateVerificationCode } from "@/lib/hash"

interface Event { id: number; name: string }
interface Certificate { id: number; participationType: string; templateHtml: string; event: Event; issueDate: string }
interface Person { id: number; fullName: string; identification: string }
interface Assignment { id: number; certificate: Certificate; person: Person; participationDetails?: string }
interface ThesisResult {
    id: number; title: string; level: string; status: string;
    defenseDate?: string; grade?: number; program?: { name: string }
    students: { person: Person }[]; advisors: { person: Person }[]; juries: { person: Person }[]
}

export default function VerificacionPage() {
    const [code, setCode] = useState("")
    const [assignment, setAssignment] = useState<Assignment | null>(null)
    const [thesis, setThesis] = useState<ThesisResult | null>(null)
    const [loading, setLoading] = useState(false)
    const [searched, setSearched] = useState(false)
    const [previewHtml, setPreviewHtml] = useState("")
    const [showPreview, setShowPreview] = useState(false)

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!code.trim()) return
        setLoading(true)
        setSearched(true)
        setAssignment(null)
        setThesis(null)
        try {
            const res = await fetch(`/api/verificacion?code=${encodeURIComponent(code.trim())}`)
            if (res.ok) {
                const data = await res.json()
                if (data.assignment) {
                    setAssignment(data.assignment)
                    toast.success("Certificado verificado correctamente")
                } else if (data.thesis) {
                    setThesis(data.thesis)
                    toast.success("Trabajo de grado verificado correctamente")
                }
            } else {
                toast.error("Código de verificación no válido o certificado no encontrado")
            }
        } catch {
            toast.error("Error de conexión al verificar el código")
        }
        setLoading(false)
    }

    const viewCert = (a: Assignment) => {
        setPreviewHtml(
            a.certificate.templateHtml
                .replace(/\{\{NOMBRE_COMPLETO\}\}/g, a.person.fullName)
                .replace(/\{\{IDENTIFICACION\}\}/g, a.person.identification)
                .replace(/\{\{TIPO_PARTICIPACION\}\}/g, a.certificate.participationType)
                .replace(/\{\{NOMBRE_EVENTO\}\}/g, a.certificate.event?.name || "")
                .replace(/\{\{FECHA_EXPEDICION\}\}/g, new Date(a.certificate.issueDate).toLocaleDateString("es-CO"))
                .replace(/\{\{DETALLES_PARTICIPACION\}\}/g, a.participationDetails || "")
                .replace(/\{\{CODIGO_VERIFICACION\}\}/g, code)
        )
        setShowPreview(true)
    }

    const downloadPDF = async () => {
        const { default: html2canvas } = await import("html2canvas")
        const { jsPDF } = await import("jspdf")
        const el = document.getElementById("cert-preview-public")
        if (!el) return
        const tId = toast.loading("Generando PDF...")
        try {
            const canvas = await html2canvas(el, { scale: 2, useCORS: true })
            const img = canvas.toDataURL("image/png")
            const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width / 2, canvas.height / 2] })
            pdf.addImage(img, "PNG", 0, 0, canvas.width / 2, canvas.height / 2)
            pdf.save("certificado_verificado.pdf")
            toast.success("PDF descargado", { id: tId })
        } catch {
            toast.error("Error al generar PDF", { id: tId })
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Toaster position="top-right" containerStyle={{ zIndex: 9999999 }} />

            <header className="bg-white border-b border-gray-200 shadow-theme-xs">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-20 flex items-center justify-center ">
                            <img src="/logo.webp" alt="Certificados Online Logo" className="w-40 mb-1" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-800">Verificador de Certificados</h1>
                            <p className="text-xs text-gray-400">Valida la autenticidad de un documento</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <a href="/consulta" className="text-xs text-gray-400 hover:text-brand-500 transition-colors">
                            <div className="flex items-center gap-2">
                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <span className="flex-1">Certificados</span>
                            </div>
                        </a>
                    </div>
                </div>
            </header>

            <main className="flex-grow w-full max-w-4xl mx-auto px-6 py-10">
                <div className="max-w-xl mx-auto mb-10">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-success-100 shadow-theme-xs">
                            <svg className="w-8 h-8 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Validación Oficial</h2>
                        <p className="text-sm text-gray-500">Ingresa el código alfanumérico que aparece en la parte inferior del certificado para verificar su autenticidad.</p>
                    </div>

                    <form onSubmit={handleSearch} className="flex gap-3">
                        <div className="flex-1 relative">
                            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg>
                            <input
                                type="text"
                                value={code}
                                onChange={e => setCode(e.target.value.toUpperCase())}
                                placeholder="Ej: A82F3B91C..."
                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-800 placeholder-gray-400 text-sm font-mono focus:outline-none focus:border-success-300 focus:ring-3 focus:ring-success-500/10 shadow-theme-xs transition-all uppercase"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-7 py-3 rounded-xl bg-gray-800 text-white text-sm font-semibold hover:bg-gray-900 transition-colors shadow-theme-xs disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Verificar"}
                        </button>
                    </form>
                </div>

                {searched && !loading && assignment && (
                    <div className="max-w-2xl mx-auto rounded-2xl border border-success-200 bg-success-50/30 shadow-theme-sm overflow-hidden animate-fade-in-up">
                        <div className="bg-success-50 px-6 py-4 border-b border-success-100 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-success-700 font-semibold">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Certificado Auténtico
                            </div>
                            <span className="font-mono text-xs text-success-600 bg-success-100 px-2 py-1 rounded border border-success-200">{code}</span>
                        </div>

                        <div className="p-6 bg-white flex flex-col gap-4">
                            <div>
                                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Otorgado a</p>
                                <p className="text-lg font-semibold text-gray-800">{assignment.person.fullName}</p>
                                <p className="text-sm text-gray-500 font-mono mt-0.5">ID: {assignment.person.identification}</p>
                            </div>

                            <div className="h-px bg-gray-100 w-full" />

                            <div>
                                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Evento</p>
                                <p className="text-base font-medium text-gray-800">{assignment.certificate.event?.name}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Tipo de Participación</p>
                                    <span className="inline-flex rounded-full bg-brand-50 text-brand-600 px-2.5 py-0.5 text-xs font-medium">
                                        {assignment.certificate.participationType}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Fecha de Expedición</p>
                                    <p className="text-sm text-gray-700">{new Date(assignment.certificate.issueDate).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}</p>
                                </div>
                            </div>

                            {assignment.participationDetails && (
                                <div className="mt-1">
                                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Detalles Adicionales</p>
                                    <p className="text-sm text-gray-600 italic">{assignment.participationDetails}</p>
                                </div>
                            )}

                            <div className="mt-5 pt-5 border-t border-gray-100 flex gap-3">
                                <button
                                    onClick={() => viewCert(assignment)}
                                    className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors"
                                >
                                    Ver Documento Digital
                                </button>
                                <button
                                    onClick={() => { viewCert(assignment); setTimeout(downloadPDF, 500) }}
                                    className="flex-1 rounded-lg bg-gray-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-900 shadow-theme-xs transition-colors"
                                >
                                    ⬇ Descargar Copia
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* === RESULTADO: TRABAJO DE GRADO === */}
                {searched && !loading && thesis && (
                    <div className="max-w-2xl mx-auto rounded-2xl border border-success-200 bg-success-50/30 shadow-theme-sm overflow-hidden animate-fade-in-up">
                        <div className="bg-success-50 px-6 py-4 border-b border-success-100 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-success-700 font-semibold">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Trabajo de Grado Auténtico
                                <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${thesis.status === 'Terminada' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{thesis.status}</span>
                            </div>
                            <span className="font-mono text-xs text-success-600 bg-success-100 px-2 py-1 rounded border border-success-200">{code}</span>
                        </div>

                        <div className="p-6 bg-white flex flex-col gap-4">
                            <div>
                                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Título</p>
                                <p className="text-lg font-semibold text-gray-800">{thesis.title}</p>
                            </div>

                            <div className="h-px bg-gray-100 w-full" />

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Nivel</p>
                                    <span className="inline-flex rounded-full bg-brand-50 text-brand-600 px-2.5 py-0.5 text-xs font-medium">{thesis.level}</span>
                                </div>
                                {thesis.program && (
                                    <div>
                                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Programa</p>
                                        <p className="text-sm text-gray-700">{thesis.program.name}</p>
                                    </div>
                                )}
                                {thesis.defenseDate && (
                                    <div>
                                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Fecha de Sustentación</p>
                                        <p className="text-sm text-gray-700">{new Date(thesis.defenseDate).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}</p>
                                    </div>
                                )}
                                {thesis.grade && (
                                    <div>
                                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Nota Final</p>
                                        <p className="text-sm font-semibold text-gray-800">{thesis.grade}</p>
                                    </div>
                                )}
                            </div>

                            {thesis.students.length > 0 && (
                                <div>
                                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">Estudiantes</p>
                                    {thesis.students.map(s => (
                                        <p key={s.person.id} className="text-sm text-gray-700">{s.person.fullName} <span className="text-gray-400 font-mono text-xs">· {s.person.identification}</span></p>
                                    ))}
                                </div>
                            )}
                            {thesis.advisors.length > 0 && (
                                <div>
                                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">Asesores</p>
                                    {thesis.advisors.map(a => (
                                        <p key={a.person.id} className="text-sm text-gray-700">{a.person.fullName} <span className="text-gray-400 font-mono text-xs">· {a.person.identification}</span></p>
                                    ))}
                                </div>
                            )}
                            {thesis.juries.length > 0 && (
                                <div>
                                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">Jurados</p>
                                    {thesis.juries.map(j => (
                                        <p key={j.person.id} className="text-sm text-gray-700">{j.person.fullName} <span className="text-gray-400 font-mono text-xs">· {j.person.identification}</span></p>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {searched && !loading && !assignment && !thesis && (
                    <div className="max-w-xl mx-auto text-center py-10 rounded-2xl border border-error-200 bg-error-50/50 shadow-theme-xs animate-fade-in-up">
                        <svg className="w-12 h-12 text-error-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        <h3 className="text-lg font-semibold text-error-800 mb-2">Código Inválido</h3>
                        <p className="text-sm text-error-600 max-w-sm mx-auto">No se ha encontrado ningún certificado auténtico asociado a este código de verificación. Verifica que lo hayas escrito correctamente.</p>
                    </div>
                )}

                {!searched && (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 rounded-2xl bg-white border border-gray-200 shadow-theme-xs flex items-center justify-center mx-auto mb-5">
                            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-600 mb-2">Sistema de validación</h3>
                        <p className="text-sm text-gray-400 max-w-sm mx-auto">Los certificados emitidos por la plataforma cuentan con un código SHA-256 único e inmutable.</p>
                    </div>
                )}
            </main>

            {showPreview && (
                <div className="fixed inset-0 z-[99999] flex items-start pt-[5vh] justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg max-h-[90vh] overflow-auto">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-semibold text-gray-800">Vista Previa del Documento</h3>
                            <div className="flex items-center gap-2">
                                <button onClick={downloadPDF} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 shadow-theme-xs transition-colors">
                                    ⬇ Descargar PDF
                                </button>
                                <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">✕</button>
                            </div>
                        </div>
                        <div id="cert-preview-public" className="flex justify-center bg-gray-50 p-6 rounded-xl border border-gray-200 overflow-auto">
                            <div
                                style={{ transform: "scale(0.8)", transformOrigin: "top center", width: '800px', height: '600px' }}
                                dangerouslySetInnerHTML={{ __html: previewHtml }}
                                className="shadow-theme-md"
                            />
                        </div>
                    </div>
                </div>
            )}

            <footer className="border-t border-gray-200 bg-white">
                <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between text-xs text-gray-400">
                    <p>Tecnología de Certificados Seguros</p>
                </div>
            </footer>
        </div>
    )
}
