import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateVerificationCode } from "@/lib/hash"

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

        const body = await req.json()
        const { title, level, defenseDate, grade, status, programId, students, advisors, juries } = body

        if (!title || !level || !programId) {
            return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 })
        }

        // Iniciar transacción de modo que se deshaga si falla algo
        const thesis = await prisma.$transaction(async (tx) => {
            // Función para procesar o crear personas dentro de la transacción
            const processPersons = async (personsList: any[]) => {
                if (!personsList || personsList.length === 0) return []

                const ids = []
                for (const person of personsList) {
                    if (!person.identification) continue // Identificación es obligatoria

                    // Buscar si existe por identificación
                    let existingPerson = await tx.person.findUnique({
                        where: { identification: person.identification }
                    })

                    if (existingPerson) {
                        // Actualizar correo si es diferente y la persona mandó correo nuevo
                        if (person.email && existingPerson.email !== person.email) {
                            existingPerson = await tx.person.update({
                                where: { id: existingPerson.id },
                                data: { email: person.email }
                            })
                        }
                        ids.push(existingPerson.id)
                    } else {
                        // Si no existe, entonces el Nombre Completo es obligatorio
                        if (!person.fullName) {
                            throw new Error(`La persona con identificación ${person.identification} no existe y no se proporcionó su nombre para crearla.`)
                        }

                        // Crear nueva persona
                        const newPerson = await tx.person.create({
                            data: {
                                identification: person.identification,
                                fullName: person.fullName,
                                email: person.email || "sin_correo@test.com",
                                idType: "CC",       // Requerido por el schema
                                phone: "",          // Default
                            }
                        })
                        ids.push(newPerson.id)
                    }
                }
                return ids
            }

            const studentIds = await processPersons(students)
            const advisorIds = await processPersons(advisors)
            const juryIds = await processPersons(juries)

            const newThesis = await tx.thesis.create({
                data: {
                    title,
                    level,
                    defenseDate: defenseDate ? new Date(defenseDate) : null,
                    grade: grade || null,
                    status: status || "En desarrollo",
                    programId: Number(programId),
                    students: { create: studentIds.map((id: number) => ({ personId: id })) },
                    advisors: { create: advisorIds.map((id: number) => ({ personId: id })) },
                    juries: { create: juryIds.map((id: number) => ({ personId: id })) }
                }
            })
            return newThesis
        })

        return NextResponse.json(thesis, { status: 201 })
    } catch (error: any) {
        console.error("==== ERROR AL IMPORTAR TESIS ====")
        console.error("Mensaje:", error.message)
        console.error("Stack:", error.stack)
        return NextResponse.json({ error: error.message || "Error interno al procesar la importación", details: error.stack }, { status: 500 })
    }
}
