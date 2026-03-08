import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    const faculties = await prisma.faculty.findMany({ orderBy: { id: "asc" } })
    return NextResponse.json(faculties)
}

export async function POST(req: NextRequest) {
    try {
        const { name, deanName, address, email, phone } = await req.json()
        const faculty = await prisma.faculty.create({
            data: {
                name,
                deanName: deanName || "Sin asignar",
                address: address || null,
                email: email || null,
                phone: phone || null
            }
        })
        return NextResponse.json(faculty, { status: 201 })
    } catch {
        return NextResponse.json({ error: "Error al crear la facultad" }, { status: 400 })
    }
}
