import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET() {
    const users = await prisma.user.findMany({
        include: { role: true },
        orderBy: { id: "asc" },
    })
    return NextResponse.json(users.map(u => ({ ...u, password: undefined })))
}

export async function POST(req: NextRequest) {
    try {
        const { name, email, password, roleId, active } = await req.json()
        const hashedPassword = await bcrypt.hash(password, 10)
        const user = await prisma.user.create({
            data: { name, email, password: hashedPassword, roleId: parseInt(roleId), active: active ?? true },
            include: { role: true },
        })
        return NextResponse.json({ ...user, password: undefined }, { status: 201 })
    } catch {
        return NextResponse.json({ error: "Error al crear el usuario" }, { status: 400 })
    }
}
