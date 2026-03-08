import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const data = await req.json()
        const event = await prisma.event.update({
            where: { id: parseInt(id) },
            data: {
                name: data.name,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                description: data.description,
                eventType: data.eventType,
                status: data.status || "Realizado",
            },
        })
        return NextResponse.json(event)
    } catch (e) {
        console.error("Error updating event:", e)
        return NextResponse.json({ error: "Error al actualizar el evento" }, { status: 400 })
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        await prisma.event.delete({ where: { id: parseInt(id) } })
        return NextResponse.json({ message: "Evento eliminado" })
    } catch {
        return NextResponse.json({ error: "No se puede eliminar el evento" }, { status: 400 })
    }
}
