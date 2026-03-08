import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const data = await req.json()
        const certificate = await prisma.certificate.update({
            where: { id: parseInt(id) },
            data: {
                participationType: data.participationType,
                templateHtml: data.templateHtml,
                eventId: parseInt(data.eventId),
                issueDate: new Date(data.issueDate),
            },
            include: { event: true },
        })
        return NextResponse.json(certificate)
    } catch {
        return NextResponse.json({ error: "Error al actualizar el certificado" }, { status: 400 })
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        await prisma.certificate.delete({ where: { id: parseInt(id) } })
        return NextResponse.json({ message: "Certificado eliminado" })
    } catch {
        return NextResponse.json({ error: "No se puede eliminar el certificado" }, { status: 400 })
    }
}
