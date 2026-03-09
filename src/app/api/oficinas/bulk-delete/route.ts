import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
    try {
        const { oficinaIds } = await req.json()

        if (!oficinaIds || !Array.isArray(oficinaIds) || oficinaIds.length === 0) {
            return NextResponse.json({ error: "No se proporcionaron oficinas para eliminar" }, { status: 400 })
        }

        const deleted = await prisma.oficina.deleteMany({
            where: {
                id: { in: oficinaIds }
            }
        })

        return NextResponse.json({ success: true, count: deleted.count }, { status: 200 })
    } catch (error: any) {
        console.error("Bulk delete oficinas error: ", error)
        return NextResponse.json({ error: "Error al eliminar las oficinas." }, { status: 500 })
    }
}
