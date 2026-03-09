import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
    try {
        const { sedeIds } = await req.json()

        if (!sedeIds || !Array.isArray(sedeIds) || sedeIds.length === 0) {
            return NextResponse.json({ error: "No se proporcionaron sedes para eliminar" }, { status: 400 })
        }

        const deleted = await prisma.sede.deleteMany({
            where: {
                id: { in: sedeIds }
            }
        })

        return NextResponse.json({ success: true, count: deleted.count }, { status: 200 })
    } catch (error: any) {
        console.error("Bulk delete sedes error: ", error)
        return NextResponse.json({ error: "Error al eliminar las sedes." }, { status: 500 })
    }
}
