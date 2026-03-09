import { useState, useEffect } from "react"
import toast from "react-hot-toast"

interface Person {
    id: number
    fullName: string
    identification: string
}

interface SedeHierarchy {
    id: number
    name: string
    rector: Person | null
    facultades: {
        id: number
        name: string
        dean: Person | null
        programs: {
            id: number
            name: string
            director: Person | null
            _count: { docentes: number }
        }[]
    }[]
    oficinas: {
        id: number
        name: string
        directivos: {
            id: number
            person: Person
            cargo: string
        }[]
    }[]
}

interface Props {
    isOpen: boolean
    onClose: () => void
    sedeId?: number | null
}

export default function HierarchyModal({ isOpen, onClose, sedeId }: Props) {
    const [data, setData] = useState<SedeHierarchy[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (isOpen) {
            fetchHierarchy()
        }
    }, [isOpen, sedeId])

    const fetchHierarchy = async () => {
        setLoading(true)
        try {
            const url = sedeId ? `/api/sedes/jerarquia?id=${sedeId}` : "/api/sedes/jerarquia"
            const res = await fetch(url)
            if (res.ok) {
                const result = await res.json()
                setData(Array.isArray(result) ? result : [result])
            } else {
                toast.error("Error al cargar la jerarquía")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error de conexión")
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-6xl rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-semibold text-gray-800">Directorio y Jerarquía Institucional</h2>
                        <p className="text-gray-500 text-sm mt-1">Estructura completa de sedes, facultades, programas y oficinas</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto rounded-xl border border-gray-100 bg-gray-50/50 p-6 custom-scrollbar" id="hierarchy-content">
                    {loading && data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 pointer-events-none">
                            <div className="w-12 h-12 border-4 border-brand-100 border-t-brand-500 rounded-full animate-spin mb-4"></div>
                            <p className="text-gray-500 font-medium">Construyendo directorio...</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {data.map(sede => (
                                <div key={sede.id} className="bg-white rounded-2xl border border-gray-200 shadow-theme-sm overflow-hidden">
                                    {/* Sede Header */}
                                    <div className="bg-brand-50/50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center text-white shadow-brand-500/20 shadow-lg">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 uppercase tracking-tight">{sede.name}</h3>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs font-semibold text-brand-600 bg-brand-100/50 px-2 py-0.5 rounded-full">Rectoresía</span>
                                                    <span className="text-sm font-medium text-gray-700">{sede.rector?.fullName || "Sin rector asignado"}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {/* Facultades Column */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                                                <svg className="w-5 h-5 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                                <h4 className="font-bold text-gray-800 uppercase text-xs tracking-wider">Facultades Académicas</h4>
                                            </div>

                                            <div className="space-y-4">
                                                {sede.facultades.map(fac => (
                                                    <div key={fac.id} className="border-l-2 border-gray-100 pl-4 space-y-3">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-gray-800">{fac.name}</span>
                                                            <span className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                                                                <span className="font-semibold text-secondary-600">DECANO:</span> {fac.dean?.fullName || "No asignado"}
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-1 gap-3 ml-2">
                                                            {fac.programs.map(prog => (
                                                                <div key={prog.id} className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-xs font-bold text-gray-700">{prog.name}</span>
                                                                        <span className="text-[10px] text-gray-500 font-medium uppercase mt-0.5">DIRECTOR: {prog.director?.fullName || "No asignado"}</span>
                                                                    </div>

                                                                    {prog._count.docentes > 0 && (
                                                                        <div className="mt-2 flex items-center gap-1.5">
                                                                            <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100 flex items-center gap-1">
                                                                                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                                                                {prog._count.docentes} {prog._count.docentes === 1 ? 'Docente' : 'Docentes'}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                                {sede.facultades.length === 0 && <p className="text-center text-xs text-gray-400 py-4 italic">No se encontraron facultades</p>}
                                            </div>
                                        </div>

                                        {/* Oficinas Column */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                                                <svg className="w-5 h-5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                <h4 className="font-bold text-gray-800 uppercase text-xs tracking-wider">Oficinas y Dependencias</h4>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {sede.oficinas.map(oficina => (
                                                    <div key={oficina.id} className="p-4 rounded-2xl bg-gray-50/50 border border-gray-100 hover:border-brand-100 hover:bg-white transition-all group">
                                                        <h5 className="text-xs font-bold text-gray-800 mb-2 border-b border-gray-100 pb-1 group-hover:text-brand-600 transition-colors uppercase tracking-tight">{oficina.name}</h5>
                                                        <div className="space-y-1.5">
                                                            {oficina.directivos.map(dir => (
                                                                <div key={dir.id} className="flex flex-col">
                                                                    <span className="text-[10px] font-bold text-gray-700 break-words leading-tight">{dir.person.fullName}</span>
                                                                    <span className="text-[9px] text-brand-600 font-semibold uppercase tracking-tighter">{dir.cargo}</span>
                                                                </div>
                                                            ))}
                                                            {oficina.directivos.length === 0 && <p className="text-[10px] text-gray-400 italic">Personal docente/administrativo no asignado</p>}
                                                        </div>
                                                    </div>
                                                ))}
                                                {sede.oficinas.length === 0 && <p className="text-center text-xs text-gray-400 py-4 italic col-span-2">No se encontraron oficinas</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {data.length === 0 && (
                                <div className="text-center py-20 text-gray-400">
                                    <svg className="w-12 h-12 mx-auto mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 012-2M5 11V9a2 2 0 01-2-2m0 0V5a2 2 0 012-2h14a2 2 0 012 2v2M7 7h10" /></svg>
                                    <p className="text-lg font-medium">No se encontraron datos</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
