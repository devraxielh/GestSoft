import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateVerificationCode } from "@/lib/hash"

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")

    if (!code) {
        return NextResponse.json({ error: "Se requiere un código de verificación" }, { status: 400 })
    }

    try {
        const assignments = await prisma.certificateAssignment.findMany({
            include: {
                person: true,
                certificate: {
                    include: {
                        event: true
                    }
                }
            }
        })

        const foundAssignment = assignments.find(a => {
            const assignmentCode = generateVerificationCode({
                fullName: a.person.fullName,
                identification: a.person.identification,
                participationType: a.certificate.participationType,
                eventName: a.certificate.event?.name || "",
                issueDate: a.certificate.issueDate.toISOString(), // ensure consistency
                participationDetails: a.participationDetails || ""
            });

            return assignmentCode === code.trim().toUpperCase()
        })

        if (!foundAssignment) {
            return NextResponse.json({ error: "Código de verificación no válido o certificado no encontrado" }, { status: 404 })
        }

        return NextResponse.json({ assignment: foundAssignment })

    } catch (error) {
        console.error("Error verifying code:", error)
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
    }
}
