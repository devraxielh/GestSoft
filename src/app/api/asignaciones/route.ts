import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    const assignments = await prisma.certificateAssignment.findMany({
        include: {
            certificate: { include: { event: true } },
            person: true,
        },
        orderBy: { id: "desc" },
    })
    return NextResponse.json(assignments)
}

export async function POST(req: NextRequest) {
    try {
        const { certificateId, identification, participationDetails } = await req.json()

        const person = await prisma.person.findUnique({
            where: { identification },
        })

        if (!person) {
            return NextResponse.json({ error: "Persona no encontrada con esa identificación" }, { status: 404 })
        }

        const existing = await prisma.certificateAssignment.findFirst({
            where: {
                certificateId: parseInt(certificateId),
                personId: person.id,
                participationDetails: participationDetails || null
            }
        });
        if (existing) {
            return NextResponse.json({ error: "El certificado ya fue asignado a esta persona con esos mismos detalles." }, { status: 400 })
        }

        const assignment = await prisma.certificateAssignment.create({
            data: {
                certificateId: parseInt(certificateId),
                personId: person.id,
                participationDetails: participationDetails || null,
            },
            include: {
                certificate: { include: { event: true } },
                person: true,
            },
        })
        return NextResponse.json(assignment, { status: 201 })
    } catch {
        return NextResponse.json({ error: "Error al asignar el certificado. Puede que ya esté asignado." }, { status: 400 })
    }
}
