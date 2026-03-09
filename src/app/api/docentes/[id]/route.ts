import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const parsedId = parseInt(id)
        const { contractType, dedication, teacherType } = await req.json()

        const docente = await prisma.docente.update({
            where: { id: parsedId },
            data: {
                contractType: contractType || null,
                dedication: dedication || null,
                teacherType: teacherType || null
            },
            include: { person: true }
        })
        return NextResponse.json(docente)
    } catch (e: any) {
        console.error("🚨 Error in PUT /api/docentes/[id]:", e)
        return NextResponse.json({ error: "No se pudo actualizar el docente." }, { status: 400 })
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const parsedId = parseInt(id)
        await prisma.docente.delete({ where: { id: parsedId } })
        return NextResponse.json({ success: true })
    } catch (e: any) {
        console.error("🚨 Error in DELETE /api/docentes/[id]:", e)
        return NextResponse.json({ error: "No se pudo eliminar la asignación del docente." }, { status: 400 })
    }
}
