import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const { name, directorName, address, email, phone, facultyId } = await req.json()
        const program = await prisma.program.update({
            where: { id: parseInt(id) },
            data: {
                name,
                directorName: directorName || "Sin asignar",
                address: address || null,
                email: email || null,
                phone: phone || null,
                facultyId: parseInt(facultyId)
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
