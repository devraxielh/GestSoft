import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

        const oficinas = await prisma.oficina.findMany({
            orderBy: { id: "asc" },
            include: {
                sede: true,
                directivos: {
                    include: {
                        person: true
                    }
                }
            }
        })
        // Add count manually from the included directivos
        const result = oficinas.map(o => ({
            ...o,
            _count: { directivos: o.directivos?.length ?? 0 }
        }))
        return NextResponse.json(result)
    } catch (e) {
        console.error("Error fetching oficinas:", e)
        return NextResponse.json([], { status: 200 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

        const { name, sedeId, description } = await req.json()
        const oficina = await prisma.oficina.create({
            data: {
                name,
                sedeId: parseInt(sedeId),
                description: description || null
            }
        })
        return NextResponse.json(oficina, { status: 201 })
    } catch {
        return NextResponse.json({ error: "Error al crear la oficina" }, { status: 400 })
    }
}
