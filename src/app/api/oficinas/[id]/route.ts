import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const { name, sedeId, description } = await req.json()
        const oficina = await prisma.oficina.update({
            where: { id: parseInt(id) },
            data: {
                name,
                sedeId: parseInt(sedeId),
                description: description || null
            },
        })
        return NextResponse.json(oficina)
    } catch {
        return NextResponse.json({ error: "Error al actualizar la oficina" }, { status: 400 })
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        await prisma.oficina.delete({ where: { id: parseInt(id) } })
        return NextResponse.json({ message: "Oficina eliminada" })
    } catch {
        return NextResponse.json({ error: "No se puede eliminar la oficina" }, { status: 400 })
    }
}
