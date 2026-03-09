import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET() {
    console.log("Profile GET: Starting request")
    try {
        const session = await getServerSession(authOptions)
        console.log("Profile GET: Session retrieved:", session ? "YES" : "NO")

        if (!session || !session.user) {
            console.log("Profile GET: No session or user found")
            return NextResponse.json({ error: "No autorizado. Inicie sesión nuevamente." }, { status: 401 })
        }

        const userId = (session.user as any).id
        const userEmail = session.user.email
        console.log("Profile GET: User found in session - ID:", userId, "Email:", userEmail)

        let user;
        if (userId && !isNaN(Number(userId))) {
            console.log("Profile GET: Searching user by ID:", userId)
            user = await prisma.user.findUnique({
                where: { id: Number(userId) },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    roles: {
                        select: {
                            name: true
                        }
                    }
                }
            })
            console.log("Profile GET: User by ID result:", user ? "FOUND" : "NOT FOUND")
        }

        if (!user && userEmail) {
            console.log("Profile GET: Searching user by Email fallback:", userEmail)
            user = await prisma.user.findUnique({
                where: { email: userEmail },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                roles: {
                        select: {
                            name: true
                        }
                    }
                }
            })
            console.log("Profile GET: User by Email result:", user ? "FOUND" : "NOT FOUND")
        }

        if (!user) {
            console.log("Profile GET: User not found in database for current session")
            return NextResponse.json({ error: "No se encontró su información de usuario en la base de datos." }, { status: 404 })
        }

        console.log("Profile GET: Success! Returning user data.")
        return NextResponse.json(user)
    } catch (error) {
        console.error("Profile GET: CRITICAL ERROR:", error)
        return NextResponse.json({
            error: "Error interno al cargar el perfil",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 })
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || !session.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const userId = (session.user as any).id
        const userEmail = session.user.email
        const body = await request.json()
        const { name, email, password, image } = body

        const updateData: any = {}
        if (name) updateData.name = name
        if (email) updateData.email = email
        if (image) updateData.image = image
        if (password) {
            updateData.password = await bcrypt.hash(password, 10)
        }

        let updatedUser;
        if (userId && !isNaN(Number(userId))) {
            updatedUser = await prisma.user.update({
                where: { id: Number(userId) },
                data: updateData,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true
                }
            })
        } else if (userEmail) {
            updatedUser = await prisma.user.update({
                where: { email: userEmail },
                data: updateData,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true
                }
            })
        }

        if (!updatedUser) {
            return NextResponse.json({ error: "No se pudo identificar al usuario para actualizar" }, { status: 400 })
        }

        return NextResponse.json(updatedUser)
    } catch (error) {
        console.error("Profile PATCH error:", error)
        return NextResponse.json({
            error: "Error al actualizar el perfil",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 })
    }
}
