import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateVerificationCode } from "@/lib/hash"

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")

    if (!code) {
        return NextResponse.json({ error: "Se requiere un código de verificación" }, { status: 400 })
    }

    const trimmedCode = code.trim().toUpperCase()

    try {
        // 1. Buscar en asignaciones de certificados de eventos
        const assignments = await prisma.certificateAssignment.findMany({
            include: {
                person: true,
                certificate: { include: { event: true } }
            }
        })

        const foundAssignment = assignments.find(a => {
            const assignmentCode = generateVerificationCode({
                fullName: a.person.fullName,
                identification: a.person.identification,
                participationType: a.certificate.participationType,
                eventName: a.certificate.event?.name || "",
                issueDate: a.certificate.issueDate.toISOString(),
                participationDetails: a.participationDetails || ""
            })
            return assignmentCode === trimmedCode
        })

        if (foundAssignment) {
            return NextResponse.json({ assignment: foundAssignment })
        }

        // 2. Buscar en trabajos de grado (calculado por estudiante)
        const theses = await prisma.thesis.findMany({
            include: {
                program: true,
                students: { include: { person: true } },
                advisors: { include: { person: true } },
                juries: { include: { person: true } }
            }
        })

        for (const t of theses) {
            // Un código de tesis es válido para CUALQUIER estudiante de la misma
            for (const s of t.students) {
                const thesisCode = generateVerificationCode({
                    fullName: s.person.fullName,
                    identification: s.person.identification,
                    title: t.title,
                    level: t.level,
                    programId: String(t.programId)
                })

                if (thesisCode === trimmedCode) {
                    return NextResponse.json({ thesis: t })
                }
            }
        }

        return NextResponse.json({ error: "Código de verificación no válido o certificado no encontrado" }, { status: 404 })

    } catch (error) {
        console.error("Error verifying code:", error)
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
    }
}
