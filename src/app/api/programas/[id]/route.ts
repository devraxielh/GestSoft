import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const { name, directorId, address, email, phone, facultyId, presentation, type, status } = await req.json()
        const program = await prisma.program.update({
            where: { id: parseInt(id) },
            data: {
                name,
                directorId: directorId ? parseInt(directorId) : null,
                address: address || null,
                email: email || null,
                phone: phone || null,
                facultyId: parseInt(facultyId),
                presentation: presentation !== undefined ? (presentation || null) : undefined,
                type: type !== undefined ? (type || null) : undefined,
                status: status !== undefined ? (status || null) : undefined
            },
        })
        return NextResponse.json(program)
    } catch {
        return NextResponse.json({ error: "Error al actualizar el programa" }, { status: 400 })
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        await prisma.program.delete({ where: { id: parseInt(id) } })
        return NextResponse.json({ message: "Programa eliminado" })
    } catch {
        return NextResponse.json({ error: "No se puede eliminar el programa (puede tener personas asignadas)" }, { status: 400 })
    }
}
