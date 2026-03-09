import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const sedeIdParam = searchParams.get("sedeId")

        const query: any = {
            orderBy: { id: "asc" },
            include: {
                dean: true,
                _count: {
                    select: { programs: true }
                }
            }
        }
        if (sedeIdParam) {
            query.where = { sedeId: parseInt(sedeIdParam, 10) }
        }

        const faculties = await prisma.faculty.findMany(query)
        return NextResponse.json(faculties)
    } catch (e: any) {
        console.error("🚨 Error in GET /api/facultades:", e)
        return NextResponse.json({ error: e.message || "Error al obtener facultades" }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const { name, deanId, address, email, phone, sedeId, presentation } = await req.json()

        if (!sedeId) {
            return NextResponse.json({ error: "Sede ID requerido" }, { status: 400 })
        }

        const faculty = await prisma.faculty.create({
            data: {
                name,
                deanId: deanId ? parseInt(deanId, 10) : null,
                address: address || null,
                email: email || null,
                phone: phone || null,
                sedeId: parseInt(sedeId, 10),
                presentation: presentation || null
            }
        })
        return NextResponse.json(faculty, { status: 201 })
    } catch {
        return NextResponse.json({ error: "Error al crear la facultad" }, { status: 400 })
    }
}
