import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

        const factores = await prisma.factor.findMany({
            orderBy: { number: "asc" }
        })
        return NextResponse.json(factores)
    } catch (e) {
        console.error("Error fetching factores:", e)
        return NextResponse.json([], { status: 200 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

        const { number, name, description } = await req.json()
        const factor = await prisma.factor.create({
            data: {
                number: parseInt(number),
                name,
                description: description || null
            }
        })
        return NextResponse.json(factor, { status: 201 })
    } catch (e: any) {
        console.error("Error creating factor:", e)
        if (e?.code === "P2002") {
            return NextResponse.json({ error: "Ya existe un factor con ese número o nombre" }, { status: 400 })
        }
        return NextResponse.json({ error: "Error al crear el factor: " + (e?.message || "desconocido") }, { status: 400 })
    }
}
