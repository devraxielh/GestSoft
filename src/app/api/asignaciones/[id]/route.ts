import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        await prisma.certificateAssignment.delete({ where: { id: parseInt(id) } })
        return NextResponse.json({ message: "Asignación eliminada" })
    } catch {
        return NextResponse.json({ error: "No se puede eliminar la asignación" }, { status: 400 })
    }
}
