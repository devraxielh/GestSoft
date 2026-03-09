import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const { name, rectorId, address, email, phone, contextoInstitucional, misionInstitucional, visionInstitucional } = await req.json()
        const sede = await prisma.sede.update({
            where: { id: parseInt(id) },
            data: {
                name,
                rectorId: rectorId ? parseInt(rectorId) : null,
                address: address || null,
                email: email || null,
                phone: phone || null,
                contextoInstitucional: contextoInstitucional || null,
                misionInstitucional: misionInstitucional || null,
                visionInstitucional: visionInstitucional || null
            },
        })
        return NextResponse.json(sede)
    } catch {
        return NextResponse.json({ error: "Error al actualizar la sede" }, { status: 400 })
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        await prisma.sede.delete({ where: { id: parseInt(id) } })
        return NextResponse.json({ message: "Sede eliminada" })
    } catch {
        return NextResponse.json({ error: "No se puede eliminar la sede" }, { status: 400 })
    }
}
