import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

interface BulkAssignmentRow {
    Identificacion: string;
    Nombre_Completo: string;
    Correo?: string;
    Detalles?: string;
}

export async function POST(req: NextRequest) {
    try {
        const { certificateId, people } = await req.json()

        if (!certificateId || !people || !Array.isArray(people)) {
            return NextResponse.json({ error: "Datos inválidos para asignación masiva" }, { status: 400 })
        }

        const certId = parseInt(certificateId)

        // Verify certificate exists
        const cert = await prisma.certificate.findUnique({
            where: { id: certId }
        })

        if (!cert) {
            return NextResponse.json({ error: "Certificado no encontrado" }, { status: 404 })
        }

        const requiresDetails = ["Ponente", "Conferencista", "Evaluador"].includes(cert.participationType);

        let assignedCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        // 1. Validate and process initial data
        const validRows: {
            index: number;
            dataRow: BulkAssignmentRow;
            idStr: string;
            formattedName: string;
            email: string;
        }[] = [];

        for (const [index, row] of people.entries()) {
            const dataRow = row as BulkAssignmentRow;

            if (!dataRow.Identificacion || !dataRow.Nombre_Completo) {
                errorCount++;
                errors.push(`Fila ${index + 2}: Faltan datos obligatorios (Identificacion, Nombre_Completo).`);
                continue;
            }

            if (requiresDetails && !dataRow.Detalles) {
                errorCount++;
                errors.push(`Fila ${index + 2}: Falta columna Detalles (Obligatoria para tipo ${cert.participationType}).`);
                continue;
            }

            const idStr = dataRow.Identificacion.toString().trim();
            const rawName = dataRow.Nombre_Completo.toString().trim();
            const formattedName = rawName.toLowerCase().split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

            validRows.push({
                index,
                dataRow,
                idStr,
                formattedName,
                email: dataRow.Correo ? dataRow.Correo.toString().trim() : ""
            });
        }

        if (validRows.length > 0) {
            try {
                // 2. Process persons in batch
                const idStrs = [...new Set(validRows.map(r => r.idStr))];
                const existingPersons = await prisma.person.findMany({
                    where: { identification: { in: idStrs } }
                });
                const existingPersonMap = new Map(existingPersons.map(p => [p.identification, p]));

                const personsToCreate = new Map<string, any>();
                const personsToUpdate = new Map<string, any>();

                for (const row of validRows) {
                    const existing = existingPersonMap.get(row.idStr);
                    if (existing) {
                        if (existing.fullName !== row.formattedName || existing.email !== row.email) {
                            personsToUpdate.set(row.idStr, {
                                id: existing.id,
                                fullName: row.formattedName,
                                email: row.email
                            });
                        }
                    } else {
                        if (!personsToCreate.has(row.idStr)) {
                            personsToCreate.set(row.idStr, {
                                identification: row.idStr,
                                idType: "CC", // Defaulting to CC for bulk uploads
                                fullName: row.formattedName,
                                email: row.email
                            });
                        }
                    }
                }

                if (personsToCreate.size > 0) {
                    await prisma.person.createMany({
                        data: Array.from(personsToCreate.values()),
                        skipDuplicates: true
                    });
                }

                if (personsToUpdate.size > 0) {
                    const updatePromises = Array.from(personsToUpdate.values()).map(p =>
                        prisma.person.update({
                            where: { id: p.id },
                            data: { fullName: p.fullName, email: p.email }
                        }).catch(err => {
                            console.error(`Error updating person ${p.id}:`, err);
                        })
                    );
                    await Promise.all(updatePromises);
                }

                const allPersons = await prisma.person.findMany({
                    where: { identification: { in: idStrs } },
                    select: { id: true, identification: true }
                });
                const personIdMap = new Map(allPersons.map(p => [p.identification, p.id]));

                // 3. Process assignments in batch
                const existingAssignments = await prisma.certificateAssignment.findMany({
                    where: {
                        certificateId: certId,
                        personId: { in: Array.from(personIdMap.values()) }
                    },
                    select: { personId: true, participationDetails: true }
                });

                const assignmentSet = new Set(
                    existingAssignments.map(a => `${a.personId}-${a.participationDetails || ''}`)
                );

                const newAssignments: { certificateId: number; personId: number; participationDetails: string | null }[] = [];
                for (const row of validRows) {
                    const pId = personIdMap.get(row.idStr);
                    if (!pId) {
                        errorCount++;
                        errors.push(`Fila ${row.index + 2}: Error al procesar persona ${row.idStr}`);
                        continue;
                    }

                    const key = `${pId}-${row.dataRow.Detalles || ''}`;
                    if (!assignmentSet.has(key)) {
                        newAssignments.push({
                            certificateId: certId,
                            personId: pId,
                            participationDetails: row.dataRow.Detalles || null
                        });
                        assignmentSet.add(key); // Prevent duplicates in the same batch
                    } else {
                        errorCount++;
                        errors.push(`Fila ${row.index + 2}: La persona ${row.dataRow.Identificacion} ya tiene este certificado asignado.`);
                    }
                }

                if (newAssignments.length > 0) {
                    await prisma.certificateAssignment.createMany({
                        data: newAssignments,
                        skipDuplicates: true
                    });
                    assignedCount += newAssignments.length;
                }
            } catch (err: any) {
                console.error("Bulk assign batch error: ", err);
                return NextResponse.json({ error: "Error procesando el lote de datos" }, { status: 500 })
            }
        }

        return NextResponse.json({
            success: true,
            assignedCount,
            errorCount,
            errors
        }, { status: 200 })

    } catch (error: any) {
        console.error("Bulk assignment error:", error);
        return NextResponse.json({ error: "Error procesando la asignación masiva" }, { status: 500 })
    }
}
