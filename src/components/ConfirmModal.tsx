"use client"
import { useEffect } from "react"

interface ConfirmModalProps {
    open: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    variant?: "danger" | "warning" | "info"
    onConfirm: () => void
    onCancel: () => void
}

const variants = {
    danger: {
        icon: (
            <svg className="w-6 h-6 text-error-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
        ),
        bg: "bg-error-50",
        btn: "bg-error-500 hover:bg-error-600",
    },
    warning: {
        icon: (
            <svg className="w-6 h-6 text-warning-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
        ),
        bg: "bg-warning-50",
        btn: "bg-warning-500 hover:bg-warning-600",
    },
    info: {
        icon: (
            <svg className="w-6 h-6 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        bg: "bg-brand-50",
        btn: "bg-brand-500 hover:bg-brand-600",
    },
}

export default function ConfirmModal({ open, title, message, confirmText = "Confirmar", cancelText = "Cancelar", variant = "danger", onConfirm, onCancel }: ConfirmModalProps) {
    useEffect(() => {
        if (!open) return
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel() }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [open, onCancel])

    if (!open) return null
    const v = variants[variant]

    return (
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center bg-gray-900/50 p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg animate-in zoom-in-95 duration-200">
                <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-11 h-11 rounded-xl ${v.bg} flex items-center justify-center`}>
                        {v.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{message}</p>
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={onCancel} className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-theme-xs transition-colors">
                        {cancelText}
                    </button>
                    <button onClick={onConfirm} className={`flex-1 rounded-lg ${v.btn} px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs transition-colors`}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}
