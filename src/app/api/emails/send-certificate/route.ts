import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendCertificateNotification } from "@/lib/mailer"

export async function POST(req: NextRequest) {
    try {
        const { assignmentIds } = await req.json()

        if (!assignmentIds || !Array.isArray(assignmentIds) || assignmentIds.length === 0) {
            return NextResponse.json({ error: "No se proporcionaron asignaciones" }, { status: 400 })
        }

        // Fetch assignments with person, certificate and event data
        const assignments = await prisma.certificateAssignment.findMany({
            where: { id: { in: assignmentIds } },
            include: {
                person: true,
                certificate: {
                    include: { event: true }
                }
            }
        })

        if (assignments.length === 0) {
            return NextResponse.json({ error: "No se encontraron asignaciones" }, { status: 404 })
        }

        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
        let sent = 0
        let failed = 0
        const errors: string[] = []

        // Send in batches of 5 to avoid overwhelming SMTP
        const batchSize = 5
        for (let i = 0; i < assignments.length; i += batchSize) {
            const batch = assignments.slice(i, i + batchSize)
            const results = await Promise.allSettled(
                batch.map(async (assignment) => {
                    const consultaUrl = `${baseUrl}/consulta`
                    await sendCertificateNotification(
                        assignment.person.email || "",
                        assignment.person.fullName,
                        assignment.certificate.event.name,
                        assignment.certificate.participationType || "",
                        consultaUrl
                    )
                })
            )

            for (const result of results) {
                if (result.status === "fulfilled") {
                    sent++
                } else {
                    failed++
                    errors.push(result.reason?.message || "Error desconocido")
                }
            }
        }

        return NextResponse.json({
            success: true,
            sent,
            failed,
            total: assignments.length,
            ...(errors.length > 0 ? { errors: errors.slice(0, 5) } : {})
        })
    } catch (error: any) {
        console.error("Bulk email error:", error)
        return NextResponse.json(
            { error: "Error al enviar correos: " + (error.message || "Error del servidor") },
            { status: 500 }
        )
    }
}
