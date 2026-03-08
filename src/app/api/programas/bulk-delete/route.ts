import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
    try {
        const { programIds } = await req.json()

        if (!programIds || !Array.isArray(programIds) || programIds.length === 0) {
            return NextResponse.json({ error: "No se proporcionaron programas para eliminar" }, { status: 400 })
        }

        const deleted = await prisma.program.deleteMany({
            where: {
                id: { in: programIds }
            }
        })

        return NextResponse.json({ success: true, count: deleted.count }, { status: 200 })
    } catch (error: any) {
        console.error("Bulk delete programs error: ", error)
        return NextResponse.json({ error: "Error al eliminar los programas. Asegúrese de que no tengan personas asignadas." }, { status: 500 })
    }
}
