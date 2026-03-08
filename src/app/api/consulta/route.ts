import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
    const identification = req.nextUrl.searchParams.get("identification")
    if (!identification) {
        return NextResponse.json({ error: "Identificación requerida" }, { status: 400 })
    }

    const person = await prisma.person.findUnique({
        where: { identification },
    })

    if (!person) {
        return NextResponse.json({ error: "No se encontró una persona con esa identificación" }, { status: 404 })
    }

    const assignments = await prisma.certificateAssignment.findMany({
        where: { personId: person.id },
        include: {
            certificate: { include: { event: true } },
            person: true,
        },
        orderBy: { id: "desc" },
    })

    return NextResponse.json({ person, assignments })
}
