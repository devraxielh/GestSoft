import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
    try {
        const { facultyIds } = await req.json()

        if (!facultyIds || !Array.isArray(facultyIds) || facultyIds.length === 0) {
            return NextResponse.json({ error: "No se proporcionaron facultades para eliminar" }, { status: 400 })
        }

        const deleted = await prisma.faculty.deleteMany({
            where: {
                id: { in: facultyIds }
            }
        })

        return NextResponse.json({ success: true, count: deleted.count }, { status: 200 })
    } catch (error: any) {
        console.error("Bulk delete faculties error: ", error)
        return NextResponse.json({ error: "Error al eliminar las facultades. Asegúrese de que no tengan programas asignados." }, { status: 500 })
    }
}
