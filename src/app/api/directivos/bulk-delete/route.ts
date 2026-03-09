import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
    try {
        const { directivoIds } = await req.json()

        if (!directivoIds || !Array.isArray(directivoIds) || directivoIds.length === 0) {
            return NextResponse.json({ error: "No se proporcionaron directivos para eliminar" }, { status: 400 })
        }

        const deleted = await prisma.directivo.deleteMany({
            where: {
                id: { in: directivoIds }
            }
        })

        return NextResponse.json({ success: true, count: deleted.count }, { status: 200 })
    } catch (error: any) {
        console.error("Bulk delete directivos error: ", error)
        return NextResponse.json({ error: "Error al eliminar directivos." }, { status: 500 })
    }
}
