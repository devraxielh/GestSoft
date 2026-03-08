import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    const events = await prisma.event.findMany({
        orderBy: { startDate: "desc" },
        include: {
            certificates: {
                include: {
                    _count: { select: { assignments: true } }
                }
            }
        }
    })
    return NextResponse.json(events)
}

export async function POST(req: NextRequest) {
    try {
        const data = await req.json()
        const event = await prisma.event.create({
            data: {
                name: data.name,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                description: data.description || null,
                eventType: data.eventType,
                status: data.status || "Realizado",
            },
        })
        return NextResponse.json(event, { status: 201 })
    } catch (e) {
        console.error("Error creating event:", e)
        return NextResponse.json({ error: "Error al crear el evento" }, { status: 400 })
    }
}
