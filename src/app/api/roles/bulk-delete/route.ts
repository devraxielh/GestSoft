import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const { roleIds } = await req.json()

        if (!roleIds || !Array.isArray(roleIds) || roleIds.length === 0) {
            return NextResponse.json({ error: "No se proporcionaron roles para eliminar" }, { status: 400 })
        }

        const deleted = await prisma.role.deleteMany({
            where: {
                id: { in: roleIds }
            }
        })

        return NextResponse.json({ success: true, count: deleted.count }, { status: 200 })
    } catch (error: any) {
        console.error("Bulk delete roles error: ", error)
        return NextResponse.json({ error: "Error al eliminar los roles. Asegúrese de que no tengan usuarios asignados." }, { status: 500 })
    }
}
