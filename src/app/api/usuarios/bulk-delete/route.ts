import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
    try {
        const { userIds } = await req.json()

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json({ error: "No se proporcionaron usuarios para eliminar" }, { status: 400 })
        }

        const deleted = await prisma.user.deleteMany({
            where: {
                id: { in: userIds }
            }
        })

        return NextResponse.json({ success: true, count: deleted.count }, { status: 200 })
    } catch (error: any) {
        console.error("Bulk delete users error: ", error)
        return NextResponse.json({ error: "Error al eliminar los usuarios" }, { status: 500 })
    }
}
