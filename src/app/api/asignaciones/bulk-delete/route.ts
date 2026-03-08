import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
    try {
        const { assignmentIds } = await req.json()

        if (!assignmentIds || !Array.isArray(assignmentIds) || assignmentIds.length === 0) {
            return NextResponse.json({ error: "No se proporcionaron asignaciones para eliminar" }, { status: 400 })
        }

        const deleted = await prisma.certificateAssignment.deleteMany({
            where: {
                id: { in: assignmentIds }
            }
        })

        return NextResponse.json({ success: true, count: deleted.count }, { status: 200 })
    } catch (error: any) {
        console.error("Bulk delete assignments error: ", error)
        return NextResponse.json({ error: "Error al eliminar las asignaciones" }, { status: 500 })
    }
}
