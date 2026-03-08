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

            try {
                // Find program ID if name is provided
                // Ensure identification is string and clean it up
                const idStr = dataRow.Identificacion.toString().trim();
                const rawName = dataRow.Nombre_Completo.toString().trim();
                const formattedName = rawName.toLowerCase().split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

                // Upsert person
                const person = await prisma.person.upsert({
                    where: { identification: idStr },
                    update: {
                        fullName: formattedName,
                        email: dataRow.Correo || ""
                    },
                    create: {
                        identification: idStr,
                        idType: "CC", // Defaulting to CC for bulk uploads if no type is provided
                        fullName: formattedName,
                        email: dataRow.Correo ? dataRow.Correo.toString().trim() : ""
                    }
                });

                // Create assignment if it doesn't exist with EXACT same details
                const existingAssignment = await prisma.certificateAssignment.findFirst({
                    where: {
                        certificateId: certId,
                        personId: person.id,
                        participationDetails: dataRow.Detalles || null
                    }
                });

                if (!existingAssignment) {
                    await prisma.certificateAssignment.create({
                        data: {
                            certificateId: certId,
                            personId: person.id,
                            participationDetails: dataRow.Detalles || null
                        }
                    });
                    assignedCount++;
                } else {
                    errorCount++;
                    errors.push(`Fila ${index + 2}: La persona ${dataRow.Identificacion} ya tiene este certificado asignado.`);
                }

            } catch (err: any) {
                errorCount++;
                errors.push(`Fila ${index + 2}: Error al procesar persona ${dataRow.Identificacion} - ${err.message}`);
                console.error("Bulk assign row error: ", err);
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
