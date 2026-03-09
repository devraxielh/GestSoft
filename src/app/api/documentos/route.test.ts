import { describe, it, expect, vi } from "vitest"
import { GET } from "./route"
import { prisma } from "@/lib/prisma"

// Mock prisma
vi.mock("@/lib/prisma", () => ({
    prisma: {
        documento: {
            findMany: vi.fn(),
        },
    },
}))

describe("GET /api/documentos", () => {
    it("should return empty array and status 200 when database throws an error", async () => {
        // Arrange
        const mockError = new Error("Database connection failed")
        ;(prisma as any).documento.findMany.mockRejectedValue(mockError)

        // Prevent console.error from polluting the test output
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

        // Act
        const response = await GET()
        const data = await response.json()

        // Assert
        expect(response.status).toBe(200)
        expect(data).toEqual([])
        expect((prisma as any).documento.findMany).toHaveBeenCalledWith({
            orderBy: { year: "desc" },
            include: {
                program: {
                    include: { faculty: true }
                }
            }
        })

        // Cleanup
        consoleSpy.mockRestore()
    })
})
