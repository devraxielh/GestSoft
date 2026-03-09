import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
    try {
        const { action, text, context, pageContext, docName } = await request.json()

        // Get Groq API key from settings
        const config = await prisma.setting.findUnique({ where: { id: 1 } })
        if (!config?.groqApiKey) {
            return NextResponse.json(
                { error: "API Key de Groq no configurada. Ve a Configuraciones para agregarla." },
                { status: 400 }
            )
        }

        // Build prompt based on action
        let systemPrompt = "Eres un asistente académico experto en redacción de documentos institucionales universitarios en español. Responde SOLO con el texto resultante, sin explicaciones ni comentarios adicionales."
        let userPrompt = ""

        switch (action) {
            case "mejorar":
                userPrompt = `Mejora y reescribe el siguiente texto académico institucional, manteniendo el mismo significado pero con mejor redacción, coherencia y formalidad académica:\n\n${text}`
                break
            case "generar":
                userPrompt = `Genera un texto académico institucional de aproximadamente 3 párrafos para la sección "${context}" de un documento de registro calificado universitario${docName ? ` titulado "${docName}"` : ''}.`
                if (text) userPrompt += `\n\nEl usuario quiere que escribas sobre: ${text}`
                if (pageContext) userPrompt += `\n\nContexto existente del documento (usa esto como referencia para mantener coherencia):\n${pageContext}`
                userPrompt += `\n\nEl texto debe ser formal, coherente y profesional, adecuado para un documento académico institucional.`
                break
            case "resumir":
                userPrompt = `Resume el siguiente texto académico manteniendo las ideas principales y el tono formal institucional:\n\n${text}`
                break
            case "expandir":
                userPrompt = `Expande y desarrolla con mayor detalle el siguiente texto académico institucional, agregando información relevante y manteniendo el tono formal:\n\n${text}`
                break
            default:
                return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
        }

        // Call Groq API
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${config.groqApiKey}`
            },
            body: JSON.stringify({
                model: (config as any).groqModel || "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 2048
            })
        })

        if (!response.ok) {
            const err = await response.json().catch(() => ({}))
            console.error("Groq API error:", err)
            return NextResponse.json(
                { error: err?.error?.message || "Error al comunicarse con Groq API" },
                { status: response.status }
            )
        }

        const data = await response.json()
        const result = data.choices?.[0]?.message?.content || ""

        return NextResponse.json({ result })
    } catch (error: any) {
        console.error("AI endpoint error:", error)
        return NextResponse.json(
            { error: error.message || "Error interno del servidor" },
            { status: 500 }
        )
    }
}
