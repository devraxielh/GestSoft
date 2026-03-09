"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import toast from "react-hot-toast"
import dynamic from "next/dynamic"
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false })
import "react-quill-new/dist/quill.snow.css"
import PersonFormModal from "@/components/PersonFormModal"
import RichTextEditor from "@/components/RichTextEditor"

interface Documento {
    id: number
    type: string
    year: number
    description: string | null
    status: string | null
    content: string | null
    coverPage: string | null
    contextoInstitucional: string | null
    misionInstitucional: string | null
    visionInstitucional: string | null
    program?: { id: number; name: string; type?: string; faculty?: { name: string; sede?: { id: number; name: string; contextoInstitucional?: string | null; misionInstitucional?: string | null; visionInstitucional?: string | null } } }
}

interface FactorParam {
    id: number
    number: number
    name: string
    description: string | null
}

interface TeamMember {
    name: string
    role: string
}

interface TeamsData {
    directivo: TeamMember[]
    construccion: TeamMember[]
    apoyo: TeamMember[]
}

interface Paragraph {
    id: string
    title: string
    content: string
}

interface FactorContent {
    factorId: number
    factorNumber: number
    factorName: string
    paragraphs: Paragraph[]
}

interface DocData {
    paginaInicial: string
    contextoInstitucional: string
    teams: TeamsData
    factors: FactorContent[]
}

