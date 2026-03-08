import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const body = await req.json()
        const data: any = {
            name: body.name,
            email: body.email,
            roleId: parseInt(body.roleId),
            active: body.active,
        }
        if (body.password) {
            data.password = await bcrypt.hash(body.password, 10)
        }
        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data,
            include: { role: true },
        })
        return NextResponse.json({ ...user, password: undefined })
    } catch {
        return NextResponse.json({ error: "Error al actualizar el usuario" }, { status: 400 })
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        await prisma.user.delete({ where: { id: parseInt(id) } })
        return NextResponse.json({ message: "Usuario eliminado" })
    } catch {
        return NextResponse.json({ error: "No se puede eliminar el usuario" }, { status: 400 })
    }
}
