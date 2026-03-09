import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

        const roles = await prisma.role.findMany({
            include: { _count: { select: { users: true } }, permissions: true },
            orderBy: { id: "asc" },
        })
        return NextResponse.json(roles)
    } catch (e) {
        console.error("GET /roles Error:", e)
        return NextResponse.json({ error: String(e) }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

        const { name, permissionIds } = await req.json()
        const role = await prisma.role.create({
            data: {
                name,
                permissions: permissionIds ? { connect: permissionIds.map((id: number) => ({ id })) } : undefined
            }
        })
        return NextResponse.json(role, { status: 201 })
    } catch {
        return NextResponse.json({ error: "Error al crear el rol" }, { status: 400 })
    }
}
