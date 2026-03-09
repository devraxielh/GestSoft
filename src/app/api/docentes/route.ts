import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const programIdParam = searchParams.get("programId")

        if (!programIdParam) {
            return NextResponse.json({ error: "programId es requerido" }, { status: 400 })
        }

        const docentes = await prisma.docente.findMany({
            where: { programId: parseInt(programIdParam, 10) },
            include: { person: true },
            orderBy: { person: { fullName: "asc" } }
        })
        return NextResponse.json(docentes)
    } catch (e: any) {
        console.error("🚨 Error in GET /api/docentes:", e)
        return NextResponse.json({ error: e.message || "Error al obtener docentes" }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const { personId, programId, contractType, dedication, teacherType } = await req.json()

        if (!personId || !programId) {
            return NextResponse.json({ error: "personId y programId son requeridos" }, { status: 400 })
        }

        const personIdInt = parseInt(personId)
        const programIdInt = parseInt(programId)

        if (isNaN(personIdInt) || isNaN(programIdInt)) {
            return NextResponse.json({ error: "ID de persona o programa inválido" }, { status: 400 })
        }

        const docente = await prisma.docente.create({
            data: {
                personId: personIdInt,
                programId: programIdInt,
                contractType: contractType || null,
                dedication: dedication || null,
                teacherType: teacherType || null
            },
            include: { person: true }
        })
        return NextResponse.json(docente, { status: 201 })
    } catch (e: any) {
        console.error("🚨 Error in POST /api/docentes:", e)
        return NextResponse.json({ error: `Error al asignar: ${e.message || "Error desconocido"}` }, { status: 500 })
    }
}
