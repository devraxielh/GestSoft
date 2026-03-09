import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    const sedes = await prisma.sede.findMany({
        orderBy: { id: "asc" },
        include: {
            rector: true,
            _count: {
                select: { oficinas: true, facultades: true }
            }
        }
    })
    return NextResponse.json(sedes)
}

export async function POST(req: NextRequest) {
    try {
        const { name, rectorId, address, email, phone, contextoInstitucional, misionInstitucional, visionInstitucional } = await req.json()
        const sede = await prisma.sede.create({
            data: {
                name,
                rectorId: rectorId ? parseInt(rectorId) : null,
                address: address || null,
                email: email || null,
                phone: phone || null,
                contextoInstitucional: contextoInstitucional || null,
                misionInstitucional: misionInstitucional || null,
                visionInstitucional: visionInstitucional || null
            }
        })
        return NextResponse.json(sede, { status: 201 })
    } catch {
        return NextResponse.json({ error: "Error al crear la sede" }, { status: 400 })
    }
}
