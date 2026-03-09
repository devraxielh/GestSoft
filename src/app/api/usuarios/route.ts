import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET() {
    const users = await prisma.user.findMany({
        include: { roles: true },
        orderBy: { id: "asc" },
    })
    return NextResponse.json(users.map(u => ({ ...u, password: undefined })))
}

export async function POST(req: NextRequest) {
    try {
        const { name, email, password, roleIds, active } = await req.json()
        const hashedPassword = await bcrypt.hash(password, 10)
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                active: active ?? true,
                roles: { connect: (roleIds || []).map((id: number) => ({ id: Number(id) })) }
            },
            include: { roles: true },
        })
        return NextResponse.json({ ...user, password: undefined }, { status: 201 })
    } catch {
        return NextResponse.json({ error: "Error al crear el usuario" }, { status: 400 })
    }
}
