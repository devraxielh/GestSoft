import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const { number, name, description } = await req.json()
        const factor = await prisma.factor.update({
            where: { id: parseInt(id) },
            data: {
                number: parseInt(number),
                name,
                description: description || null
            }
        })
        return NextResponse.json(factor)
    } catch (e: any) {
        if (e?.code === "P2002") {
            return NextResponse.json({ error: "Ya existe un factor con ese número o nombre" }, { status: 400 })
        }
        return NextResponse.json({ error: "Error al actualizar el factor" }, { status: 400 })
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        await prisma.factor.delete({ where: { id: parseInt(id) } })
        return NextResponse.json({ ok: true })
    } catch {
        return NextResponse.json({ error: "Error al eliminar el factor" }, { status: 400 })
    }
}
