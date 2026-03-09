"use client"
import { useRef, useCallback, useState, useEffect } from "react"
import toast from "react-hot-toast"

interface RichTextEditorProps {
    value: string
    onChange: (html: string) => void
    placeholder?: string
    minHeight?: string
    label?: string
    optional?: boolean
}

export default function RichTextEditor({
    value,
    onChange,
    placeholder = "Escribir contenido...",
    minHeight = "200px",
    label,
    optional = true
}: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null)
    const aiMenuRef = useRef<HTMLDivElement>(null)
    const aiBtnWrapperRef = useRef<HTMLDivElement>(null)
    const floatingAiRef = useRef<HTMLDivElement>(null)
    const savedSelectionRef = useRef<Range | null>(null)
    const [aiLoading, setAiLoading] = useState(false)
    const [showGenerateModal, setShowGenerateModal] = useState(false)
    const [generatePrompt, setGeneratePrompt] = useState("")
    const lastValueRef = useRef(value)

    // Sync value prop to editor when it changes externally (e.g., async data load)
    useEffect(() => {
        if (editorRef.current && value !== lastValueRef.current) {
            // Only update if the editor doesn't have focus (avoid cursor jumping)
            if (document.activeElement !== editorRef.current) {
                editorRef.current.innerHTML = value || `<p>${placeholder}</p>`
            }
            lastValueRef.current = value
        }
    }, [value, placeholder])

    const execCmd = useCallback((cmd: string, val?: string) => {
        document.execCommand(cmd, false, val)
    }, [])

    const saveSelection = () => {
        const sel = window.getSelection()
        if (sel && sel.rangeCount > 0) {
            savedSelectionRef.current = sel.getRangeAt(0).cloneRange()
        }
    }

    const hideFloatingBubble = () => {
        if (floatingAiRef.current) floatingAiRef.current.style.display = 'none'
    }

    const hideAiMenu = () => {
        if (aiMenuRef.current) aiMenuRef.current.style.display = 'none'
    }

    const handleMouseUp = () => {
        saveSelection()
        const sel = window.getSelection()
        const selectedText = sel?.toString()?.trim() || ""
        if (selectedText && floatingAiRef.current && editorRef.current) {
            const range = sel!.getRangeAt(0)
            const rect = range.getBoundingClientRect()
            const editorRect = editorRef.current.closest('.rte-wrapper')?.getBoundingClientRect()
            if (editorRect) {
                floatingAiRef.current.style.left = `${rect.left + rect.width / 2 - editorRect.left}px`
                floatingAiRef.current.style.top = `${rect.top - editorRect.top - 8}px`
                floatingAiRef.current.style.display = 'flex'
            }
        } else {
            hideFloatingBubble()
        }
    }

    const handleAiAction = async (action: string) => {
        const editorEl = editorRef.current
        const sel = window.getSelection()
        const selectedText = sel?.toString()?.trim() || ""
        const editorHtml = editorEl?.innerHTML || ""

        if (action === 'generar') {
            hideAiMenu()
            hideFloatingBubble()
            setShowGenerateModal(true)
            return
        }

        if (!selectedText) {
            toast.error("Selecciona texto primero para usar la IA")
            return
        }

        hideAiMenu()
        hideFloatingBubble()
        setAiLoading(true)

        try {
            const res = await fetch("/api/ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, text: selectedText, context: label || "Contenido" })
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || "Error de IA")
                setAiLoading(false)
                return
            }

            const result = data.result || ""
            const resultHtml = result.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")

            if (editorEl) {
                const temp = document.createElement("div")
                temp.innerHTML = editorEl.innerHTML
                const plainText = temp.textContent || ""
                const selIdx = plainText.indexOf(selectedText)

                if (selIdx !== -1) {
                    const walker = document.createTreeWalker(editorEl, NodeFilter.SHOW_TEXT)
                    let charCount = 0
                    let startNode: Text | null = null
                    let startOffset = 0
                    let endNode: Text | null = null
                    let endOffset = 0
                    const selEnd = selIdx + selectedText.length

                    while (walker.nextNode()) {
                        const node = walker.currentNode as Text
                        const nodeLen = node.textContent?.length || 0
                        if (!startNode && charCount + nodeLen > selIdx) {
                            startNode = node
                            startOffset = selIdx - charCount
                        }
                        if (charCount + nodeLen >= selEnd) {
                            endNode = node
                            endOffset = selEnd - charCount
                            break
                        }
                        charCount += nodeLen
                    }

                    if (startNode && endNode) {
                        const range = document.createRange()
                        range.setStart(startNode, startOffset)
                        range.setEnd(endNode, endOffset)
                        range.deleteContents()

                        const frag = document.createDocumentFragment()
                        const span = document.createElement("span")
                        span.innerHTML = resultHtml
                        while (span.firstChild) frag.appendChild(span.firstChild)
                        range.insertNode(frag)

                        onChange(editorEl.innerHTML)
                    }
                }
            }

            const labels: Record<string, string> = { mejorar: "Texto mejorado", resumir: "Texto resumido", expandir: "Texto expandido" }
            toast.success(`IA: ${labels[action] || action}`, {
                style: { background: '#F0FDF4', color: '#166534', border: '1px solid #4ADE80' },
                iconTheme: { primary: '#22C55E', secondary: '#F0FDF4' }
            })
        } catch (err) {
            console.error("AI error:", err)
            toast.error("Error al conectar con el servicio de IA")
        }
        setAiLoading(false)
    }

    const handleGenerateSubmit = async () => {
        if (!generatePrompt.trim()) {
            toast.error("Escribe sobre qué quieres generar")
            return
        }
        const editorEl = editorRef.current

        const pageText = editorEl?.textContent || ""

        setShowGenerateModal(false)
        setGeneratePrompt("")
        setAiLoading(true)

        try {
            const res = await fetch("/api/ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: 'generar',
                    text: generatePrompt.trim(),
                    context: label || "Contenido",
                    pageContext: pageText
                })
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || "Error de IA")
                setAiLoading(false)
                return
            }
            const result = data.result || ""
            const resultHtml = `<p>${result.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}</p>`

            if (editorEl) {
                editorEl.innerHTML += resultHtml
                onChange(editorEl.innerHTML)
            }

            toast.success('IA: Contenido generado', {
                style: { background: '#F0FDF4', color: '#166534', border: '1px solid #4ADE80' },
                iconTheme: { primary: '#22C55E', secondary: '#F0FDF4' }
            })
        } catch (err) {
            console.error("AI generate error:", err)
            toast.error("Error al conectar con el servicio de IA")
        }
        setAiLoading(false)
    }

    // Close AI menus on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const target = e.target as Node
            if (aiMenuRef.current && !aiMenuRef.current.contains(target) && !aiBtnWrapperRef.current?.contains(target)) {
                aiMenuRef.current.style.display = 'none'
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const TBtn = ({ cmd, label: btnLabel, style, val }: { cmd: string, label: string, style?: React.CSSProperties, val?: string }) => (
        <button type="button" onMouseDown={e => { e.preventDefault(); execCmd(cmd, val) }}
            className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded transition-colors" title={btnLabel} style={style}
        >{btnLabel}</button>
    )

    return (
        <div className="rte-wrapper relative flex flex-col" style={{ height: minHeight }}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {label} {optional && <span className="text-gray-400 font-normal">(opcional)</span>}
                </label>
            )}
            <style>{`
                .rte-editor { letter-spacing: normal !important; word-spacing: normal !important; }
                .rte-editor h1 { font-size: 1.5rem !important; font-weight: 700 !important; margin: 12px 0 6px !important; text-transform: uppercase !important; color: #111827 !important; }
                .rte-editor h2 { font-size: 1.25rem !important; font-weight: 700 !important; margin: 10px 0 4px !important; text-transform: uppercase !important; color: #1f2937 !important; }
                .rte-editor h3 { font-size: 1.1rem !important; font-weight: 600 !important; margin: 8px 0 4px !important; text-transform: capitalize !important; color: #374151 !important; }
                .rte-editor p { font-size: 0.875rem !important; margin: 4px 0 !important; }
                .rte-editor ul { padding-left: 24px; margin: 8px 0; list-style-type: disc !important; }
                .rte-editor ol { padding-left: 24px; margin: 8px 0; list-style-type: decimal !important; }
                .rte-editor li { margin: 4px 0; display: list-item !important; }
            `}</style>
            {/* Toolbar - fixed at top */}
            <div className="flex items-center gap-0.5 bg-gray-50 border border-gray-200 rounded-t-lg px-2 py-1 flex-wrap flex-shrink-0">
                <TBtn cmd="formatBlock" val="h2" label="T" style={{ fontWeight: 800, fontSize: 13 }} />
                <TBtn cmd="formatBlock" val="h3" label="t" style={{ fontWeight: 700, fontSize: 12 }} />
                <TBtn cmd="formatBlock" val="p" label="¶" style={{ fontSize: 12, color: '#6b7280' }} />
                <span className="w-px h-4 bg-gray-300 mx-1" />
                <TBtn cmd="bold" label="B" style={{ fontWeight: 700 }} />
                <TBtn cmd="italic" label="I" style={{ fontStyle: 'italic' }} />
                <TBtn cmd="underline" label="U" style={{ textDecoration: 'underline' }} />
                <span className="w-px h-4 bg-gray-300 mx-1" />
                <TBtn cmd="insertOrderedList" label="1." />
                <TBtn cmd="insertUnorderedList" label="•" />
                <span className="w-px h-4 bg-gray-300 mx-1" />
                <TBtn cmd="justifyLeft" label="☰" />
                <TBtn cmd="justifyCenter" label="☰" style={{ textAlign: 'center' }} />
                <TBtn cmd="justifyFull" label="☰" />
                <span className="w-px h-4 bg-gray-300 mx-1" />
                {/* AI Button */}
                <div className="relative" ref={aiBtnWrapperRef}>
                    <button
                        type="button"
                        onClick={() => {
                            if (aiMenuRef.current) {
                                aiMenuRef.current.style.display = aiMenuRef.current.style.display === 'none' ? 'block' : 'none'
                            }
                        }}
                        disabled={aiLoading}
                        className={`h-7 px-2 flex items-center gap-1 text-xs font-semibold rounded transition-colors ${aiLoading ? 'bg-purple-100 text-purple-400 cursor-wait' : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 shadow-sm'}`}
                        title="Asistente IA"
                    >
                        {aiLoading ? (
                            <div className="w-3.5 h-3.5 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
                        ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                        )}
                        IA
                    </button>
                    <div ref={aiMenuRef} className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl border border-gray-200 shadow-xl py-1.5 min-w-[600px]" style={{ display: 'none' }} onMouseDown={e => e.preventDefault()}>
                        <button onMouseDown={e => { e.preventDefault(); handleAiAction('mejorar') }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors">
                            <span className="text-base">✨</span> Mejorar / Reescribir
                        </button>
                        <button onMouseDown={e => { e.preventDefault(); handleAiAction('generar') }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors">
                            <span className="text-base">📝</span> Generar contenido
                        </button>
                        <button onMouseDown={e => { e.preventDefault(); handleAiAction('resumir') }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors">
                            <span className="text-base">📋</span> Resumir
                        </button>
                        <button onMouseDown={e => { e.preventDefault(); handleAiAction('expandir') }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors">
                            <span className="text-base">📖</span> Expandir
                        </button>
                    </div>
                </div>
            </div>
            {/* Scrollable editor area */}
            <div className="flex-1 overflow-y-auto border border-t-0 border-gray-200 rounded-b-lg">
                <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    className="rte-editor outline-none text-sm leading-relaxed text-gray-900 p-4"
                    style={{ minHeight: '100%' }}
                    dangerouslySetInnerHTML={{ __html: value || `<p>${placeholder}</p>` }}
                    onBlur={e => {
                        const el = e.currentTarget
                        if (el) {
                            const html = el.innerHTML
                            lastValueRef.current = html
                            onChange(html)
                        }
                    }}
                    onMouseUp={handleMouseUp}
                    onKeyUp={handleMouseUp}
                />
            </div>
            {/* Floating AI bubble on text selection */}
            <div
                ref={floatingAiRef}
                className="absolute z-[9999] flex items-center gap-0.5 bg-white border border-gray-200 rounded-xl shadow-2xl px-1.5 py-1"
                style={{ display: 'none', transform: 'translate(-50%, -100%)' }}
                onMouseDown={e => e.preventDefault()}
            >
                <button onMouseDown={e => { e.preventDefault(); handleAiAction('mejorar') }} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-purple-50 hover:text-purple-600 rounded-lg transition-colors" title="Mejorar texto seleccionado">
                    <span>✨</span> Mejorar
                </button>
                <span className="w-px h-4 bg-gray-200" />
                <button onMouseDown={e => { e.preventDefault(); handleAiAction('resumir') }} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-purple-50 hover:text-purple-600 rounded-lg transition-colors" title="Resumir texto seleccionado">
                    <span>📋</span> Resumir
                </button>
                <span className="w-px h-4 bg-gray-200" />
                <button onMouseDown={e => { e.preventDefault(); handleAiAction('expandir') }} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-purple-50 hover:text-purple-600 rounded-lg transition-colors" title="Expandir texto seleccionado">
                    <span>📖</span> Expandir
                </button>
            </div>
            {/* Generate content modal */}
            {showGenerateModal && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-gray-900/50 p-4" onMouseDown={e => { if (e.target === e.currentTarget) setShowGenerateModal(false) }}>
                    <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="text-xl">📝</span> Generar Contenido con IA
                        </h3>
                        <textarea
                            value={generatePrompt}
                            onChange={e => setGeneratePrompt(e.target.value)}
                            placeholder="Describe qué contenido quieres generar..."
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 min-h-[100px] focus:border-purple-300 focus:outline-none focus:ring-3 focus:ring-purple-500/10 resize-none"
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerateSubmit() }}
                        />
                        <div className="flex gap-3 mt-4">
                            <button type="button" onClick={() => setShowGenerateModal(false)} className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</button>
                            <button type="button" onClick={handleGenerateSubmit} className="flex-1 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 px-4 py-2.5 text-sm font-medium text-white hover:from-purple-600 hover:to-indigo-600 shadow-sm transition-colors">Generar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
