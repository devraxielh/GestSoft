import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const facultyIdParam = searchParams.get("facultyId")

        const query: any = {
            include: {
                faculty: true,
                director: true,
                _count: {
                    select: { docentes: true }
                }
            },
            orderBy: { name: "asc" }
        }

        if (facultyIdParam) {
            query.where = { facultyId: parseInt(facultyIdParam, 10) }
        }

        const programs = await prisma.program.findMany(query)
        return NextResponse.json(programs)
    } catch (e: any) {
        console.error("🚨 Error in GET /api/programas:", e)
        return NextResponse.json({ error: e.message || "Error al obtener programas" }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const { name, directorId, address, email, phone, facultyId, presentation, type, status } = await req.json()
        const program = await prisma.program.create({
            data: {
                name,
                directorId: directorId ? parseInt(directorId) : null,
                address: address || null,
                email: email || null,
                phone: phone || null,
                facultyId: parseInt(facultyId),
                presentation: presentation || null,
                type: type || null,
                status: status || null
            }
        })
        return NextResponse.json(program, { status: 201 })
    } catch {
        return NextResponse.json({ error: "No se pudo crear el programa. Asegúrate de que el nombre sea único." }, { status: 400 })
    }
}
