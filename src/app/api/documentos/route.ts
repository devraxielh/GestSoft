import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const documentos = await (prisma as any).documento.findMany({
            orderBy: { year: "desc" },
            include: {
                program: {
                    include: { faculty: true }
                }
            }
        })
        return NextResponse.json(documentos)
    } catch (e) {
        console.error("Error fetching documentos:", e)
        return NextResponse.json([], { status: 200 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const { type, year, programId, description, status } = await req.json()
        const documento = await (prisma as any).documento.create({
            data: {
                type,
                year: parseInt(year),
                programId: parseInt(programId),
                description: description || null,
                status: status || null
            },
            include: {
                program: { include: { faculty: true } }
            }
        })
        return NextResponse.json(documento, { status: 201 })
    } catch (e: any) {
        console.error("Error creating documento:", e)
        return NextResponse.json({ error: e?.message || "Error al crear el documento" }, { status: 400 })
    }
}
