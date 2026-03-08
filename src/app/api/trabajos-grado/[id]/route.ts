import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const resolvedParams = await params;
        const id = Number(resolvedParams.id);
        const body = await req.json();
        const { title, level, defenseDate, grade, status, programId, studentIds, advisorIds, juryIds } = body;

        // Convert string arrays to numbers
        const pStudentIds = Array.isArray(studentIds) ? studentIds.map(Number) : [];
        const pAdvisorIds = Array.isArray(advisorIds) ? advisorIds.map(Number) : [];
        const pJuryIds = Array.isArray(juryIds) ? juryIds.map(Number) : [];

        // Delete existing relationships first for simplicity of many-to-many updates
        await prisma.thesisStudent.deleteMany({ where: { thesisId: id } });
        await prisma.thesisAdvisor.deleteMany({ where: { thesisId: id } });
        await prisma.thesisJury.deleteMany({ where: { thesisId: id } });

        const updated = await prisma.thesis.update({
            where: { id },
            data: {
                title,
                level,
                defenseDate: defenseDate ? new Date(defenseDate) : null,
                grade: grade !== undefined && grade !== null && grade !== "" ? parseFloat(grade) : null,
                status,
                programId: programId ? Number(programId) : undefined,
                students: {
                    create: pStudentIds.map((pid: number) => ({ personId: pid }))
                },
                advisors: {
                    create: pAdvisorIds.map((pid: number) => ({ personId: pid, roleType: "Principal" }))
                },
                juries: {
                    create: pJuryIds.map((pid: number) => ({ personId: pid }))
                }
            },
            include: {
                program: true,
                students: { include: { person: true } },
                advisors: { include: { person: true } },
                juries: { include: { person: true } },
            }
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error("Error updating thesis:", error);
        return NextResponse.json({ error: "Error interno al actualizar", details: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const resolvedParams = await params;
        const id = Number(resolvedParams.id);

        // Delete dependencies (though cascade should handle it ideally)
        await prisma.thesisStudent.deleteMany({ where: { thesisId: id } });
        await prisma.thesisAdvisor.deleteMany({ where: { thesisId: id } });
        await prisma.thesisJury.deleteMany({ where: { thesisId: id } });

        await prisma.thesis.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting thesis:", error);
        return NextResponse.json({ error: "Error al eliminar el trabajo de grado" }, { status: 500 });
    }
}
