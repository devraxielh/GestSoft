import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const permissions = await prisma.permission.findMany({
            orderBy: { id: "asc" }
        })
        return NextResponse.json(permissions)
    } catch (error) {
        console.error("Error fetching permissions:", error)
        return NextResponse.json({ error: "No se pudieron obtener los permisos" }, { status: 500 })
    }
}
