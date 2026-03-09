import { NextRequest } from "next/server";
import { POST } from "../src/app/api/documentos/route";
import { prisma } from "../src/lib/prisma";

// Mock prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    documento: {
      create: jest.fn(),
    },
  },
}));

describe("POST /api/documentos", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should create a new documento successfully", async () => {
    // Arrange
    const mockData = {
      type: "Resolucion",
      year: "2024",
      programId: "1",
      description: "Test description",
      status: "ACTIVO",
    };

    const req = new NextRequest("http://localhost:3000/api/documentos", {
      method: "POST",
      body: JSON.stringify(mockData),
    });

    const mockDocumento = {
      id: 1,
      type: "Resolucion",
      year: 2024,
      programId: 1,
      description: "Test description",
      status: "ACTIVO",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prisma as any).documento.create.mockResolvedValue(mockDocumento);

    // Act
    const response = await POST(req);
    const json = await response.json();

    // Assert
    expect(response.ok).toBe(true);
    expect(json).toEqual({
      ...mockDocumento,
      createdAt: mockDocumento.createdAt.toISOString(),
      updatedAt: mockDocumento.updatedAt.toISOString(),
    });

    expect((prisma as any).documento.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "Resolucion",
          year: 2024,
          programId: 1,
          description: "Test description",
          status: "ACTIVO",
        }),
      })
    );
  });

  it("should handle creation without optional fields", async () => {
    // Arrange
    const mockData = {
      type: "Acta",
      year: "2023",
      programId: "2",
    };

    const req = new NextRequest("http://localhost:3000/api/documentos", {
      method: "POST",
      body: JSON.stringify(mockData),
    });

    const mockDocumento = {
      id: 2,
      type: "Acta",
      year: 2023,
      programId: 2,
      description: null,
      status: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prisma as any).documento.create.mockResolvedValue(mockDocumento);

    // Act
    const response = await POST(req);

    // Assert
    expect(response.ok).toBe(true);
    expect((prisma as any).documento.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "Acta",
          year: 2023,
          programId: 2,
        }),
      })
    );
  });

  it("should return error status when prisma creation fails", async () => {
    // Arrange
    const mockData = {
      type: "Acta",
      year: "2023",
      programId: "2",
    };

    const req = new NextRequest("http://localhost:3000/api/documentos", {
      method: "POST",
      body: JSON.stringify(mockData),
    });

    (prisma as any).documento.create.mockRejectedValue(new Error("Database error"));

    // Act
    const response = await POST(req);
    const json = await response.json();

    // Assert
    expect(response.ok).toBe(false);
    expect(json).toEqual({ error: "Database error" });
  });

  it("should return error status when body parsing fails", async () => {
    // Arrange
    const req = new NextRequest("http://localhost:3000/api/documentos", {
      method: "POST",
      body: "invalid json",
    });

    // Act
    const response = await POST(req);
    const json = await response.json();

    // Assert
    expect(response.ok).toBe(false);
    // Error parsing JSON body is caught by catch block
    expect(json).toHaveProperty("error");
  });
});
