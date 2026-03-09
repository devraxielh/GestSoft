import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Users, FileText, CalendarDays, Award, CheckCircle, ArrowRight, Activity, Plus } from "lucide-react"

export const dynamic = 'force-dynamic'

async function getStats() {
    const [users, persons, events, certificates, assignments, recentAssignments] = await Promise.all([
        prisma.user.count(),
        prisma.person.count(),
        prisma.event.count(),
        prisma.certificate.count(),
        prisma.certificateAssignment.count(),
        prisma.certificateAssignment.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
            include: {
                person: true,
                certificate: { include: { event: true } }
            }
        })
    ])
    return { users, persons, events, certificates, assignments, recentAssignments }
}

export default async function DashboardPage() {
    const stats = await getStats()

    const cards = [
        { label: "Usuarios", value: stats.users, color: "bg-brand-500", shadow: "shadow-brand-500/20", text: "text-brand-600", bgLight: "bg-brand-50", icon: Users },
        { label: "Personas", value: stats.persons, color: "bg-emerald-500", shadow: "shadow-emerald-500/20", text: "text-emerald-600", bgLight: "bg-emerald-50", icon: Users },
        { label: "Eventos", value: stats.events, color: "bg-purple-500", shadow: "shadow-purple-500/20", text: "text-purple-600", bgLight: "bg-purple-50", icon: CalendarDays },
        { label: "Certificados", value: stats.certificates, color: "bg-amber-500", shadow: "shadow-amber-500/20", text: "text-amber-600", bgLight: "bg-amber-50", icon: FileText },
        { label: "Asignaciones", value: stats.assignments, color: "bg-rose-500", shadow: "shadow-rose-500/20", text: "text-rose-600", bgLight: "bg-rose-50", icon: Award },
    ]

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Premium Welcome Hero */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-8 sm:p-10 shadow-xl border border-gray-800">
                <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3">
                    <div className="w-96 h-96 bg-brand-500/20 rounded-full blur-3xl"></div>
                </div>
                <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3">
                    <div className="w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>
                </div>

                <div className="relative z-10 max-w-2xl">
                    <h2 className="text-3xl font-bold text-white mb-3">Panel de Control <span className="text-brand-400">Pro</span></h2>
                    <p className="text-gray-300 text-sm leading-relaxed mb-8">
                        Resumen analítico y control central del sistema de emisión de certificados digitales. Opera, asigna y verifica documentos al instante.
                    </p>

                    <div className="flex flex-wrap gap-4">
                        <Link href="/dashboard/eventos" className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 hover:bg-brand-400 transition-all hover:scale-[1.02]">
                            <Plus className="w-4 h-4" /> Nuevo Evento
                        </Link>
                        <Link href="/dashboard/personas" className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-6 py-2.5 text-sm font-semibold text-white shadow-lg backdrop-blur-sm hover:bg-white/20 transition-all hover:scale-[1.02]">
                            <Users className="w-4 h-4" /> Directorio de Personas
                        </Link>
                    </div>
                </div>
            </div>

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {cards.map((card) => (
                    <div key={card.label} className="group relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                        <div className={`absolute top-0 left-0 w-full h-1 ${card.color} opacity-80 group-hover:opacity-100 transition-opacity`}></div>
                        <div className="flex items-center justify-between mb-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.bgLight} ${card.text} transition-transform group-hover:scale-110`}>
                                <card.icon strokeWidth={2} className="w-6 h-6" />
                            </div>
                            <span className="flex h-2 w-2">
                                <span className={`animate-ping absolute inline-flex h-2 w-2 rounded-full ${card.color} opacity-20`}></span>
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${card.color}`}></span>
                            </span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 tracking-tight">{card.value.toLocaleString()}</p>
                        <p className="text-sm font-medium text-gray-500 mt-1">{card.label}</p>
                    </div>
                ))}
            </div>

            {/* Bottom Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Recent Activity Table */}
                <div className="lg:col-span-2 rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <div className="flex items-center gap-2 text-gray-800">
                            <Activity className="w-5 h-5 text-brand-500" />
                            <h3 className="font-semibold">Actividad Reciente</h3>
                        </div>
                        <Link href="/dashboard/asignaciones" className="text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline flex items-center gap-1">
                            Ver todas <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/30">
                                    <th className="px-6 py-4">Destinatario</th>
                                    <th className="px-6 py-4">Evento</th>
                                    <th className="px-6 py-4">Fecha</th>
                                    <th className="px-6 py-4 text-right">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {stats.recentAssignments.length > 0 ? (
                                    stats.recentAssignments.map((a) => (
                                        <tr key={a.id} className="hover:bg-gray-50/80 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold uppercase shrink-0">
                                                        {a.person.fullName.substring(0, 2)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600 transition-colors">{a.person.fullName}</p>
                                                        <p className="text-xs text-gray-500 font-mono">{a.person.identification}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-gray-700 line-clamp-1">{a.certificate.event?.name}</p>
                                                <p className="text-xs text-gray-500">{a.certificate.participationType}</p>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                                {new Date(a.createdAt).toLocaleDateString("es-CO", { day: 'numeric', month: 'short' })}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-100">
                                                    <CheckCircle className="w-3.5 h-3.5" /> Asignado
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400">
                                            No hay actividad reciente. Comienza asignando un certificado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Actions / Helpers */}
                <div className="space-y-6">
                    <div className="rounded-2xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 shadow-sm relative overflow-hidden">
                        <div className="absolute -right-6 -top-6 text-emerald-200/50">
                            <CheckCircle className="w-32 h-32" />
                        </div>
                        <div className="relative z-10">
                            <h3 className="font-bold text-emerald-900 mb-2">Portal de Verificación</h3>
                            <p className="text-sm text-emerald-700/80 mb-5 leading-relaxed">
                                Accede al validador público de certificados utilizando la cadena de cifrado SHA-256 única por asistente.
                            </p>
                            <Link href="/verificacion" target="_blank" className="inline-flex items-center justify-center w-full gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 shadow-sm border border-emerald-100 hover:bg-emerald-50 hover:border-emerald-200 transition-all">
                                Ir al Validador <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                        <h3 className="font-semibold text-gray-800 mb-4 pb-4 border-b border-gray-100">Flujo de Trabajo Ideal</h3>
                        <ol className="relative border-l border-gray-200 ml-3 space-y-6">
                            <li className="pl-6 relative">
                                <span className="absolute w-6 h-6 bg-brand-50 rounded-full -left-3 flex items-center justify-center ring-4 ring-white">
                                    <span className="w-2 h-2 bg-brand-500 rounded-full"></span>
                                </span>
                                <h4 className="text-sm font-semibold text-gray-900 mb-0.5">1. Crea el Evento</h4>
                                <p className="text-xs text-gray-500">Registra fechas y el tipo de evento académico.</p>
                            </li>
                            <li className="pl-6 relative">
                                <span className="absolute w-6 h-6 bg-purple-50 rounded-full -left-3 flex items-center justify-center ring-4 ring-white">
                                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                </span>
                                <h4 className="text-sm font-semibold text-gray-900 mb-0.5">2. Diseña Certificados</h4>
                                <p className="text-xs text-gray-500">Asigna plantillas específicas a cada evento.</p>
                            </li>
                            <li className="pl-6 relative">
                                <span className="absolute w-6 h-6 bg-emerald-50 rounded-full -left-3 flex items-center justify-center ring-4 ring-white">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                </span>
                                <h4 className="text-sm font-semibold text-gray-900 mb-0.5">3. Carga Masiva</h4>
                                <p className="text-xs text-gray-500">Sube un Excel con los participantes y asigna masivamente.</p>
                            </li>
                        </ol>
                    </div>
                </div>

            </div>
        </div>
    )
}