export default function DocumentoEditorPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    const [doc, setDoc] = useState<Documento | null>(null)
    const [coverImage, setCoverImage] = useState("")
    const [factorParams, setFactorParams] = useState<FactorParam[]>([])
    const emptyTeams: TeamsData = { directivo: [], construccion: [], apoyo: [] }
    const [docData, setDocData] = useState<DocData>({ paginaInicial: "", contextoInstitucional: "", teams: emptyTeams, factors: [] })
    const [activeTab, setActiveTab] = useState<string>("inicio")
    const [editingParagraph, setEditingParagraph] = useState<{ factorId: number; paragraphId: string } | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [autoSaved, setAutoSaved] = useState(false)
    const [newMember, setNewMember] = useState<{ [key: string]: { name: string; role: string } }>({})
    const [directivos, setDirectivos] = useState<any[]>([])
    const [personas, setPersonas] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState<{ [key: string]: string }>({})
    const [showDropdown, setShowDropdown] = useState<{ [key: string]: boolean }>({})
    const [showPersonModal, setShowPersonModal] = useState(false)
    const [sedeData, setSedeData] = useState({ contextoInstitucional: "", misionInstitucional: "", visionInstitucional: "", presentacionFacultad: "", presentacionPrograma: "" })
    const sedeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [aiLoading, setAiLoading] = useState(false)
    const aiMenuRef = useRef<HTMLDivElement | null>(null)
    const floatingAiRef = useRef<HTMLDivElement | null>(null)
    const savedSelectionRef = useRef<Range | null>(null)
    const activeEditorRef = useRef<HTMLElement | null>(null)
    const activeFieldRef = useRef<string>("")
    const [showGenerateModal, setShowGenerateModal] = useState(false)
    const [generatePrompt, setGeneratePrompt] = useState("")

    const fetchDoc = useCallback(async () => {
        try {
            const [docRes, factoresRes, directivosRes, personasRes] = await Promise.all([
                fetch(`/api/documentos/${id}`),
                fetch("/api/factores"),
                fetch("/api/directivos"),
                fetch("/api/personas")
            ])
            if (!docRes.ok) {
                toast.error("Documento no encontrado")
                router.push("/dashboard/documentos")
                return
            }
            const data = await docRes.json()
            const factores: FactorParam[] = factoresRes.ok ? await factoresRes.json() : []
            const dirs = directivosRes.ok ? await directivosRes.json() : []
            const pers = personasRes.ok ? await personasRes.json() : []
            setDoc(data)
            setCoverImage(data.coverPage || "")
            setFactorParams(factores)
            setDirectivos(dirs)
            setPersonas(pers)

            // Initialize contexto data from document fields (fallback to sede)
            const sede = data?.program?.faculty?.sede
            const hasContent = (html: string | null | undefined) => {
                if (!html) return false
                return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0
            }
            setSedeData({
                contextoInstitucional: data.contextoInstitucional || sede?.contextoInstitucional || "",
                misionInstitucional: data.misionInstitucional || sede?.misionInstitucional || "",
                visionInstitucional: data.visionInstitucional || sede?.visionInstitucional || "",
                presentacionFacultad: data.presentacionFacultad || data.program?.faculty?.presentation || "",
                presentacionPrograma: data.presentacionPrograma || data.program?.presentation || ""
            })

            // Parse saved data
            let saved: DocData = { paginaInicial: "", contextoInstitucional: "", teams: emptyTeams, factors: [] }
            if (data.content) {
                try {
                    const parsed = JSON.parse(data.content)
                    if (parsed.teams !== undefined || parsed.team !== undefined || parsed.paginaInicial !== undefined) {
                        saved = parsed
                        // Migration from old single team array
                        if (parsed.team && !parsed.teams) {
                            saved.teams = { directivo: parsed.team, construccion: [], apoyo: [] }
                        }
                    } else if (Array.isArray(parsed)) {
                        // Migration from old format
                        saved.factors = parsed.map((f: any) => ({
                            ...f,
                            paragraphs: f.paragraphs || (f.content ? [{ id: "p1", title: "Contenido", content: f.content }] : [])
                        }))
                    }
                } catch { /* empty */ }
            }

            // Merge factors
            const merged = factores.map(fp => {
                const existing = saved.factors.find(sf => sf.factorId === fp.id)
                return {
                    factorId: fp.id,
                    factorNumber: fp.number,
                    factorName: fp.name,
                    paragraphs: existing?.paragraphs || []
                }
            })
            setDocData({ paginaInicial: saved.paginaInicial || "", contextoInstitucional: saved.contextoInstitucional || "", teams: saved.teams || emptyTeams, factors: merged })
        } catch {
            toast.error("Error al cargar el documento")
        }
        setLoading(false)
    }, [id, router])

    useEffect(() => { fetchDoc() }, [fetchDoc])

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await fetch(`/api/documentos/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: doc?.type,
                    year: String(doc?.year),
                    programId: String(doc?.program?.id),
                    description: doc?.description,
                    status: doc?.status,
                    content: JSON.stringify(docData),
                    coverPage: coverImage || null,
                    contextoInstitucional: sedeData.contextoInstitucional || null,
                    misionInstitucional: sedeData.misionInstitucional || null,
                    visionInstitucional: sedeData.visionInstitucional || null
                })
            })
            if (res.ok) {
                toast.success("Documento guardado", {
                    style: { background: '#F0FDF4', color: '#166534', border: '1px solid #4ADE80' },
                    iconTheme: { primary: '#22C55E', secondary: '#F0FDF4' }
                })
            } else { toast.error("Error al guardar") }
        } catch { toast.error("Error de conexión") }
        setSaving(false)
    }

    const generatePDF = async () => {
        try {
            const { jsPDF } = await import("jspdf")
            const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" })
            const pw = 216, ph = 279, mx = 25, mxr = 25
            const cw = pw - mx - mxr
            let y = 25

            const addPage = () => { pdf.addPage(); y = 25 }
            const checkPage = (need: number) => { if (y + need > ph - 20) addPage() }

            const stripHtml = (html: string) => {
                // If no HTML tags, return as-is (plain text)
                if (!/<[^>]+>/g.test(html)) return html
                let clean = html
                    .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, content: string) => { let idx = 0; return content.replace(/<li[^>]*>/gi, () => `\n${++idx}. `) })
                    .replace(/<li[^>]*>/gi, "\n• ")
                    .replace(/<\/li>/gi, "").replace(/<\/p>/gi, "\n").replace(/<\/div>/gi, "\n").replace(/<br\s*\/?>/gi, "\n")
                    .replace(/<\/h[1-6]>/gi, "\n").replace(/<\/?ul[^>]*>/gi, "").replace(/<\/?ol[^>]*>/gi, "")
                const tmp = document.createElement("div")
                tmp.innerHTML = clean
                return (tmp.textContent || tmp.innerText || "").replace(/\n{3,}/g, "\n\n")
            }

            const wrapText = (text: string, maxW: number, fontSize: number): string[] => {
                pdf.setFontSize(fontSize)
                const words = text.split(" ").filter(w => w)
                const lines: string[] = []
                let line = ""
                for (const w of words) {
                    const test = line ? line + " " + w : w
                    if (pdf.getTextWidth(test) > maxW && line) { lines.push(line); line = w } else { line = test }
                }
                if (line) lines.push(line)
                return lines.length ? lines : [""]
            }

            // Draw justified paragraph with proper line spacing
            const drawJustified = (text: string, fontSize: number, indent: number = 0) => {
                const availW = cw - indent
                const lines = wrapText(text, availW, fontSize)
                pdf.setFontSize(fontSize)
                const lineH = fontSize * 0.5 + 1.5 // proportional line height
                for (let i = 0; i < lines.length; i++) {
                    checkPage(lineH + 2)
                    const line = lines[i]
                    const isLast = i === lines.length - 1
                    const xStart = mx + indent
                    if (!isLast && line.trim()) {
                        const words = line.split(" ").filter((w: string) => w)
                        const textW = words.reduce((s: number, w: string) => s + pdf.getTextWidth(w), 0)
                        const gap = words.length > 1 ? (availW - textW) / (words.length - 1) : 0
                        // Adaptive max gap: more words = allow more gap (looks natural)
                        const maxGap = words.length >= 6 ? 3 : words.length >= 4 ? 2.5 : 1.5
                        if (words.length >= 3 && gap > 0 && gap <= maxGap) {
                            let x = xStart
                            for (const word of words) { pdf.text(word, x, y); x += pdf.getTextWidth(word) + gap }
                        } else {
                            pdf.text(line, xStart, y)
                        }
                    } else { pdf.text(line, xStart, y) }
                    y += lineH
                }
            }

            // Shared block renderer for consistent PDF output
            const renderBlocks = (blocks: { tag: string, text: string, bold?: boolean, italic?: boolean, imgSrc?: string, caption?: string }[]) => {
                let prevTag = ''
                for (let i = 0; i < blocks.length; i++) {
                    const block = blocks[i]
                    if (block.tag === 'br') {
                        y += 3
                        prevTag = 'br'
                        continue
                    }
                    if (!block.text.trim()) continue

                    if (block.tag === 'h1') {
                        if (i > 0) y += 8
                        checkPage(14)
                        pdf.setFont("helvetica", "bold"); pdf.setFontSize(14); pdf.setTextColor(0, 0, 0)
                        const lines = wrapText(block.text.toUpperCase(), cw, 14)
                        for (const line of lines) { checkPage(8); pdf.text(line, mx, y); y += 7 }
                        y += 3
                    } else if (block.tag === 'h2') {
                        if (i > 0) y += 6
                        checkPage(12)
                        pdf.setFont("helvetica", "bold"); pdf.setFontSize(12); pdf.setTextColor(0, 0, 0)
                        const lines = wrapText(block.text.toUpperCase(), cw, 12)
                        for (const line of lines) { checkPage(7); pdf.text(line, mx, y); y += 6 }
                        y += 2
                    } else if (block.tag === 'h3') {
                        if (i > 0) y += 4
                        checkPage(10)
                        pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(0, 0, 0)
                        const capText = block.text.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                        const lines = wrapText(capText, cw, 11)
                        for (const line of lines) { checkPage(7); pdf.text(line, mx, y); y += 5.5 }
                        y += 2
                    } else if (block.tag === 'img' && block.imgSrc) {
                        // Render image in PDF
                        try {
                            const imgEl = document.createElement('img')
                            imgEl.src = block.imgSrc
                            // Calculate dimensions to fit within content width
                            const maxImgW = cw * 0.7 // 70% of content width
                            const maxImgH = 80 // max 80mm height
                            let imgW = maxImgW
                            let imgH = maxImgH
                            if (imgEl.naturalWidth && imgEl.naturalHeight) {
                                const ratio = imgEl.naturalWidth / imgEl.naturalHeight
                                imgW = Math.min(maxImgW, maxImgH * ratio)
                                imgH = imgW / ratio
                            }
                            checkPage(imgH + 15)
                            const imgX = mx + (cw - imgW) / 2 // center
                            y += 3
                            pdf.addImage(block.imgSrc, 'JPEG', imgX, y, imgW, imgH)
                            y += imgH + 2
                            // Caption
                            if (block.caption) {
                                pdf.setFont("helvetica", "italic"); pdf.setFontSize(8); pdf.setTextColor(100, 100, 100)
                                const capLines = wrapText(block.caption, cw * 0.8, 8)
                                for (const cl of capLines) {
                                    const capX = mx + (cw - pdf.getTextWidth(cl)) / 2
                                    pdf.text(cl, capX, y); y += 4
                                }
                                pdf.setTextColor(0, 0, 0)
                            }
                            y += 3
                        } catch (e) {
                            console.error('Error rendering image in PDF:', e)
                        }
                    } else if (block.tag === 'li') {
                        if (prevTag !== 'li') y += 1 // gap before first list item
                        checkPage(6)
                        const liFont = block.bold && block.italic ? 'bolditalic' : block.bold ? 'bold' : block.italic ? 'italic' : 'normal'
                        pdf.setFont("helvetica", liFont); pdf.setFontSize(10); pdf.setTextColor(0, 0, 0)
                        // Draw bullet then justified indented text
                        pdf.text("\u2022", mx, y)
                        drawJustified(block.text, 10, 5)
                        y += 1
                    } else {
                        // p, div — paragraph text
                        if (prevTag && prevTag !== 'br' && prevTag !== 'p') y += 1
                        checkPage(6)
                        const pFont = block.bold && block.italic ? 'bolditalic' : block.bold ? 'bold' : block.italic ? 'italic' : 'normal'
                        pdf.setFont("helvetica", pFont); pdf.setFontSize(10); pdf.setTextColor(0, 0, 0)
                        drawJustified(block.text, 10)
                        y += 2
                    }
                    prevTag = block.tag
                }
            }

            // Build page title text
            const defaultPagIni = [
                doc?.type === "Registro Calificado" ? "DOCUMENTO DE SOLICITUD DE CREACIÓN DE PROGRAMAS NUEVOS" : doc?.type?.toUpperCase() || "DOCUMENTO",
                "", "", "", "",
                "PROGRAMA DE",
                doc?.program?.name?.toUpperCase() || "",
                "", "", "", "",
                doc?.program?.faculty?.name?.toUpperCase() || "FACULTAD",
                "", "", "", "",
                doc?.program?.faculty?.sede?.name?.toUpperCase() || "UNIVERSIDAD",
                "SEDE MONTERÍA",
                "", "", "",
                `MONTERÍA (${new Date().getDate().toString().padStart(2, "0")} – ${(new Date().getMonth() + 1).toString().padStart(2, "0")} – ${doc?.year || new Date().getFullYear()})`
            ].join("\n")
            const pagIniText = docData.paginaInicial || defaultPagIni

            // 1. PORTADA
            if (coverImage) {
                try { pdf.addImage(coverImage, "JPEG", 0, 0, pw, ph) } catch (e) { console.error("Cover error:", e) }
                // Document type and program name at bottom-right
                const coverLines = [
                    doc?.type === "Registro Calificado" ? "DOCUMENTO DE SOLICITUD DE CREACIÓN DE PROGRAMAS NUEVOS" : doc?.type?.toUpperCase() || "DOCUMENTO",
                    `PROGRAMA DE ${doc?.program?.name?.toUpperCase() || ""}`
                ].filter(l => l.trim())
                pdf.setFont("helvetica", "bolditalic")
                pdf.setFontSize(12)
                pdf.setTextColor(255, 255, 255)
                // Wrap lines that are too wide
                const maxCoverW = pw * 0.52
                const allCoverLines: string[] = []
                for (const cl of coverLines) {
                    const wrapped = wrapText(cl, maxCoverW, 16)
                    allCoverLines.push(...wrapped)
                }
                let ty = ph - 22
                for (let i = allCoverLines.length - 1; i >= 0; i--) {
                    pdf.text(allCoverLines[i], pw - 15, ty, { align: "right" })
                    ty -= 6
                }
                pdf.setTextColor(0, 0, 0)
                addPage()
            }

            // 2. PÁGINA INICIAL
            {
                pdf.setFont("helvetica", "bold")
                for (const pl of pagIniText.split("\n")) {
                    if (!pl.trim()) { y += 8; continue }
                    const wrapped = wrapText(pl, cw, 13)
                    for (const wl of wrapped) { checkPage(8); pdf.setFontSize(13); pdf.text(wl, pw / 2, y, { align: "center" }); y += 7 }
                }
                addPage()
            }

            // 3. EQUIPO
            const teamSections = [
                { title: "Equipo Directivo", data: docData.teams.directivo },
                { title: "Equipo Responsable de la Construcción del Documento", data: docData.teams.construccion },
                { title: "Equipo de Apoyo y Soporte de Aseguramiento de la Calidad", data: docData.teams.apoyo }
            ]
            if (teamSections.some(s => s.data.length > 0)) {
                for (const section of teamSections) {
                    if (section.data.length === 0) continue
                    checkPage(30)
                    pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(0, 0, 0)
                    pdf.text(section.title, mx, y); y += 6
                    const col1W = cw * 0.5, col2W = cw * 0.5, rh = 7
                    pdf.setFillColor(139, 0, 0); pdf.rect(mx, y, cw, rh, "F")
                    pdf.setDrawColor(100, 0, 0); pdf.rect(mx, y, col1W, rh, "S"); pdf.rect(mx + col1W, y, col2W, rh, "S")
                    pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.setTextColor(255, 255, 255)
                    pdf.text("Nombres y Apellidos", mx + 3, y + 5); pdf.text("Cargo", mx + col1W + 3, y + 5); y += rh
                    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(0, 0, 0)
                    for (const m of section.data) {
                        checkPage(rh + 2); pdf.setDrawColor(180, 180, 180)
                        pdf.rect(mx, y, col1W, rh, "S"); pdf.rect(mx + col1W, y, col2W, rh, "S")
                        pdf.text((m.name || "").substring(0, 45), mx + 3, y + 5)
                        pdf.text((m.role || "—").substring(0, 50), mx + col1W + 3, y + 5); y += rh
                    }
                    y += 10
                }
                addPage()
            }

            // Helper: parse HTML into blocks with their tag types (uses DOM for reliability)
            const parseHtmlBlocks = (html: string): { tag: string, text: string, bold?: boolean, italic?: boolean, imgSrc?: string, caption?: string }[] => {
                if (!html || !html.trim()) return []
                const blocks: { tag: string, text: string, bold?: boolean, italic?: boolean, imgSrc?: string, caption?: string }[] = []
                const container = document.createElement("div")
                container.innerHTML = html

                const detectFormat = (el: HTMLElement): { bold: boolean, italic: boolean } => {
                    const html = el.innerHTML
                    const style = el.getAttribute('style') || ''
                    const bold = !!el.querySelector('b, strong') || style.includes('font-weight: bold') || style.includes('font-weight:bold') || el.tagName === 'B' || el.tagName === 'STRONG'
                    const italic = !!el.querySelector('i, em') || style.includes('font-style: italic') || style.includes('font-style:italic') || el.tagName === 'I' || el.tagName === 'EM'
                    return { bold, italic }
                }

                const processNode = (node: Node) => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        const text = (node.textContent || "").trim()
                        if (text) blocks.push({ tag: 'p', text })
                        return
                    }
                    if (node.nodeType !== Node.ELEMENT_NODE) return
                    const el = node as HTMLElement
                    const tagName = el.tagName.toLowerCase()

                    // BR = line break (empty line)
                    if (tagName === 'br') {
                        blocks.push({ tag: 'br', text: '' })
                        return
                    }

                    // Images
                    if (tagName === 'img') {
                        const src = el.getAttribute('src') || ''
                        const alt = el.getAttribute('alt') || ''
                        if (src) blocks.push({ tag: 'img', text: '', imgSrc: src, caption: alt })
                        return
                    }

                    // Figure containers (rte-figure)
                    if (el.classList?.contains('rte-figure') || (tagName === 'div' && el.querySelector('img'))) {
                        const img = el.querySelector('img')
                        if (img) {
                            const src = img.getAttribute('src') || ''
                            const captionEl = el.querySelector('.rte-caption, figcaption, p')
                            const caption = captionEl?.textContent?.trim() || img.getAttribute('alt') || ''
                            if (src) blocks.push({ tag: 'img', text: '', imgSrc: src, caption })
                            return
                        }
                    }

                    // Block-level elements
                    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'blockquote'].includes(tagName)) {
                        // Check if this element contains other block-level children
                        const hasNestedBlocks = el.querySelector('h1, h2, h3, h4, h5, h6, p, div, ul, ol, blockquote')
                        if (hasNestedBlocks) {
                            // Recurse into children to handle each block separately
                            for (const child of Array.from(el.childNodes)) {
                                processNode(child)
                            }
                            return
                        }
                        const text = (el.textContent || "").trim()
                        if (text) {
                            const fmt = detectFormat(el)
                            blocks.push({ tag: tagName, text, bold: fmt.bold, italic: fmt.italic })
                        } else {
                            // Empty block = line break
                            blocks.push({ tag: 'br', text: '' })
                        }
                        return
                    }

                    // Lists
                    if (tagName === 'ul' || tagName === 'ol') {
                        const items = el.querySelectorAll('li')
                        let idx = 0
                        items.forEach(li => {
                            idx++
                            const text = (li.textContent || "").trim()
                            if (text) {
                                const prefix = tagName === 'ol' ? `${idx}. ` : ''
                                const fmt = detectFormat(li as HTMLElement)
                                blocks.push({ tag: 'li', text: prefix + text, bold: fmt.bold, italic: fmt.italic })
                            }
                        })
                        return
                    }

                    // Bold/italic wrappers at top level
                    if (['b', 'strong', 'i', 'em', 'u', 'span'].includes(tagName)) {
                        const text = (el.textContent || "").trim()
                        if (text) {
                            const bold = tagName === 'b' || tagName === 'strong' || !!el.querySelector('b, strong')
                            const italic = tagName === 'i' || tagName === 'em' || !!el.querySelector('i, em')
                            blocks.push({ tag: 'p', text, bold, italic })
                        }
                        return
                    }

                    // Other elements — recurse into children
                    for (const child of Array.from(node.childNodes)) {
                        processNode(child)
                    }
                }

                for (const child of Array.from(container.childNodes)) {
                    processNode(child)
                }

                // Fallback: if nothing parsed, use stripHtml
                if (blocks.length === 0) {
                    const plainText = stripHtml(html).trim()
                    if (plainText) {
                        for (const para of plainText.split("\n").filter(l => l.trim())) {
                            blocks.push({ tag: 'p', text: para.trim() })
                        }
                    }
                }
                return blocks
            }

            // 4. CONTEXTO INSTITUCIONAL (single unified field)
            const ctxHtml = sedeData.contextoInstitucional || ""
            const ctxBlocks = parseHtmlBlocks(ctxHtml)
            if (ctxBlocks.length > 0) {
                renderBlocks(ctxBlocks)
                addPage()
            }

            // 4b. PRESENTACIÓN DE LA FACULTAD
            const facHtml = sedeData.presentacionFacultad || ""
            const facBlocks = parseHtmlBlocks(facHtml)
            if (facBlocks.length > 0) {
                renderBlocks(facBlocks)
                addPage()
            }

            // 4c. PRESENTACIÓN DEL PROGRAMA
            const progHtml = sedeData.presentacionPrograma || ""
            const progBlocks = parseHtmlBlocks(progHtml)
            if (progBlocks.length > 0) {
                renderBlocks(progBlocks)
                addPage()
            }

            // 5. FACTORES
            for (const factor of docData.factors) {
                if (factor.paragraphs.length === 0) continue
                checkPage(20)
                pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); pdf.setTextColor(0, 0, 0)
                pdf.text(`${factor.factorNumber}. ${factor.factorName}`, mx, y); y += 10
                for (const p of factor.paragraphs) {
                    checkPage(15)
                    pdf.setFont("helvetica", "bold"); pdf.setFontSize(11)
                    pdf.text(p.title, mx, y); y += 7
                    const blocks = parseHtmlBlocks(p.content || "")
                    renderBlocks(blocks)
                    y += 4
                }
                y += 8
            }

            // Ensure a strictly safe filename by only allowing alphanumeric and replacing spaces with _
            let docName = (doc?.program?.name || "Documento_Institucional")
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
                .replace(/[^a-zA-Z0-9\s-]/g, "") // remove all symbols
                .trim()
                .replace(/\s+/g, "_")
            if (!docName) docName = "Documento_Institucional"

            // Ultimate forced download bypass handling Chrome/Safari's strict blob policies
            const blobString = pdf.output("blob")
            const file = new File([blobString], `${docName}.pdf`, { type: "application/pdf" })

            // Build temporary anchor
            const link = document.createElement("a")
            const url = URL.createObjectURL(file)

            link.style.display = "none"
            link.href = url
            link.setAttribute("download", `${docName}.pdf`)

            // Required for Firefox/some Chromes to respect the click
            document.body.appendChild(link)

            // Force the event
            link.click()

            // Clean up with timeout to ensure download starts
            setTimeout(() => {
                document.body.removeChild(link)
                window.URL.revokeObjectURL(url)
            }, 500)

            toast.success("PDF generado exitosamente", { style: { background: '#F0FDF4', color: '#166534', border: '1px solid #4ADE80' }, iconTheme: { primary: '#22C55E', secondary: '#F0F4' } })
        } catch (err) {
            console.error("Error generando PDF:", err)
            toast.error("Error al generar PDF")
        }
    }

    // Auto-save when data changes
    const initialLoaded = useRef(false)
    useEffect(() => {
        if (!doc || loading) return
        if (!initialLoaded.current) { initialLoaded.current = true; return }
        setAutoSaved(false)
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/documentos/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        type: doc?.type,
                        year: String(doc?.year),
                        programId: String(doc?.program?.id),
                        description: doc?.description,
                        status: doc?.status,
                        content: JSON.stringify(docData),
                        coverPage: coverImage || null
                    })
                })
                if (res.ok) {
                    setAutoSaved(true)
                    setTimeout(() => setAutoSaved(false), 2000)
                }
            } catch { }
        }, 1500)
        return () => clearTimeout(timer)
    }, [docData, coverImage])

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => setCoverImage(reader.result as string)
        reader.readAsDataURL(file)
    }

    // Team helpers
    const addTeamMember = (group: keyof TeamsData) => {
        const m = newMember[group]
        if (!m?.name?.trim()) return
        setDocData(prev => ({ ...prev, teams: { ...prev.teams, [group]: [...prev.teams[group], { name: m.name.trim(), role: m.role?.trim() || "" }] } }))
        setNewMember(prev => ({ ...prev, [group]: { name: "", role: "" } }))
    }
    const removeTeamMember = (group: keyof TeamsData, idx: number) => {
        setDocData(prev => ({ ...prev, teams: { ...prev.teams, [group]: prev.teams[group].filter((_, i) => i !== idx) } }))
    }

    // Paragraph helpers
    const addParagraph = (factorId: number) => {
        const title = prompt("Nombre del párrafo:")
        if (!title?.trim()) return
        const p: Paragraph = { id: `p${Date.now()}`, title: title.trim(), content: "" }
        setDocData(prev => ({
            ...prev,
            factors: prev.factors.map(f => f.factorId === factorId ? { ...f, paragraphs: [...f.paragraphs, p] } : f)
        }))
    }
    const removeParagraph = (factorId: number, pId: string) => {
        setDocData(prev => ({
            ...prev,
            factors: prev.factors.map(f => f.factorId === factorId ? { ...f, paragraphs: f.paragraphs.filter(p => p.id !== pId) } : f)
        }))
        if (editingParagraph?.paragraphId === pId) setEditingParagraph(null)
    }
    const updateParagraphContent = (factorId: number, pId: string, content: string) => {
        setDocData(prev => ({
            ...prev,
            factors: prev.factors.map(f => f.factorId === factorId ? { ...f, paragraphs: f.paragraphs.map(p => p.id === pId ? { ...p, content } : p) } : f)
        }))
    }

    const activeFactorData = docData.factors.find(f => f.factorId === Number(activeTab))
    const editingParagraphData = editingParagraph ? docData.factors.find(f => f.factorId === editingParagraph.factorId)?.paragraphs.find(p => p.id === editingParagraph.paragraphId) : null

    // Save contexto field (lifted to component level for AI handler access)
    const saveContexto = (field: string, val: string) => {
        setSedeData(prev => ({ ...prev, [field]: val }))
        if (sedeTimerRef.current) clearTimeout(sedeTimerRef.current)
        sedeTimerRef.current = setTimeout(async () => {
            try {
                await fetch(`/api/documentos/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        type: doc?.type,
                        year: String(doc?.year),
                        programId: String(doc?.program?.id),
                        [field]: val
                    })
                })
            } catch (e) { console.error("Error saving:", e) }
        }, 1500)
    }

    // Save current selection before any AI action
    const saveSelection = () => {
        const sel = window.getSelection()
        if (sel && sel.rangeCount > 0) {
            savedSelectionRef.current = sel.getRangeAt(0).cloneRange()
        }
    }
    const restoreSelection = () => {
        if (savedSelectionRef.current) {
            const sel = window.getSelection()
            sel?.removeAllRanges()
            sel?.addRange(savedSelectionRef.current)
        }
    }

    // Track which editor is active
    const handleEditorFocus = (e: React.FocusEvent<HTMLDivElement>, fieldName: string) => {
        activeEditorRef.current = e.currentTarget
        activeFieldRef.current = fieldName
    }

    // Floating AI bubble on text selection — direct DOM to avoid re-render
    const showFloatingBubble = (x: number, y: number) => {
        if (floatingAiRef.current) {
            floatingAiRef.current.style.display = 'flex'
            floatingAiRef.current.style.left = x + 'px'
            floatingAiRef.current.style.top = y + 'px'
        }
    }
    const hideFloatingBubble = () => {
        if (floatingAiRef.current) floatingAiRef.current.style.display = 'none'
    }
    const handleEditorMouseUp = () => {
        setTimeout(() => {
            if (aiLoading) return
            const sel = window.getSelection()
            // Always save cursor/selection for toolbar buttons
            saveSelection()
            const text = sel?.toString()?.trim()
            if (text && text.length > 3 && sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0)
                const rect = range.getBoundingClientRect()
                showFloatingBubble(rect.left + rect.width / 2, rect.top - 10)
            } else {
                hideFloatingBubble()
            }
        }, 50)
    }

    // Toggle AI toolbar dropdown — direct DOM
    const toggleAiMenu = () => {
        if (aiMenuRef.current) {
            const isHidden = aiMenuRef.current.style.display === 'none' || !aiMenuRef.current.style.display
            aiMenuRef.current.style.display = isHidden ? 'block' : 'none'
        }
    }
    const hideAiMenu = () => {
        if (aiMenuRef.current) aiMenuRef.current.style.display = 'none'
    }

    // AI handler
    const handleAiAction = async (action: string) => {
        // Capture everything BEFORE any state updates (which trigger re-renders)
        const editorEl = activeEditorRef.current
        const field = activeFieldRef.current
        const sel = window.getSelection()
        const selectedText = sel?.toString()?.trim() || ""
        const editorHtml = editorEl?.innerHTML || ""

        // Determine context name
        let contextName = "Contexto Institucional"
        if (editorEl) {
            const prevH2 = editorEl.previousElementSibling as HTMLElement
            if (prevH2?.tagName === "H2") contextName = prevH2.textContent?.trim() || contextName
        }

        if (action === 'generar') {
            // Open modal for generate — don't require selection
            hideAiMenu()
            hideFloatingBubble()
            setShowGenerateModal(true)
            return
        }

        if (!selectedText) {
            toast.error("Selecciona texto primero para usar la IA")
            return
        }

        // Now safe to update state
        hideAiMenu()
        hideFloatingBubble()
        setAiLoading(true)

        try {
            const res = await fetch("/api/ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, text: selectedText, context: contextName })
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || "Error de IA")
                setAiLoading(false)
                return
            }

            const result = data.result || ""
            const resultHtml = result.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")

            // Replace in innerHTML using string matching (immune to re-renders)
            if (editorEl && field) {
                // Get fresh innerHTML from the DOM element (not stale ref)
                const currentHtml = editorEl.innerHTML
                // Create a temp div to get the plain text version for matching
                const temp = document.createElement("div")
                temp.innerHTML = currentHtml

                // Find and replace the selected text in the HTML
                // Use the text content to locate the position, then replace in innerHTML
                const plainText = temp.textContent || ""
                const selIdx = plainText.indexOf(selectedText)

                if (selIdx !== -1) {
                    // Walk through DOM to find the text nodes containing the selection
                    // and replace via innerHTML
                    const escapedSel = selectedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                    // Replace first occurrence in the text content by doing it through the DOM
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

                        // Save the updated content
                        saveContexto(field, editorEl.innerHTML)
                    }
                }
            }

            const labels: Record<string, string> = { mejorar: "Texto mejorado", generar: "Contenido generado", resumir: "Texto resumido", expandir: "Texto expandido" }
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

    // Handle generate submit from modal
    const handleGenerateSubmit = async () => {
        if (!generatePrompt.trim()) {
            toast.error("Escribe sobre qué quieres generar")
            return
        }
        const editorEl = activeEditorRef.current
        const field = activeFieldRef.current

        // Determine context: section name + all page text + doc name
        let contextName = "Contexto Institucional"
        if (editorEl) {
            const prevH2 = editorEl.previousElementSibling as HTMLElement
            if (prevH2?.tagName === "H2") contextName = prevH2.textContent?.trim() || contextName
        }
        const pageText = [
            sedeData.contextoInstitucional,
            sedeData.misionInstitucional,
            sedeData.visionInstitucional
        ].map(h => { const d = document.createElement('div'); d.innerHTML = h || ''; return d.textContent?.trim() }).filter(Boolean).join('\n\n')

        const docName = doc?.type ? `${doc.type} - ${doc.program?.name || ''} (${doc.year})` : ''

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
                    context: contextName,
                    pageContext: pageText,
                    docName
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

            if (editorEl && field) {
                // Append to existing content
                editorEl.innerHTML += resultHtml
                saveContexto(field, editorEl.innerHTML)
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
        const close = (e: MouseEvent) => {
            if (aiMenuRef.current && !aiMenuRef.current.parentElement?.contains(e.target as Node)) hideAiMenu()
            if (floatingAiRef.current && !floatingAiRef.current.contains(e.target as Node)) hideFloatingBubble()
        }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [])

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
            </div>
        )
    }

    if (!doc) return null

    const statusBadge = doc.status === "Terminado" ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"
    const typeBadge = doc.type === "Registro Calificado" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200"

    const allTabs = [{ id: "inicio", label: "Página Inicial" }, { id: "equipo", label: "Equipo" }, { id: "contexto", label: "Contexto Institucional" }, ...factorParams.map(fp => ({ id: String(fp.id), label: `${fp.number}. ${fp.name}` }))]

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push("/dashboard/documentos")} className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors shadow-theme-xs" title="Volver">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </button>
                        <div>
                            <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-3">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${typeBadge}`}>{doc.type}</span>
                                {doc.program?.name || "—"}
                                <span className="text-gray-400 font-normal text-base">({doc.year})</span>
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                {doc.program?.faculty?.name && <span>{doc.program.faculty.name} · </span>}
                                {doc.description || "Sin descripción"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {doc.status && <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${statusBadge}`}>{doc.status}</span>}
                        <div className="relative group">
                            {coverImage ? (
                                <div className="flex items-center gap-2">
                                    <label className="cursor-pointer" title="Cambiar portada">
                                        <img src={coverImage} alt="Portada" className="w-10 h-14 object-cover rounded border border-gray-200 shadow-sm hover:opacity-80 transition-opacity" />
                                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                    </label>
                                    <button onClick={() => setCoverImage("")} className="p-1 text-gray-400 hover:text-error-500 transition-colors" title="Quitar portada">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ) : (
                                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 hover:border-brand-300 hover:text-brand-600 cursor-pointer transition-colors" title="Subir portada">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    Portada
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                </label>
                            )}
                        </div>
                        <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors disabled:opacity-50">
                            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                            {saving ? "Guardando..." : "Guardar"}
                        </button>
                        <button onClick={generatePDF} className="inline-flex items-center gap-2 rounded-lg bg-gray-700 px-5 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-gray-800 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            Generar PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs + Content */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-sm overflow-hidden">
                {/* Tab bar */}
                <div className="border-b border-gray-100">
                    <div className="grid px-4 pt-3 overflow-x-auto" style={{ gridTemplateColumns: `repeat(${allTabs.length}, minmax(0, 1fr))` }}>
                        {allTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id); setEditingParagraph(null) }}
                                className={`relative px-2 py-2 text-xs font-medium rounded-t-lg transition-colors truncate ${activeTab === tab.id ? "bg-white text-brand-600 border border-gray-200 border-b-white -mb-px z-10" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
                                title={tab.label}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Página Inicial */}
                {activeTab === "inicio" && (() => {
                    const defaultText = [
                        doc.type === "Registro Calificado" ? "DOCUMENTO DE SOLICITUD DE CREACIÓN DE PROGRAMAS NUEVOS" : doc.type?.toUpperCase() || "DOCUMENTO",
                        "", "", "", "",
                        "PROGRAMA DE",
                        doc.program?.name?.toUpperCase() || "",
                        "", "", "", "",
                        doc.program?.faculty?.name?.toUpperCase() || "FACULTAD",
                        "", "", "", "",
                        doc.program?.faculty?.sede?.name?.toUpperCase() || "UNIVERSIDAD",
                        "SEDE MONTERÍA",
                        "", "", "",
                        `MONTERÍA (${new Date().getDate().toString().padStart(2, "0")} – ${(new Date().getMonth() + 1).toString().padStart(2, "0")} – ${doc.year || new Date().getFullYear()})`
                    ].join("\n")
                    const val = docData.paginaInicial || defaultText
                    return (
                        <div className="flex justify-center p-8 overflow-auto">
                            <div className="relative bg-white border border-gray-200 rounded-xl shadow-md" style={{ width: 816, minHeight: 1056 }}>
                                {autoSaved && (
                                    <div className="absolute top-2 right-3 flex items-center gap-1.5 text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1 animate-fade-in">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        Guardado
                                    </div>
                                )}
                                <textarea
                                    value={val}
                                    onChange={e => setDocData(prev => ({ ...prev, paginaInicial: e.target.value }))}
                                    className="w-full h-full bg-transparent text-center font-bold text-gray-900 uppercase outline-none resize-none text-base leading-relaxed"
                                    style={{ minHeight: 1056, padding: '80px 60px' }}
                                    spellCheck={false}
                                />
                            </div>
                        </div>
                    )
                })()}

                {/* Equipo */}
                {activeTab === "equipo" && (
                    <div className="p-6 space-y-8">
                        {([
                            { key: "directivo" as keyof TeamsData, title: "Equipo Directivo", roles: [] as string[] },
                            { key: "construccion" as keyof TeamsData, title: "Equipo Responsable de la Construcción del Documento", roles: ["Asesor Externo", "Coordinador de Calidad", "Decano", "Asesora de Rectoría General", "Jefe Aseguramiento de la Calidad", "Jefe Institucional de Registro y Autoevaluación", "Coordinadora Gestión de la Información", "Docente Apoyo", "Coordinador", "Docente", "Investigador", "Asesor"] },
                            { key: "apoyo" as keyof TeamsData, title: "Equipo de Apoyo y Soporte de Aseguramiento de la Calidad", roles: ["Asesor Externo", "Coordinador de Calidad", "Decano", "Asesora de Rectoría General", "Jefe Aseguramiento de la Calidad", "Jefe Institucional de Registro y Autoevaluación", "Coordinadora Gestión de la Información", "Docente Apoyo", "Profesional de Apoyo", "Analista", "Auditor"] }
                        ]).map(group => {
                            const members = docData.teams[group.key] || []
                            const nm = newMember[group.key] || { name: "", role: "" }
                            return (
                                <div key={group.key}>
                                    <h3 className="text-sm font-semibold text-gray-800 mb-3">{group.title}</h3>
                                    <div className="overflow-hidden rounded-xl border border-gray-200">
                                        <table className="w-full">
                                            <thead><tr className="border-b border-gray-100 bg-gray-50">
                                                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Cargo / Rol</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase w-16"></th>
                                            </tr></thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {members.map((m, i) => (
                                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-4 py-2.5 text-sm text-gray-800">{m.name}</td>
                                                        <td className="px-4 py-2.5 text-sm text-gray-500">{m.role || "—"}</td>
                                                        <td className="px-4 py-2.5 text-right">
                                                            <button onClick={() => removeTeamMember(group.key, i)} className="p-1 text-gray-400 hover:text-error-500 transition-colors" title="Eliminar">
                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {members.length === 0 && (
                                                    <tr><td colSpan={3} className="px-4 py-4 text-center text-xs text-gray-400">Sin miembros</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="relative mt-2">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 relative">
                                                <input
                                                    type="text"
                                                    value={searchTerm[group.key] || ""}
                                                    onChange={e => { setSearchTerm(p => ({ ...p, [group.key]: e.target.value })); setShowDropdown(p => ({ ...p, [group.key]: true })) }}
                                                    onFocus={() => setShowDropdown(p => ({ ...p, [group.key]: true }))}
                                                    placeholder="Buscar persona..."
                                                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10"
                                                />
                                                {showDropdown[group.key] && (searchTerm[group.key] || "").length > 0 && (
                                                    <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                                                        {group.roles.length > 0 ? (
                                                            // Construcción & Apoyo: search all personas
                                                            <>
                                                                {personas
                                                                    .filter(p => p.fullName?.toLowerCase().includes((searchTerm[group.key] || "").toLowerCase()))
                                                                    .map(p => (
                                                                        <button
                                                                            key={p.id}
                                                                            onClick={() => {
                                                                                const name = p.fullName || ""
                                                                                const role = newMember[group.key]?.role || ""
                                                                                setDocData(prev => ({ ...prev, teams: { ...prev.teams, [group.key]: [...prev.teams[group.key], { name, role }] } }))
                                                                                setSearchTerm(pr => ({ ...pr, [group.key]: "" }))
                                                                                setShowDropdown(pr => ({ ...pr, [group.key]: false }))
                                                                            }}
                                                                            className="w-full px-3 py-2 text-left text-sm hover:bg-brand-50 transition-colors flex items-center justify-between"
                                                                        >
                                                                            <span className="font-medium text-gray-800">{p.fullName}</span>
                                                                            <span className="text-xs text-gray-400">{p.identification}</span>
                                                                        </button>
                                                                    ))}
                                                                {personas.filter(p => p.fullName?.toLowerCase().includes((searchTerm[group.key] || "").toLowerCase())).length === 0 && (
                                                                    <div className="px-3 py-2 text-xs text-gray-400 text-center">Sin resultados</div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            // Directivo: search directivos
                                                            <>
                                                                {directivos
                                                                    .filter(d => d.person?.fullName?.toLowerCase().includes((searchTerm[group.key] || "").toLowerCase()))
                                                                    .map(d => (
                                                                        <button
                                                                            key={d.id}
                                                                            onClick={() => {
                                                                                const name = d.person?.fullName || ""
                                                                                const role = `${d.cargo} - ${d.oficina?.name || ""}`
                                                                                setDocData(prev => ({ ...prev, teams: { ...prev.teams, [group.key]: [...prev.teams[group.key], { name, role }] } }))
                                                                                setSearchTerm(pr => ({ ...pr, [group.key]: "" }))
                                                                                setShowDropdown(pr => ({ ...pr, [group.key]: false }))
                                                                            }}
                                                                            className="w-full px-3 py-2 text-left text-sm hover:bg-brand-50 transition-colors flex items-center justify-between"
                                                                        >
                                                                            <span className="font-medium text-gray-800">{d.person?.fullName}</span>
                                                                            <span className="text-xs text-gray-400">{d.cargo} · {d.oficina?.name}</span>
                                                                        </button>
                                                                    ))}
                                                                {directivos.filter(d => d.person?.fullName?.toLowerCase().includes((searchTerm[group.key] || "").toLowerCase())).length === 0 && (
                                                                    <div className="px-3 py-2 text-xs text-gray-400 text-center">Sin resultados</div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            {group.roles.length > 0 && (
                                                <select value={nm.role} onChange={e => setNewMember(p => ({ ...p, [group.key]: { ...nm, role: e.target.value } }))} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10">
                                                    <option value="">Cargo...</option>
                                                    {group.roles.map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            )}
                                            {group.roles.length > 0 && (
                                                <button onClick={() => setShowPersonModal(true)} className="rounded-lg bg-brand-500 px-2.5 py-1.5 text-white hover:bg-brand-600 transition-colors" title="Crear persona">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {activeTab === "contexto" && (() => {
                    const sede = doc?.program?.faculty?.sede
                    const facultyName = doc?.program?.faculty?.name || 'la Facultad'
                    const programName = doc?.program?.name || 'el Programa'
                    const defaultCtx = `<h2>Contexto Institucional${sede ? ` — ${sede.name}` : ''}</h2><p>Escribir contexto institucional...</p><h2>Misión Institucional</h2><p>Escribir misión institucional...</p><h2>Visión Institucional</h2><p>Escribir visión institucional...</p>`
                    const defaultFac = `<h2>Presentación de ${facultyName}</h2><p>Escribir presentación de la facultad...</p>`
                    const defaultProg = `<h2>Presentación de ${programName}</h2><p>Escribir presentación del programa...</p>`
                    return (
                        <div className="flex flex-col gap-6 p-6 overflow-y-auto" style={{ height: 'calc(100vh - 200px)' }}>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">Contexto Institucional</h3>
                                <RichTextEditor
                                    value={sedeData.contextoInstitucional || defaultCtx}
                                    onChange={html => saveContexto('contextoInstitucional', html)}
                                    minHeight="300px"
                                    optional={false}
                                />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">Presentación de la Facultad</h3>
                                <RichTextEditor
                                    value={sedeData.presentacionFacultad || defaultFac}
                                    onChange={html => saveContexto('presentacionFacultad', html)}
                                    minHeight="300px"
                                    optional={false}
                                />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">Presentación del Programa</h3>
                                <RichTextEditor
                                    value={sedeData.presentacionPrograma || defaultProg}
                                    onChange={html => saveContexto('presentacionPrograma', html)}
                                    minHeight="300px"
                                    optional={false}
                                />
                            </div>
                        </div>
                    )
                })()}

                {/* Factor Tab */}
                {activeTab !== "inicio" && activeFactorData && !editingParagraph && (
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-semibold text-gray-800">Factor {activeFactorData.factorNumber}. {activeFactorData.factorName}</h3>
                                {factorParams.find(fp => fp.id === activeFactorData.factorId)?.description && (
                                    <p className="text-sm text-gray-500 mt-0.5">{factorParams.find(fp => fp.id === activeFactorData.factorId)?.description}</p>
                                )}
                            </div>
                            <button onClick={() => addParagraph(activeFactorData.factorId)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                Nuevo Párrafo
                            </button>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-gray-200">
                            <table className="w-full">
                                <thead><tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-10">#</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Párrafo</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">Estado</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-28">Acciones</th>
                                </tr></thead>
                                <tbody className="divide-y divide-gray-100">
                                    {activeFactorData.paragraphs.map((p, i) => (
                                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-sm text-gray-400">{i + 1}</td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-medium text-gray-800 cursor-pointer hover:text-brand-600" onClick={() => setEditingParagraph({ factorId: activeFactorData.factorId, paragraphId: p.id })}>
                                                    {p.title}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${p.content ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                                                    {p.content ? "Redactado" : "Vacío"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="inline-flex items-center gap-1">
                                                    <button onClick={() => setEditingParagraph({ factorId: activeFactorData.factorId, paragraphId: p.id })} className="p-1 text-gray-400 hover:text-brand-600 transition-colors" title="Editar">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                    </button>
                                                    <button onClick={() => removeParagraph(activeFactorData.factorId, p.id)} className="p-1 text-gray-400 hover:text-error-500 transition-colors" title="Eliminar">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {activeFactorData.paragraphs.length === 0 && (
                                        <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">No hay párrafos. Haz clic en &quot;Nuevo Párrafo&quot; para comenzar.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Paragraph Editor */}
                {editingParagraph && editingParagraphData && (
                    <div>
                        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setEditingParagraph(null)} className="p-1 text-gray-400 hover:text-gray-600 transition-colors" title="Volver a la tabla">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                </button>
                                <h4 className="text-sm font-semibold text-gray-800">{editingParagraphData.title}</h4>
                            </div>
                        </div>
                        <ReactQuill
                            key={editingParagraph.paragraphId}
                            theme="snow"
                            value={editingParagraphData.content}
                            onChange={(val) => updateParagraphContent(editingParagraph.factorId, editingParagraph.paragraphId, val)}
                            modules={{
                                toolbar: [
                                    [{ header: [1, 2, 3, false] }],
                                    ['bold', 'italic', 'underline', 'strike'],
                                    [{ color: [] }, { background: [] }],
                                    [{ list: 'ordered' }, { list: 'bullet' }],
                                    [{ indent: '-1' }, { indent: '+1' }],
                                    [{ align: [] }],
                                    ['link', 'image'],
                                    ['blockquote', 'code-block'],
                                    ['clean']
                                ]
                            }}
                            style={{ minHeight: 400 }}
                            placeholder={`Escribe el contenido de "${editingParagraphData.title}"...`}
                        />
                    </div>
                )}


            </div>

            <PersonFormModal
                isOpen={showPersonModal}
                onClose={() => setShowPersonModal(false)}
                onSuccess={async () => {
                    setShowPersonModal(false)
                    const [dRes, pRes] = await Promise.all([fetch("/api/directivos"), fetch("/api/personas")])
                    if (dRes.ok) setDirectivos(await dRes.json())
                    if (pRes.ok) setPersonas(await pRes.json())
                }}
            />

            {/* Generate content modal */}
            {showGenerateModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                                Generar contenido con IA
                            </h3>
                            <p className="text-purple-100 text-sm mt-1">
                                Sección: {(() => {
                                    const el = activeEditorRef.current
                                    const h2 = el?.previousElementSibling as HTMLElement
                                    return h2?.tagName === "H2" ? h2.textContent?.trim() : "Contexto Institucional"
                                })()}
                                {doc?.type && <span className="ml-2">· {doc.type}</span>}
                            </p>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                ¿Sobre qué quieres escribir?
                            </label>
                            <textarea
                                autoFocus
                                value={generatePrompt}
                                onChange={e => setGeneratePrompt(e.target.value)}
                                placeholder="Ej: Historia y trayectoria de la universidad, su evolución académica y contribuciones a la región..."
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-purple-400 focus:outline-none focus:ring-3 focus:ring-purple-500/10 resize-none"
                                rows={4}
                                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerateSubmit() }}
                            />
                            <p className="text-xs text-gray-400 mt-2">Presiona Ctrl+Enter para enviar</p>
                            <div className="flex justify-end gap-3 mt-4">
                                <button
                                    onClick={() => { setShowGenerateModal(false); setGeneratePrompt("") }}
                                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleGenerateSubmit}
                                    disabled={!generatePrompt.trim()}
                                    className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg hover:from-purple-600 hover:to-indigo-600 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    Generar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    )
}
