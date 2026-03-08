import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    const programs = await prisma.program.findMany({ include: { faculty: true }, orderBy: { name: "asc" } })
    return NextResponse.json(programs)
}

export async function POST(req: NextRequest) {
    try {
        const { name, directorName, address, email, phone, facultyId } = await req.json()
        const program = await prisma.program.create({
            data: {
                name,
                directorName: directorName || "Sin asignar",
                address: address || null,
                email: email || null,
                phone: phone || null,
                facultyId: parseInt(facultyId)
            }
        })
        return NextResponse.json(program, { status: 201 })
    } catch {
        return NextResponse.json({ error: "No se pudo crear el programa. Asegúrate de que el nombre sea único." }, { status: 400 })
    }
}
