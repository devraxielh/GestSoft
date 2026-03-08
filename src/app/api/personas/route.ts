import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    const persons = await prisma.person.findMany({ include: { program: true }, orderBy: { id: "asc" } })
    return NextResponse.json(persons)
}

export async function POST(req: NextRequest) {
    try {
        const data = await req.json()
        if (data.fullName) {
            data.fullName = data.fullName.toLowerCase().split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        }
        const person = await prisma.person.create({
            data: {
                ...data,
                programId: data.programId && data.programId !== "" ? parseInt(data.programId) : null,
            }
        })
        return NextResponse.json(person, { status: 201 })
    } catch (err: any) {
        console.error("CREATE PERSON ERROR:", err);
        return NextResponse.json({ error: "Error al crear la persona", details: err.message }, { status: 400 })
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const data = await req.json()
        if (!data.ids || !Array.isArray(data.ids) || data.ids.length === 0) {
            return NextResponse.json({ error: "IDs no proporcionados" }, { status: 400 })
        }
        const result = await prisma.person.deleteMany({
            where: {
                id: {
                    in: data.ids
                }
            }
        })
        return NextResponse.json({ message: "Personas eliminadas", count: result.count }, { status: 200 })
    } catch (err: any) {
        console.error("BULK DELETE PERSONS ERROR:", err);
        return NextResponse.json({ error: "Error al eliminar personas en lote", details: err.message }, { status: 400 })
    }
}
