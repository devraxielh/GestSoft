import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    try {
        const { id } = await params
        const documento = await (prisma as any).documento.findUnique({
            where: { id: parseInt(id) },
            include: { program: { include: { faculty: { include: { sede: true } } } } }
        })
        if (!documento) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
        return NextResponse.json(documento)
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Error" }, { status: 500 })
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    try {
        const { id } = await params
        const { type, year, programId, description, status, content, coverPage, contextoInstitucional, misionInstitucional, visionInstitucional, presentacionFacultad, presentacionPrograma } = await req.json()
        const documento = await (prisma as any).documento.update({
            where: { id: parseInt(id) },
            data: {
                type,
                year: parseInt(year),
                programId: parseInt(programId),
                description: description || null,
                status: status !== undefined ? (status || null) : undefined,
                content: content !== undefined ? (content || null) : undefined,
                coverPage: coverPage !== undefined ? (coverPage || null) : undefined,
                contextoInstitucional: contextoInstitucional !== undefined ? (contextoInstitucional || null) : undefined,
                misionInstitucional: misionInstitucional !== undefined ? (misionInstitucional || null) : undefined,
                visionInstitucional: visionInstitucional !== undefined ? (visionInstitucional || null) : undefined,
                presentacionFacultad: presentacionFacultad !== undefined ? (presentacionFacultad || null) : undefined,
                presentacionPrograma: presentacionPrograma !== undefined ? (presentacionPrograma || null) : undefined
            },
            include: {
                program: { include: { faculty: true } }
            }
        })
        return NextResponse.json(documento)
    } catch (e: any) {
        console.error("Error updating documento:", e)
        return NextResponse.json({ error: e?.message || "Error al actualizar" }, { status: 400 })
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    try {
        const { id } = await params
        await (prisma as any).documento.delete({ where: { id: parseInt(id) } })
        return NextResponse.json({ ok: true })
    } catch {
        return NextResponse.json({ error: "Error al eliminar" }, { status: 400 })
    }
}
