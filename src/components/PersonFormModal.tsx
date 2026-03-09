import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import SearchableSelect from "./SearchableSelect";

interface Person {
    id: number;
    fullName: string;
    idType: string;
    identification: string;
    phone: string | null;
    email: string | null;
}

interface PersonFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newPerson: Person) => void;
}

const ID_TYPES = ["CC", "TI", "CE", "Pasaporte"];

export default function PersonFormModal({ isOpen, onClose, onSuccess }: PersonFormModalProps) {
    const [form, setForm] = useState({ fullName: "", idType: "CC", identification: "", phone: "", email: "" });
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        // Reset form on open
        setForm({ fullName: "", idType: "CC", identification: "", phone: "", email: "" });
        setError("");
        setIsSubmitting(false);
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            const res = await fetch("/api/personas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, phone: form.phone || null })
            });

            if (res.ok) {
                const newPerson = await res.json();
                toast.success("Persona creada exitosamente", {
                    style: { background: '#F0FDF4', color: '#166534', border: '1px solid #4ADE80' },
                    iconTheme: { primary: '#22C55E', secondary: '#F0FDF4' }
                });
                onSuccess(newPerson);
                onClose();
            } else {
                const data = await res.json().catch(() => ({}));
                const err = data.error || "Error al crear la persona";
                setError(err);
                toast.error(err, { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' } });
            }
        } catch (e) {
            setError("Error de red al crear persona");
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputCls = "w-full rounded-lg border border-secondary-200 bg-secondary-50 px-4 py-2.5 text-sm text-secondary-800 placeholder-secondary-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 shadow-theme-xs";

    return (
        <div className="fixed inset-0 z-[99999999] flex items-start pt-[5vh] justify-center bg-secondary-900/50 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-secondary-200 bg-white p-6 shadow-theme-lg max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold text-secondary-800 mb-5">Nueva Persona</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="rounded-lg bg-error-50 border border-error-100 p-3 text-sm text-error-600">
                            {error}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-secondary-700 mb-2">Nombre Completo</label>
                            <input type="text" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} required className={inputCls} placeholder="Nombre Completo" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-secondary-700 mb-2">Tipo ID</label>
                            <select value={form.idType} onChange={e => setForm({ ...form, idType: e.target.value })} className={inputCls}>
                                {ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-secondary-700 mb-2">Identificación</label>
                            <input type="text" value={form.identification} onChange={e => setForm({ ...form, identification: e.target.value })} required className={inputCls} placeholder="Número" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">Teléfono <span className="text-secondary-400">(opcional)</span></label>
                        <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="Teléfono" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">Correo <span className="text-secondary-400">(opcional)</span></label>
                        <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="correo@ejemplo.com" />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 rounded-lg border border-secondary-200 bg-white px-4 py-2.5 text-sm font-medium text-secondary-700 hover:bg-secondary-50 shadow-theme-xs transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" disabled={isSubmitting} className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 shadow-theme-xs transition-colors disabled:opacity-50">
                            {isSubmitting ? "Guardando..." : "Guardar"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
