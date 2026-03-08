import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        let config = await prisma.setting.findUnique({
            where: { id: 1 }
        })

        if (!config) {
            // Create default config if it doesn't exist
            config = await prisma.setting.create({
                data: {
                    id: 1,
                    companyName: "GestSoft",
                    logoUrl: "/logo.webp"
                }
            })
        }

        return NextResponse.json(config)
    } catch (error) {
        console.error("Config GET error:", error)
        return NextResponse.json({ error: "Error al obtener la configuración" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()

        const config = await prisma.setting.upsert({
            where: { id: 1 },
            update: {
                companyName: body.companyName,
                smtpHost: body.smtpHost,
                smtpPort: body.smtpPort,
                smtpUser: body.smtpUser,
                smtpPass: body.smtpPass,
                smtpFrom: body.smtpFrom,
                logoUrl: body.logoUrl
            },
            create: {
                id: 1,
                companyName: body.companyName || "GestSoft",
                smtpHost: body.smtpHost,
                smtpPort: body.smtpPort,
                smtpUser: body.smtpUser,
                smtpPass: body.smtpPass,
                smtpFrom: body.smtpFrom,
                logoUrl: body.logoUrl || "/logo.webp"
            }
        })

        return NextResponse.json(config)
    } catch (error) {
        console.error("Config POST error:", error)
        return NextResponse.json({ error: "Error al guardar la configuración" }, { status: 500 })
    }
}
