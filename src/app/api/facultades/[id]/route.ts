import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const body = await req.json()
        const { name, deanId, address, email, phone, sedeId, presentation } = body

        const dataToUpdate: any = {
            name,
            deanId: deanId ? parseInt(deanId, 10) : null,
            address: address || null,
            email: email || null,
            phone: phone || null,
            presentation: presentation !== undefined ? (presentation || null) : undefined
        }

        if (sedeId) {
            dataToUpdate.sedeId = parseInt(sedeId, 10)
        }

        const faculty = await prisma.faculty.update({
            where: { id: parseInt(id) },
            data: dataToUpdate,
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
