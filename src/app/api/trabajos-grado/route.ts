import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { generateVerificationCode } from "@/lib/hash";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const theses = await prisma.thesis.findMany({
            include: {
                program: true,
                students: { include: { person: true } },
                advisors: { include: { person: true } },
                juries: { include: { person: true } },
            },
            orderBy: { createdAt: 'desc' }
        });

        const formattedTheses = theses.map(t => ({
            ...t,
            students: t.students.map(s => s.person),
            advisors: t.advisors.map(a => a.person),
            juries: t.juries.map(j => j.person)
        }));

        return NextResponse.json(formattedTheses);
    } catch (error) {
        console.error("Error fetching theses:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const body = await req.json();
        const { title, level, defenseDate, grade, status, programId, studentIds, advisorIds, juryIds } = body;

        if (!title || !level || !programId) {
            return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
        }

        const parsedStudentIds = Array.isArray(studentIds) ? studentIds.map(Number) : [];
        const parsedAdvisorIds = Array.isArray(advisorIds) ? advisorIds.map(Number) : [];
        const parsedJuryIds = Array.isArray(juryIds) ? juryIds.map(Number) : [];

        const thesis = await prisma.thesis.create({
            data: {
                title,
                level,
                defenseDate: defenseDate ? new Date(defenseDate) : null,
                grade: grade ? parseFloat(grade) : null,
                status: status || "En desarrollo",
                programId: Number(programId),
                students: { create: parsedStudentIds.map(id => ({ personId: id })) },
                advisors: { create: parsedAdvisorIds.map(id => ({ personId: id, roleType: "Principal" })) },
                juries: { create: parsedJuryIds.map(id => ({ personId: id })) }
            },
            include: {
                program: true,
                students: { include: { person: true } },
                advisors: { include: { person: true } },
                juries: { include: { person: true } },
            }
        });

        return NextResponse.json(thesis, { status: 201 });
    } catch (error: any) {
        console.error("Error creating thesis:", error);
        return NextResponse.json({ error: "Error interno al crear el trabajo de grado", details: error.message }, { status: 500 });
    }
}
