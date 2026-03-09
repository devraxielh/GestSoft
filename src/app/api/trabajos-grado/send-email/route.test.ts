import { NextRequest } from "next/server"
import { POST } from "./route"
import { prisma } from "@/lib/prisma"
import { sendThesisNotification } from "@/lib/mailer"
import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock the dependencies
vi.mock("@/lib/prisma", () => ({
    prisma: {
        thesis: {
            findMany: vi.fn(),
        },
    },
}))

vi.mock("@/lib/mailer", () => ({
    sendThesisNotification: vi.fn(),
}))

describe("POST /api/trabajos-grado/send-email", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("should return 400 when students have missing emails", async () => {
        // Mock a thesis with a student having no email
        const mockTheses = [
            {
                id: 1,
                title: "Test Thesis",
                students: [
                    {
                        person: {
                            email: null, // Missing email
                            fullName: "John Doe",
                        },
                    },
                    {
                        person: {
                            email: "", // Empty string email
                            fullName: "Jane Doe",
                        },
                    },
                ],
            },
        ]

        vi.mocked(prisma.thesis.findMany).mockResolvedValue(mockTheses as any)

        const req = new NextRequest("http://localhost:3000/api/trabajos-grado/send-email", {
            method: "POST",
            body: JSON.stringify({ thesisIds: [1] }),
            headers: {
                "Content-Type": "application/json",
            },
        })

        const response = await POST(req)
        const json = await response.json()

        expect(response.status).toBe(400)
        expect(json).toEqual({
            error: "No hay estudiantes con correo electrónico válido vinculados a estos trabajos",
        })
        expect(sendThesisNotification).not.toHaveBeenCalled()
    })

    it("should process correctly when at least one student has a valid email", async () => {
        const mockTheses = [
            {
                id: 1,
                title: "Test Thesis",
                students: [
                    {
                        person: {
                            email: "valid@example.com",
                            fullName: "Valid User",
                        },
                    },
                    {
                        person: {
                            email: null,
                            fullName: "Invalid User",
                        },
                    },
                ],
            },
        ]

        vi.mocked(prisma.thesis.findMany).mockResolvedValue(mockTheses as any)
        vi.mocked(sendThesisNotification).mockResolvedValue(undefined as any)

        const req = new NextRequest("http://localhost:3000/api/trabajos-grado/send-email", {
            method: "POST",
            body: JSON.stringify({ thesisIds: [1] }),
            headers: {
                "Content-Type": "application/json",
            },
        })

        const response = await POST(req)
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(json.success).toBe(true)
        expect(json.total).toBe(1)
        expect(json.sent).toBe(1)
        expect(sendThesisNotification).toHaveBeenCalledTimes(1)
        expect(sendThesisNotification).toHaveBeenCalledWith(
            "valid@example.com",
            "Valid User",
            "Test Thesis",
            expect.any(String)
        )
    })
})
