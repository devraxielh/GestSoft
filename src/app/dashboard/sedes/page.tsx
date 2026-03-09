"use client"
import { useState, useEffect, useCallback } from "react"
import * as XLSX from "xlsx"
import { useRef } from "react"
import ConfirmModal from "@/components/ConfirmModal"
import toast from "react-hot-toast"
import OficinasModal from "./OficinasModal"
import FacultadesModal from "./FacultadesModal"
import PersonFormModal from "@/components/PersonFormModal"
import RichTextEditor from "@/components/RichTextEditor"



interface Sede { id: number; name: string; rectorId: number | null; rector?: { fullName: string }; address: string | null; email: string | null; phone: string | null; contextoInstitucional: string | null; misionInstitucional: string | null; visionInstitucional: string | null; _count?: { oficinas: number; facultades: number } }
interface Person { id: number; fullName: string; identification: string; email?: string | null }

export default function SedesPage() {
    const [sedes, setSedes] = useState<Sede[]>([])
    const [persons, setPersons] = useState<Person[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingSede, setEditingSede] = useState<Sede | null>(null)
    const [form, setForm] = useState({ name: "", rectorId: "", address: "", email: "", phone: "", contextoInstitucional: "" })
    const [search, setSearch] = useState("")
    const [rectorSearch, setRectorSearch] = useState("")
    const [isRectorDropdownOpen, setIsRectorDropdownOpen] = useState(false)
    const [error, setError] = useState("")
    const [confirmAction, setConfirmAction] = useState<{ type: "delete-single" | "delete-bulk"; sede?: Sede } | null>(null)
    const [showImportModal, setShowImportModal] = useState(false)
    const [importData, setImportData] = useState<any[]>([])
    const [importing, setImporting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const [selectedSedes, setSelectedSedes] = useState<number[]>([])
    const [deleting, setDeleting] = useState(false)

    const [selectedSedeForOficinas, setSelectedSedeForOficinas] = useState<Sede | null>(null)
    const [selectedSedeForFacultades, setSelectedSedeForFacultades] = useState<Sede | null>(null)

    const [showNestedPersonModal, setShowNestedPersonModal] = useState(false)


    const fetchSedes = useCallback(async () => { const res = await fetch("/api/sedes"); setSedes(await res.json()); setLoading(false) }, [])
    const fetchPersons = useCallback(async () => { const res = await fetch("/api/personas"); setPersons(await res.json()); }, [])

    useEffect(() => { fetchSedes(); fetchPersons() }, [fetchSedes, fetchPersons])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsRectorDropdownOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError("")
        const url = editingSede ? `/api/sedes/${editingSede.id}` : "/api/sedes"
        const sendData = {
            ...form,
            rectorId: form.rectorId ? parseInt(form.rectorId) : null
        }
        const res = await fetch(url, { method: editingSede ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sendData) })
        if (res.ok) {
            toast.success(editingSede ? "Sede actualizada" : "Sede creada", { style: { background: '#F0FDF4', color: '#166534', border: '1px solid #4ADE80' }, iconTheme: { primary: '#22C55E', secondary: '#F0FDF4' } })
            setShowModal(false); setEditingSede(null); setForm({ name: "", rectorId: "", address: "", email: "", phone: "", contextoInstitucional: "" }); fetchSedes()
        } else {
            toast.error("Error al guardar", { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' } })
            setError("Error al guardar")
        }
    }

    const handleDelete = async (id: number) => {
        const res = await fetch(`/api/sedes/${id}`, { method: "DELETE" });
        if (res.ok) {
            toast.success("Sede eliminada", { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' }, iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' } })
            fetchSedes()
        } else {
            toast.error("Error al eliminar")
        }
    }
    const handleBulkDelete = async () => {
        setDeleting(true)
        try {
            const res = await fetch('/api/sedes/bulk-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sedeIds: selectedSedes }) })
            if (res.ok) {
                toast.success(`Se eliminaron ${selectedSedes.length} sedes`, { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' }, iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' } })
                setSelectedSedes([]); fetchSedes()
            } else {
                const errData = await res.json().catch(() => ({}));
                toast.error(errData.error || "Error al eliminar")
            }
        } catch { toast.error("Error de conexión al eliminar") }
        setDeleting(false); setConfirmAction(null)
    }
    const handleConfirm = () => {
        if (!confirmAction) return;
        if (confirmAction.type === "delete-single" && confirmAction.sede) {
            handleDelete(confirmAction.sede.id)
        } else if (confirmAction.type === "delete-bulk") {
            handleBulkDelete(); return
        }
        setConfirmAction(null)
    }

    const openCreate = () => { setEditingSede(null); setForm({ name: "", rectorId: "", address: "", email: "", phone: "", contextoInstitucional: "" }); setRectorSearch(""); setIsRectorDropdownOpen(false); setError(""); setShowModal(true) }
    const openEdit = (s: Sede) => { setEditingSede(s); setForm({ name: s.name, rectorId: s.rectorId?.toString() || "", address: s.address || "", email: s.email || "", phone: s.phone || "", contextoInstitucional: s.contextoInstitucional || "" }); setRectorSearch(s.rector ? `${s.rector.fullName} - ${s.rectorId}` : ""); setIsRectorDropdownOpen(false); setError(""); setShowModal(true) }

    const filteredRectors = persons.filter(p =>
        p.fullName.toLowerCase().includes(rectorSearch.toLowerCase()) ||
        p.identification.includes(rectorSearch)
    )

    const filtered = sedes.filter(s =>
        `${s.name} ${s.rector?.fullName || ""} ${s.address || ""} ${s.email || ""} ${s.phone || ""}`.toLowerCase().includes(search.toLowerCase())
    )

    const toggleSedeSelection = (id: number) => setSelectedSedes(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id])
    const toggleAllSedes = () => selectedSedes.length === filtered.length ? setSelectedSedes([]) : setSelectedSedes(filtered.map(s => s.id))

    const inputCls = "w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs transition-colors"

    const handleFileUpload = (file: File) => {
        setImportData([])
        const reader = new FileReader(); reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result; const wb = XLSX.read(bstr, { type: "binary" })
                const wsname = wb.SheetNames[0]; const ws = wb.Sheets[wsname]
                const data = XLSX.utils.sheet_to_json(ws); setImportData(data)
            } catch { toast.error("No se pudo leer el archivo Excel.") }
        }
        reader.readAsBinaryString(file)
    }

    const downloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([{ nombre: "Sede Centro", rectorId: "1", direccion: "Calle principal", correo: "centro@sede.edu", telefono: "3000000000" }])
        ws["!cols"] = [{ wch: 30 }, { wch: 15 }, { wch: 35 }, { wch: 30 }, { wch: 15 }]
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Sedes")
        XLSX.writeFile(wb, "plantilla_importacion_sedes.xlsx")
    }

    const processImport = async () => {
        if (!importData.length) return; setImporting(true); let ok = 0; let fail = 0
        for (const row of importData) {
            const body = {
                name: row.nombre || row.Nombre || "",
                rectorId: row.rectorId || row.RectorId || null,
                address: row.direccion || row.Direccion || row.Dirección || "",
                email: row.correo || row.Correo || row.email || row.Email || "",
                phone: row.telefono || row.Telefono || row.Teléfono || ""
            }
            if (!body.name) { fail++; continue }
            const res = await fetch("/api/sedes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
            if (res.ok) ok++; else fail++
        }
        setImporting(false);
        if (fail > 0 && ok > 0) toast.success(`${ok} importadas, ${fail} fallidas`, { icon: '⚠️' })
        else if (fail > 0) toast.error(`${fail} fallidas`)
        else toast.success(`${ok} importadas correctamente`)
        setImportData([]); fetchSedes(); if (fileInputRef.current) fileInputRef.current.value = ""
    }

    const exportSedes = () => {
        const data = sedes.map(s => ({
            nombre: s.name,
            rector: s.rector?.fullName || "Sin asignar",
            direccion: s.address || "",
            correo: s.email || "",
            telefono: s.phone || ""
        }))
        const ws = XLSX.utils.json_to_sheet(data)
        ws["!cols"] = [{ wch: 30 }, { wch: 30 }, { wch: 35 }, { wch: 30 }, { wch: 15 }]
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Sedes")
        XLSX.writeFile(wb, `sedes_${new Date().toISOString().split("T")[0]}.xlsx`)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h2 className="text-2xl font-semibold text-gray-800">Sedes</h2><p className="text-gray-500 text-sm mt-1">Gestión de sedes</p></div>
                <div className="flex items-center gap-3">
                    {selectedSedes.length > 0 && (
                        <button onClick={() => setConfirmAction({ type: "delete-bulk" })} disabled={deleting} className="inline-flex items-center gap-2 rounded-lg border border-error-200 bg-error-50 px-4 py-2.5 text-sm font-medium text-error-600 hover:bg-error-100 shadow-theme-xs transition-colors disabled:opacity-50">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Eliminar ({selectedSedes.length})
                        </button>
                    )}
                    <button onClick={() => { setShowImportModal(true); setImportData([]) }} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Importar
                    </button>
                    <button onClick={exportSedes} disabled={sedes.length === 0} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Exportar
                    </button>
                    <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Nueva Sede
                    </button>
                </div>
            </div>

            <div className="relative max-w-md">
                <input type="text" placeholder="Buscar por nombre, rector, dirección..." value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 transition-colors" />
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>

            {loading ? <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div></div> : (
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs">
                    <table className="w-full">
                        <thead><tr className="border-b border-gray-100">
                            <th className="px-4 py-4 text-left"><input type="checkbox" checked={filtered.length > 0 && selectedSedes.length === filtered.length} onChange={toggleAllSedes} className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/10" /></th>
                            <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Nombre</th>
                            <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Rector</th>
                            <th className="px-6 py-4 text-left text-theme-xs font-medium text-gray-500 uppercase">Contacto</th>
                            <th className="px-6 py-4 text-right text-theme-xs font-medium text-gray-500 uppercase">Acciones</th>
                        </tr></thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map((s) => (
                                <tr key={s.id} className={`hover:bg-gray-50 transition-colors ${selectedSedes.includes(s.id) ? "bg-brand-50/30" : ""}`}>
                                    <td className="px-4 py-4"><input type="checkbox" checked={selectedSedes.includes(s.id)} onChange={() => toggleSedeSelection(s.id)} className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/10" /></td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => setSelectedSedeForOficinas(s)} className="text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline text-left">
                                            {s.name}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-800">{s.rector?.fullName || <span className="text-gray-400 italic">Sin asignar</span>}</span>
                                            {s.address && <span className="text-sm text-gray-500 mt-1 flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>{s.address}</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        <div className="flex flex-col gap-1">
                                            {s.email && <span className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>{s.email}</span>}
                                            {s.phone && <span className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>{s.phone}</span>}
                                            {!s.email && !s.phone && <span className="text-gray-400 italic">Sin datos</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="inline-flex items-center gap-1">
                                            <button onClick={() => setSelectedSedeForOficinas(s)} title="Ver Oficinas" className="inline-flex items-center gap-1 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand-600 transition-colors group">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
                                                <span className="text-xs font-medium text-gray-500 group-hover:text-brand-600">{s._count?.oficinas ?? 0}</span>
                                            </button>
                                            <button onClick={() => setSelectedSedeForFacultades(s)} title="Ver Facultades" className="inline-flex items-center gap-1 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand-600 transition-colors group">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                                <span className="text-xs font-medium text-gray-500 group-hover:text-brand-600">{s._count?.facultades ?? 0}</span>
                                            </button>

                                            <button onClick={() => openEdit(s)} title="Editar" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand-600 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                            <button onClick={() => setConfirmAction({ type: "delete-single", sede: s })} title="Eliminar" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-error-600 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">{search ? "No se encontraron sedes" : "No hay sedes"}</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
            {showModal && (
                <div className="fixed inset-0 z-[99999] flex items-start pt-[5vh] justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-800 mb-5">{editingSede ? "Editar Sede" : "Nueva Sede"}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && <div className="rounded-lg bg-error-50 border border-error-100 p-3 text-sm text-error-600">{error}</div>}

                            <div className="grid grid-cols-3 gap-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-2">Nombre de la Sede</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className={inputCls} placeholder="Ej: Sede Centro" /></div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-medium text-gray-700">Rector <span className="text-gray-400 font-normal">(opcional)</span></label>
                                        <button
                                            type="button"
                                            onClick={() => setShowNestedPersonModal(true)}
                                            className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1 bg-brand-50 hover:bg-brand-100 px-2 py-1 rounded transition-colors"
                                        >
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                            Crear persona
                                        </button>
                                    </div>
                                    <div className="relative" ref={dropdownRef}>
                                        <div
                                            className={`${inputCls} flex justify-between items-center cursor-pointer`}
                                            onClick={() => setIsRectorDropdownOpen(!isRectorDropdownOpen)}
                                        >
                                            <span className={form.rectorId ? "text-gray-800 truncate" : "text-gray-400"}>
                                                {form.rectorId
                                                    ? (() => { const p = persons.find(p => p.id.toString() === form.rectorId); return p ? `${p.fullName}` : "Seleccionado"; })()
                                                    : "Sin asignar"}
                                            </span>
                                            <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isRectorDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </div>

                                        {isRectorDropdownOpen && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col">
                                                <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar persona..."
                                                        value={rectorSearch}
                                                        onChange={(e) => setRectorSearch(e.target.value)}
                                                        className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
                                                        autoFocus
                                                    />
                                                </div>
                                                <div className="overflow-y-auto overflow-x-hidden flex-1">
                                                    <div
                                                        className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 cursor-pointer"
                                                        onClick={() => { setForm({ ...form, rectorId: "" }); setIsRectorDropdownOpen(false); setRectorSearch(""); }}
                                                    >
                                                        Sin asignar
                                                    </div>
                                                    {filteredRectors.length > 0 ? (
                                                        filteredRectors.map(p => (
                                                            <div
                                                                key={p.id}
                                                                className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 ${form.rectorId === p.id.toString() ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-700'}`}
                                                                onClick={() => { setForm({ ...form, rectorId: p.id.toString() }); setIsRectorDropdownOpen(false); setRectorSearch(""); }}
                                                            >
                                                                {p.fullName} - <span className="text-gray-500 text-xs">{p.identification}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="px-4 py-3 text-sm text-center text-gray-500">No se encontraron resultados</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div><label className="block text-sm font-medium text-gray-700 mb-2">Dirección <span className="text-gray-400 font-normal">(opcional)</span></label><input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className={inputCls} placeholder="Ej: Calle 123..." /></div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-2">Correo <span className="text-gray-400 font-normal">(opcional)</span></label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="contacto@sede.edu" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-2">Teléfono <span className="text-gray-400 font-normal">(opcional)</span></label><input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="300 000 0000" /></div>
                            </div>

                            <RichTextEditor
                                value={form.contextoInstitucional}
                                onChange={html => setForm(prev => ({ ...prev, contextoInstitucional: html }))}
                                label="Contexto, Misión y Visión Institucional"
                                placeholder="Escribir contexto institucional..."
                                minHeight="200px"
                            />

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 shadow-theme-xs transition-colors">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showImportModal && (
                <div className="fixed inset-0 z-[99999] flex items-start pt-[5vh] justify-center bg-gray-900/50 p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg">
                        <h3 className="text-lg font-semibold text-gray-800 mb-5">Importar Sedes desde Excel</h3>

                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 mb-5">
                            <p className="text-sm text-gray-600 mb-3">Descarga la plantilla con el formato correcto para importar sedes.</p>
                            <button onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Descargar Plantilla
                            </button>
                        </div>

                        <div
                            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-brand-300 transition-colors cursor-pointer mb-5"
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-brand-400", "bg-brand-25") }}
                            onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-brand-400", "bg-brand-25") }}
                            onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-brand-400", "bg-brand-25"); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f) }}
                        >
                            <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            <p className="text-sm text-gray-500 mb-1">Arrastra tu archivo Excel aquí o <span className="text-brand-500 font-medium">haz clic para seleccionar</span></p>
                            <p className="text-xs text-gray-400">.xlsx, .xls</p>
                            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }} />
                        </div>

                        {importData.length > 0 && <div className="mb-5 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">Se encontraron <strong>{importData.length}</strong> sedes para importar.</div>}

                        <div className="flex gap-3 pt-1">
                            <button type="button" onClick={() => { setShowImportModal(false); setImportData([]) }} className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">Cerrar</button>
                            <button type="button" onClick={processImport} disabled={!importData.length || importing} className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 shadow-theme-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                {importing ? "Importando..." : "Iniciar Importación"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={!!confirmAction}
                title={confirmAction?.type === "delete-bulk" ? "Eliminar sedes" : "Eliminar Sede"}
                message={confirmAction?.type === "delete-bulk" ? `¿Estás seguro de que deseas eliminar las ${selectedSedes.length} sedes seleccionadas? Esta acción no se puede deshacer.` : `¿Estás seguro de que deseas eliminar la sede "${confirmAction?.sede?.name}"? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                variant="danger"
                onConfirm={handleConfirm}
                onCancel={() => setConfirmAction(null)}
            />

            {selectedSedeForOficinas && (
                <OficinasModal
                    isOpen={true}
                    onClose={() => setSelectedSedeForOficinas(null)}
                    sedeId={selectedSedeForOficinas.id}
                    sedeName={selectedSedeForOficinas.name}
                    onChange={fetchSedes}
                />
            )}

            {selectedSedeForFacultades && (
                <FacultadesModal
                    isOpen={true}
                    onClose={() => setSelectedSedeForFacultades(null)}
                    sedeId={selectedSedeForFacultades.id}
                    sedeName={selectedSedeForFacultades.name}
                    onChange={fetchSedes}
                />
            )}

            <PersonFormModal
                isOpen={showNestedPersonModal}
                onClose={() => setShowNestedPersonModal(false)}
                onSuccess={(newPerson) => {
                    setPersons(prev => [...prev, newPerson]);
                    setForm(prev => ({ ...prev, rectorId: newPerson.id.toString() }));
                }}
            />


        </div>
    )
}
