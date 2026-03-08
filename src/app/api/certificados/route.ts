import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    const certificates = await prisma.certificate.findMany({
        include: { event: true, _count: { select: { assignments: true } } },
        orderBy: { id: "desc" },
    })
    return NextResponse.json(certificates)
}

export async function POST(req: NextRequest) {
    try {
        const data = await req.json()
        const certificate = await prisma.certificate.create({
            data: {
                participationType: data.participationType,
                templateHtml: data.templateHtml,
                eventId: parseInt(data.eventId),
                issueDate: new Date(data.issueDate),
            },
            include: { event: true },
        })
        return NextResponse.json(certificate, { status: 201 })
    } catch {
        return NextResponse.json({ error: "Error al crear el certificado" }, { status: 400 })
    }
}
