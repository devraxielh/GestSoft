import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendThesisNotification } from "@/lib/mailer"

export async function POST(req: NextRequest) {
    try {
        const { thesisIds } = await req.json()

        if (!thesisIds || !Array.isArray(thesisIds) || thesisIds.length === 0) {
            return NextResponse.json({ error: "No se proporcionaron trabajos de grado" }, { status: 400 })
        }

        const theses = await prisma.thesis.findMany({
            where: { id: { in: thesisIds } },
            include: {
                students: {
                    include: {
                        person: true
                    }
                }
            }
        })

        if (theses.length === 0) {
            return NextResponse.json({ error: "No se encontraron trabajos de grado" }, { status: 404 })
        }

        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
        let sent = 0
        let failed = 0
        const errors: string[] = []

        // Extract all students from all selected theses
        interface Recipient {
            email: string;
            fullName: string;
            title: string;
        }

        const recipients: Recipient[] = theses.flatMap((t: any) =>
            t.students.map((s: any) => ({
                email: s.person.email,
                fullName: s.person.fullName,
                title: t.title
            }))
        ).filter((r: Recipient) => r.email); // Ensure email exists

        if (recipients.length === 0) {
            return NextResponse.json({ error: "No hay estudiantes con correo electrónico válido vinculados a estos trabajos" }, { status: 400 })
        }

        // Send in batches of 5 to avoid overwhelming SMTP
        const batchSize = 5
        for (let i = 0; i < recipients.length; i += batchSize) {
            const batch = recipients.slice(i, i + batchSize)
            const results = await Promise.allSettled(
                batch.map(async (r: Recipient) => {
                    const consultaUrl = `${baseUrl}/consulta`
                    await sendThesisNotification(
                        r.email,
                        r.fullName,
                        r.title,
                        consultaUrl
                    )
                })
            )

            for (const result of results) {
                if (result.status === "fulfilled") {
                    sent++
                } else {
                    failed++
                    errors.push((result as PromiseRejectedResult).reason?.message || "Error desconocido")
                }
            }
        }

        return NextResponse.json({
            success: true,
            sent,
            failed,
            total: recipients.length,
            ...(errors.length > 0 ? { errors: errors.slice(0, 5) } : {})
        })
    } catch (error: any) {
        console.error("Thesis bulk email error:", error)
        return NextResponse.json(
            { error: "Error al enviar correos: " + (error.message || "Error del servidor") },
            { status: 500 }
        )
    }
}
