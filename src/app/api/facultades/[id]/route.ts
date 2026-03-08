import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const { name, deanName, address, email, phone } = await req.json()
        const faculty = await prisma.faculty.update({
            where: { id: parseInt(id) },
            data: {
                name,
                deanName: deanName || "Sin asignar",
                address: address || null,
                email: email || null,
                phone: phone || null
            },
        })
        return NextResponse.json(faculty)
    } catch {
        return NextResponse.json({ error: "Error al actualizar la facultad" }, { status: 400 })
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        await prisma.faculty.delete({ where: { id: parseInt(id) } })
        return NextResponse.json({ message: "Facultad eliminada" })
    } catch {
        return NextResponse.json({ error: "No se puede eliminar la facultad" }, { status: 400 })
    }
}
