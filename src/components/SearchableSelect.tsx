"use client"
import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"

interface Option { label: string; value: string; description?: string }

interface SearchableSelectProps {
    options: Option[]
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
    disabled?: boolean
}

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "Seleccionar...",
    className = "",
    disabled = false
}: SearchableSelectProps) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState("")
    const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
    const ref = useRef<HTMLDivElement>(null)
    const btnRef = useRef<HTMLButtonElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const dropRef = useRef<HTMLDivElement>(null)

    const updatePos = useCallback(() => {
        if (!btnRef.current) return
        const r = btnRef.current.getBoundingClientRect()
        setPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }, [])

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node) &&
                dropRef.current && !dropRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClick)
        return () => document.removeEventListener("mousedown", handleClick)
    }, [])

    useEffect(() => {
        if (open) {
            updatePos()
            window.addEventListener("scroll", updatePos, true)
            window.addEventListener("resize", updatePos)
            return () => {
                window.removeEventListener("scroll", updatePos, true)
                window.removeEventListener("resize", updatePos)
            }
        }
    }, [open, updatePos])

    const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()) || o.description?.toLowerCase().includes(search.toLowerCase()))
    const selectedLabel = options.find(o => o.value === value)?.label

    const handleOpen = () => {
        if (disabled) return
        setOpen(true)
        setSearch("")
        setTimeout(() => inputRef.current?.focus(), 50)
    }

    const handleSelect = (val: string) => {
        onChange(val)
        setOpen(false)
        setSearch("")
    }

    return (
        <div ref={ref} className={`relative ${className}`}>
            <button
                ref={btnRef}
                type="button"
                onClick={handleOpen}
                disabled={disabled}
                className={`w-full flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-theme-xs transition-colors text-left min-w-[180px] ${disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : "hover:bg-gray-50"}`}
            >
                <span className={selectedLabel ? "text-gray-800" : "text-gray-400"}>{selectedLabel || placeholder}</span>
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {open && typeof window !== "undefined" && createPortal(
                <div
                    ref={dropRef}
                    style={{ position: "fixed", top: pos.top, left: pos.left, width: Math.max(pos.width, 220), zIndex: 999999 }}
                    className="rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                >
                    <div className="p-2 border-b border-gray-100">
                        <input
                            ref={inputRef}
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar..."
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
                        />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                        <button
                            type="button"
                            onClick={() => handleSelect("")}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${value === "" ? "text-brand-600 font-medium bg-brand-50/50" : "text-gray-500"}`}
                        >
                            {placeholder}
                        </button>
                        {filtered.map(o => (
                            <button
                                key={o.value}
                                type="button"
                                onClick={() => handleSelect(o.value)}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${value === o.value ? "text-brand-600 font-medium bg-brand-50/50" : "text-gray-700"}`}
                            >
                                <div className="flex flex-col">
                                    <span>{o.label}</span>
                                    {o.description && <span className="text-xs text-gray-400 font-normal">{o.description}</span>}
                                </div>
                            </button>
                        ))}
                        {filtered.length === 0 && (
                            <div className="px-4 py-3 text-xs text-gray-400 text-center">Sin resultados</div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
