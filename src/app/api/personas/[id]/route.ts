import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const data = await req.json()
        if (data.fullName) {
            data.fullName = data.fullName.toLowerCase().split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        }
        const person = await prisma.person.update({
            where: { id: parseInt(id) },
            data: {
                ...data,
                programId: data.programId && data.programId !== "" ? parseInt(data.programId) : null,
            },
        })
        return NextResponse.json(person)
    } catch {
        return NextResponse.json({ error: "Error al actualizar la persona" }, { status: 400 })
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        await prisma.person.delete({ where: { id: parseInt(id) } })
        return NextResponse.json({ message: "Persona eliminada" })
    } catch {
        return NextResponse.json({ error: "No se puede eliminar la persona" }, { status: 400 })
    }
}
