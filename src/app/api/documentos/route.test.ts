import { GET } from "./route"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// Mock the prisma client
jest.mock("@/lib/prisma", () => ({
    prisma: {
        documento: {
            findMany: jest.fn()
        }
    }
}))

// Mock NextResponse
jest.mock("next/server", () => ({
    NextResponse: {
        json: jest.fn()
    }
}))

describe("GET /api/documentos", () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it("should return an empty array and status 200 when a Prisma error occurs", async () => {
        // Arrange
        const mockError = new Error("Database connection failed")

        // Suppress console.error in tests to avoid noisy output, or optionally verify it's called
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {})

        ;(prisma as any).documento.findMany.mockRejectedValue(mockError)

        const expectedResponse = { status: 200 }
        ;(NextResponse.json as jest.Mock).mockReturnValue(expectedResponse)

        // Act
        const result = await GET()

        // Assert
        expect((prisma as any).documento.findMany).toHaveBeenCalledTimes(1)
        expect(consoleSpy).toHaveBeenCalledWith("Error fetching documentos:", mockError)
        expect(NextResponse.json).toHaveBeenCalledWith([], { status: 200 })
        expect(result).toBe(expectedResponse as any)

        consoleSpy.mockRestore()
    })

    it("should return the documentos when Prisma query succeeds", async () => {
        // Arrange
        const mockDocumentos = [
            { id: 1, type: "RESOLUCION", year: 2024, programId: 1, program: { faculty: { id: 1 } } }
        ]

        ;(prisma as any).documento.findMany.mockResolvedValue(mockDocumentos)

        const expectedResponse = { status: 200, data: mockDocumentos }
        ;(NextResponse.json as jest.Mock).mockReturnValue(expectedResponse)

        // Act
        const result = await GET()

        // Assert
        expect((prisma as any).documento.findMany).toHaveBeenCalledTimes(1)
        expect(NextResponse.json).toHaveBeenCalledWith(mockDocumentos)
        expect(result).toBe(expectedResponse as any)
    })
})
