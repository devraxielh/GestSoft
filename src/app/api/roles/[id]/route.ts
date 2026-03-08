import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const { name, permissionIds } = await req.json()
        const role = await prisma.role.update({
            where: { id: parseInt(id) },
            data: {
                name,
                permissions: permissionIds ? { set: permissionIds.map((pid: number) => ({ id: pid })) } : undefined
            },
        })
        return NextResponse.json(role)
    } catch {
        return NextResponse.json({ error: "Error al actualizar el rol" }, { status: 400 })
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        await prisma.role.delete({ where: { id: parseInt(id) } })
        return NextResponse.json({ message: "Rol eliminado" })
    } catch {
        return NextResponse.json({ error: "No se puede eliminar el rol" }, { status: 400 })
    }
}
