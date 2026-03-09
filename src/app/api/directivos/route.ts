import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const oficinaId = searchParams.get("oficinaId")

    const query: any = {
        orderBy: { id: "asc" },
        include: {
            person: true,
            oficina: true
        }
    }

    if (oficinaId) {
        query.where = { oficinaId: parseInt(oficinaId) }
    }

    const directivos = await prisma.directivo.findMany(query)
    return NextResponse.json(directivos)
}

export async function POST(req: NextRequest) {
    try {
        const { oficinaId, personId, cargo } = await req.json()
        const directivo = await prisma.directivo.create({
            data: {
                oficinaId: parseInt(oficinaId),
                personId: parseInt(personId),
                cargo: cargo || "Integrante"
            }
        })
        return NextResponse.json(directivo, { status: 201 })
    } catch {
        return NextResponse.json({ error: "Error al asignar directivo o integrante a la oficina" }, { status: 400 })
    }
}
