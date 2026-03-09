import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get("id")

        const jerarquia = await prisma.sede.findMany({
            where: id ? { id: parseInt(id) } : {},
            orderBy: { name: "asc" },
            include: {
                rector: {
                    select: { id: true, fullName: true, identification: true }
                },
                facultades: {
                    orderBy: { name: "asc" },
                    include: {
                        dean: {
                            select: { id: true, fullName: true, identification: true }
                        },
                        programs: {
                            orderBy: { name: "asc" },
                            include: {
                                director: {
                                    select: { id: true, fullName: true, identification: true }
                                },
                                _count: {
                                    select: { docentes: true }
                                }
                            }
                        }
                    }
                },
                oficinas: {
                    orderBy: { name: "asc" },
                    include: {
                        directivos: {
                            include: {
                                person: {
                                    select: { id: true, fullName: true, identification: true }
                                }
                            }
                        }
                    }
                }
            }
        })

        return NextResponse.json(jerarquia)
    } catch (error: any) {
        console.error("🚨 Error in GET /api/sedes/jerarquia:", error)
        return NextResponse.json({ error: error.message || "Error al obtener la jerarquía" }, { status: 500 })
    }
}
