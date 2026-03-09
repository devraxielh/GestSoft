import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const { cargo } = await req.json()
        const directivo = await prisma.directivo.update({
            where: { id: parseInt(id) },
            data: {
                cargo
            },
        })
        return NextResponse.json(directivo)
    } catch {
        return NextResponse.json({ error: "Error al actualizar el cargo" }, { status: 400 })
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        await prisma.directivo.delete({ where: { id: parseInt(id) } })
        return NextResponse.json({ message: "Asignación eliminada" })
    } catch {
        return NextResponse.json({ error: "No se puede eliminar la asignación" }, { status: 400 })
    }
}
