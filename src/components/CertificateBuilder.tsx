"use client";
import React, { useState, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { Type, Image as ImageIcon, ImagePlus, AlignLeft, AlignCenter, AlignRight, Bold, Trash2, Code, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export interface CertElement {
    id: string;
    type: 'text' | 'variable' | 'image';
    content: string;
    x: number;
    y: number;
    width: number;
    height: number;
    style: {
        fontSize: number;
        color: string;
        fontWeight: 'normal' | 'bold';
        textAlign: 'left' | 'center' | 'right';
        fontFamily: string;
    };
}

export interface CertBuilderState {
    elements: CertElement[];
    bgImage: string;
}

const defaultState: CertBuilderState = {
    elements: [
        { id: '1', type: 'text', content: 'CERTIFICADO', x: 200, y: 50, width: 400, height: 60, style: { fontSize: 36, color: '#000000', fontWeight: 'bold', textAlign: 'center', fontFamily: 'Georgia, serif' } },
        { id: '2', type: 'text', content: 'DE PARTICIPACIÓN', x: 200, y: 120, width: 400, height: 30, style: { fontSize: 14, color: '#667085', fontWeight: 'normal', textAlign: 'center', fontFamily: 'Arial, sans-serif' } },
        { id: '3', type: 'text', content: 'Se otorga el presente certificado a:', x: 200, y: 170, width: 400, height: 30, style: { fontSize: 16, color: '#344054', fontWeight: 'normal', textAlign: 'center', fontFamily: 'Georgia, serif' } },
        { id: '4', type: 'variable', content: '{{NOMBRE_COMPLETO}}', x: 100, y: 220, width: 600, height: 50, style: { fontSize: 28, color: '#101828', fontWeight: 'bold', textAlign: 'center', fontFamily: 'Georgia, serif' } },
        { id: '5', type: 'variable', content: 'Identificación: {{IDENTIFICACION}}', x: 200, y: 280, width: 400, height: 30, style: { fontSize: 16, color: '#344054', fontWeight: 'normal', textAlign: 'center', fontFamily: 'Georgia, serif' } },
        { id: '6', type: 'variable', content: 'Por su participación como {{TIPO_PARTICIPACION}}', x: 100, y: 340, width: 600, height: 30, style: { fontSize: 16, color: '#344054', fontWeight: 'normal', textAlign: 'center', fontFamily: 'Georgia, serif' } },
        { id: '7', type: 'text', content: 'en el evento:', x: 200, y: 380, width: 400, height: 30, style: { fontSize: 16, color: '#344054', fontWeight: 'normal', textAlign: 'center', fontFamily: 'Georgia, serif' } },
        { id: '8', type: 'variable', content: '{{NOMBRE_EVENTO}}', x: 100, y: 430, width: 600, height: 40, style: { fontSize: 22, color: '#000000', fontWeight: 'bold', textAlign: 'center', fontFamily: 'Georgia, serif' } },
        { id: '9', type: 'variable', content: 'Fecha de expedición: {{FECHA_EXPEDICION}}', x: 200, y: 490, width: 400, height: 30, style: { fontSize: 14, color: '#000000', fontWeight: 'normal', textAlign: 'center', fontFamily: 'Arial, sans-serif' } },
    ],
    bgImage: ''
};

export default function CertificateBuilder({
    initialHtml,
    onChange
}: {
    initialHtml: string;
    onChange: (html: string) => void;
}) {
    // Initialize state properly by parsing initial HTML once, bypassing the effect
    const [state, setState] = useState<CertBuilderState>(() => {
        if (initialHtml) {
            try {
                const match = initialHtml.match(/<script id="cert-editor-data" type="application\/json">([\s\S]*?)<\/script>/);
                if (match && match[1]) {
                    return JSON.parse(match[1]);
                }
            } catch (e) {
                console.error("Failed to parse cert state", e);
            }
        }
        return defaultState;
    });

    const [selectedId, setSelectedId] = useState<string | null>(null);

    const isInitializedRef = React.useRef(false);

    // Mark as initialized to prevent initial render jitter
    useEffect(() => {
        isInitializedRef.current = true;
    }, []);

    useEffect(() => {
        if (!isInitializedRef.current) return;

        let html = `<div style="width: 800px; height: 600px; position: relative; ${state.bgImage ? `background: url('${state.bgImage}') center/cover no-repeat;` : 'background-color: #ffffff;'} overflow: hidden; margin: 0; padding: 0;">\n`;

        state.elements.forEach(el => {
            const justify = el.style.textAlign === 'center' ? 'center' : el.style.textAlign === 'right' ? 'flex-end' : 'flex-start';
            html += `  <div style="position: absolute; left: ${el.x}px; top: ${el.y}px; width: ${el.width}px; height: ${el.height}px; font-size: ${el.style.fontSize}px; color: ${el.style.color}; font-weight: ${el.style.fontWeight}; font-family: ${el.style.fontFamily}; display: flex; align-items: flex-start; justify-content: ${justify}; word-break: break-word; white-space: pre-wrap;">`;
            if (el.type === 'image') {
                html += `<img src="${el.content}" style="width: 100%; height: 100%; object-fit: contain;" alt="Firma o Imagen" />`;
            } else {
                html += `<div style="width: 100%; height: 100%; text-align: ${el.style.textAlign};">${el.content}</div>`;
            }
            html += `</div>\n`;
        });

        const stateJson = JSON.stringify(state).replace(/</g, '\\u003c');
        html += `  <script id="cert-editor-data" type="application/json">${stateJson}</script>\n`;
        html += `</div>`;

        onChange(html);
    }, [state, onChange]);

    const addElement = (type: 'text' | 'variable' | 'image', contentStr?: string) => {
        const newEl: CertElement = {
            id: Date.now().toString(),
            type,
            content: contentStr || (type === 'text' ? 'Nuevo Texto' : '{{VARIABLE}}'),
            x: 300,
            y: 250,
            width: type === 'image' ? 150 : 200,
            height: type === 'image' ? 100 : 50,
            style: {
                fontSize: 16,
                color: '#000000',
                fontWeight: 'normal',
                textAlign: 'center',
                fontFamily: 'Georgia, serif'
            }
        };
        setState(s => ({ ...s, elements: [...s.elements, newEl] }));
        setSelectedId(newEl.id);
    };

    const updateElement = (id: string, updates: Partial<CertElement>) => {
        setState(s => ({
            ...s,
            elements: s.elements.map(el => el.id === id ? { ...el, ...updates } : el)
        }));
    };

    const updateElementStyle = (id: string, styleUpdates: Partial<CertElement['style']>) => {
        setState(s => ({
            ...s,
            elements: s.elements.map(el => el.id === id ? { ...el, style: { ...el.style, ...styleUpdates } } : el)
        }));
    };

    const deleteElement = (id: string) => {
        setState(s => ({ ...s, elements: s.elements.filter(el => el.id !== id) }));
        if (selectedId === id) setSelectedId(null);
    };

    const handleUploadBackground = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const tId = toast.loading("Subiendo fondo...");
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            const data = await res.json();
            if (res.ok) {
                toast.success("Fondo actualizado", { id: tId });
                setState(s => ({ ...s, bgImage: data.url }));
            } else {
                toast.error(data.error || "Error al subir", { id: tId });
            }
        } catch {
            toast.error("Error de red", { id: tId });
        }
        e.target.value = "";
    };

    const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const tId = toast.loading("Subiendo imagen...");
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            const data = await res.json();
            if (res.ok) {
                toast.success("Imagen agregada", { id: tId });
                addElement('image', data.url);
            } else {
                toast.error(data.error || "Error al subir", { id: tId });
            }
        } catch {
            toast.error("Error de red", { id: tId });
        }
        e.target.value = "";
    };

    const selectedElement = state.elements.find(el => el.id === selectedId);

    // Click outside to deselect
    const handleCanvasClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            setSelectedId(null);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 bg-gray-50 p-6 rounded-2xl border border-gray-200 shadow-theme-sm">
            {/* Canvas Area */}
            <div className="flex-1 flex flex-col items-center overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-2 bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-theme-xs mb-6 w-full max-w-[800px]">
                    <button type="button" onClick={() => addElement('text')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
                        <Type className="w-4 h-4" /> Texto
                    </button>
                    <button type="button" onClick={() => addElement('variable')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50 rounded-lg transition-colors border border-brand-200 bg-brand-50/50">
                        <Code className="w-4 h-4" /> Variable
                    </button>
                    <button type="button" onClick={() => addElement('variable', '{{CODIGO_VERIFICACION}}')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-200 bg-indigo-50/50">
                        <ShieldCheck className="w-4 h-4" /> Cód. Verificación
                    </button>
                    <div className="h-6 w-px bg-gray-200 mx-2"></div>
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
                        <ImagePlus className="w-4 h-4" /> Firma / Img
                        <input type="file" className="hidden" accept="image/*" onChange={handleUploadImage} />
                    </label>
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
                        <ImageIcon className="w-4 h-4" /> Fondo
                        <input type="file" className="hidden" accept="image/*" onChange={handleUploadBackground} />
                    </label>
                    {state.bgImage && (
                        <button type="button" onClick={() => setState(s => ({ ...s, bgImage: '' }))} className="text-xs text-error-600 hover:underline">Quitar fondo</button>
                    )}
                </div>

                {/* The Workspace */}
                <div
                    className="relative bg-white shadow-theme-md border border-gray-300 overflow-hidden"
                    style={{
                        width: '800px',
                        height: '600px',
                        backgroundImage: state.bgImage ? `url(${state.bgImage})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        transform: 'scale(1)', // can scale via CSS transform if needed for small screens
                        transformOrigin: 'top center'
                    }}
                    onClick={handleCanvasClick}
                >
                    {state.elements.map(el => (
                        <Rnd
                            key={el.id}
                            size={{ width: el.width, height: el.height }}
                            position={{ x: el.x, y: el.y }}
                            onDragStop={(e, d) => {
                                updateElement(el.id, { x: d.x, y: d.y });
                            }}
                            onResizeStop={(e, direction, ref, delta, position) => {
                                updateElement(el.id, {
                                    width: parseInt(ref.style.width, 10),
                                    height: parseInt(ref.style.height, 10),
                                    ...position
                                });
                            }}
                            bounds="parent"
                            onClick={(e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => { e.stopPropagation(); setSelectedId(el.id); }}
                            className={"group " + (selectedId === el.id ? "ring-2 ring-brand-500 ring-offset-1 z-10" : "hover:ring-1 hover:ring-gray-400 z-1")}
                            style={{
                                display: 'flex',
                                fontSize: el.style.fontSize + 'px',
                                color: el.style.color,
                                fontWeight: el.style.fontWeight,
                                fontFamily: el.style.fontFamily,
                                alignItems: 'flex-start',
                                justifyContent: el.style.textAlign === 'center' ? 'center' : el.style.textAlign === 'right' ? 'flex-end' : 'flex-start',
                                wordBreak: 'break-word',
                                whiteSpace: 'pre-wrap'
                            }}
                        >
                            {el.type === 'image' ? (
                                <img src={el.content} alt="" className="w-full h-full object-contain pointer-events-none" />
                            ) : (
                                <div className="w-full h-full" style={{ textAlign: el.style.textAlign }}>
                                    {el.content}
                                </div>
                            )}
                            {selectedId !== el.id && (
                                <div className="absolute inset-0 border border-dashed border-transparent group-hover:border-gray-300 pointer-events-none transition-colors" />
                            )}
                        </Rnd>
                    ))}
                </div>
                <div className="mt-4 text-xs text-gray-500 font-medium w-[800px] text-center">
                    Arrastra los elementos para posicionarlos. Selecciona un elemento para editarlo en el panel de herramientas.
                </div>
            </div>

            {/* Properties Sidebar */}
            <div className="w-full lg:w-80 flex-shrink-0 bg-white border border-gray-200 rounded-xl p-5 shadow-theme-xs flex flex-col h-[700px] overflow-y-auto">
                <h3 className="font-semibold text-gray-800 border-b border-gray-100 pb-3 mb-4">
                    {selectedElement ? 'Propiedades' : 'Diseño General'}
                </h3>

                {selectedElement ? (
                    <div className="space-y-5">
                        {selectedElement.type !== 'image' && (
                            <>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Contenido</label>
                                    {selectedElement.type === 'variable' ? (
                                        <select
                                            className="w-full text-sm border-gray-200 rounded-lg bg-gray-50 focus:ring-brand-500 focus:border-brand-500"
                                            value={selectedElement.content}
                                            onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                                        >
                                            <option value="{{NOMBRE_COMPLETO}}">Nombre de Persona</option>
                                            <option value="{{IDENTIFICACION}}">Documento Persona</option>
                                            <option value="{{NOMBRE_EVENTO}}">Nombre del Evento</option>
                                            <option value="{{FECHA_EXPEDICION}}">Fecha Expedición</option>
                                            <option value="{{TIPO_PARTICIPACION}}">Tipo Participación</option>
                                            <option value="{{DETALLES_PARTICIPACION}}">Detalles Participación (Ponen/Conf/Eval)</option>
                                            <option value="{{CODIGO_VERIFICACION}}">Código de Verificación</option>
                                        </select>
                                    ) : (
                                        <textarea
                                            className="w-full text-sm border-gray-200 rounded-lg bg-gray-50 focus:ring-brand-500 focus:border-brand-500 min-h-[80px]"
                                            value={selectedElement.content}
                                            onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                                        />
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Fuente</label>
                                        <select
                                            className="w-full text-sm border-gray-200 rounded-lg bg-gray-50 focus:ring-brand-500 focus:border-brand-500"
                                            value={selectedElement.style.fontFamily}
                                            onChange={(e) => updateElementStyle(selectedElement.id, { fontFamily: e.target.value })}
                                        >
                                            <option value="Arial, sans-serif">Arial</option>
                                            <option value="'Times New Roman', Times, serif">Times New</option>
                                            <option value="Georgia, serif">Georgia</option>
                                            <option value="'Courier New', Courier, monospace">Courier</option>
                                            <option value="Outfit, sans-serif">Outfit</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Tamaño (px)</label>
                                        <input
                                            type="number"
                                            className="w-full text-sm border-gray-200 rounded-lg bg-gray-50 focus:ring-brand-500 focus:border-brand-500"
                                            value={selectedElement.style.fontSize}
                                            onChange={(e) => updateElementStyle(selectedElement.id, { fontSize: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Color</label>
                                        <div className="flex gap-2 items-center">
                                            <input
                                                type="color"
                                                className="h-8 w-8 rounded cursor-pointer border-0 p-0"
                                                value={selectedElement.style.color}
                                                onChange={(e) => updateElementStyle(selectedElement.id, { color: e.target.value })}
                                            />
                                            <span className="text-xs text-gray-500 uppercase font-mono">{selectedElement.style.color}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Estilos</label>
                                    <div className="flex items-center gap-2">
                                        <button type="button"
                                            onClick={() => updateElementStyle(selectedElement.id, { fontWeight: selectedElement.style.fontWeight === 'bold' ? 'normal' : 'bold' })}
                                            className={`p-2 rounded-lg border ${selectedElement.style.fontWeight === 'bold' ? 'bg-brand-50 border-brand-200 text-brand-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                            title="Negrita"
                                        >
                                            <Bold className="w-4 h-4" />
                                        </button>
                                        <div className="h-6 w-px bg-gray-200 mx-1"></div>
                                        <button type="button"
                                            onClick={() => updateElementStyle(selectedElement.id, { textAlign: 'left' })}
                                            className={`p-2 rounded-lg border ${selectedElement.style.textAlign === 'left' ? 'bg-brand-50 border-brand-200 text-brand-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                            title="Izquierda"
                                        >
                                            <AlignLeft className="w-4 h-4" />
                                        </button>
                                        <button type="button"
                                            onClick={() => updateElementStyle(selectedElement.id, { textAlign: 'center' })}
                                            className={`p-2 rounded-lg border ${selectedElement.style.textAlign === 'center' ? 'bg-brand-50 border-brand-200 text-brand-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                            title="Centro"
                                        >
                                            <AlignCenter className="w-4 h-4" />
                                        </button>
                                        <button type="button"
                                            onClick={() => updateElementStyle(selectedElement.id, { textAlign: 'right' })}
                                            className={`p-2 rounded-lg border ${selectedElement.style.textAlign === 'right' ? 'bg-brand-50 border-brand-200 text-brand-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                            title="Derecha"
                                        >
                                            <AlignRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="pt-4 border-t border-gray-100 mt-2">
                            <button
                                type="button"
                                onClick={() => deleteElement(selectedElement.id)}
                                className="w-full flex justify-center items-center gap-2 px-4 py-2 text-sm text-error-600 hover:bg-error-50 border border-transparent hover:border-error-200 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                Eliminar Elemento
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 p-6">
                        <div className="w-16 h-16 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center mb-4">
                            <Type className="w-6 h-6 text-gray-300" />
                        </div>
                        <p className="text-sm">Selecciona un elemento en el lienzo para ver y editar sus propiedades.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
