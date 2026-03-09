import { NextRequest } from "next/server";
import { POST, GET, DELETE } from "@/app/api/personas/route";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    person: {
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

describe("/api/personas", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("should return a list of persons", async () => {
      const mockPersons = [{ id: 1, fullName: "John Doe" }, { id: 2, fullName: "Jane Doe" }];
      (prisma.person.findMany as jest.Mock).mockResolvedValue(mockPersons);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockPersons);
      expect(prisma.person.findMany).toHaveBeenCalledWith({ include: { program: true }, orderBy: { id: "asc" } });
    });
  });

  describe("POST", () => {
    it("should format fullName properly and create person on happy path", async () => {
      const mockPerson = { id: 1, fullName: "John Doe", email: "john@example.com", programId: null };
      (prisma.person.create as jest.Mock).mockResolvedValue(mockPerson);

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          fullName: "john doe",
          email: "john@example.com",
        }),
      } as unknown as NextRequest;

      const response = await POST(mockRequest);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body).toEqual(mockPerson);
      expect(prisma.person.create).toHaveBeenCalledWith({
        data: {
          fullName: "John Doe",
          email: "john@example.com",
          programId: null,
        }
      });
    });

    it("should parse programId to int if it is a valid string", async () => {
      const mockPerson = { id: 1, fullName: "John Doe", email: "john@example.com", programId: 42 };
      (prisma.person.create as jest.Mock).mockResolvedValue(mockPerson);

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          fullName: "john doe",
          email: "john@example.com",
          programId: "42",
        }),
      } as unknown as NextRequest;

      const response = await POST(mockRequest);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body).toEqual(mockPerson);
      expect(prisma.person.create).toHaveBeenCalledWith({
        data: {
          fullName: "John Doe",
          email: "john@example.com",
          programId: 42,
        }
      });
    });

    it("should return a 400 response with error details when an exception occurs", async () => {
      const errorMsg = "Database error";
      (prisma.person.create as jest.Mock).mockRejectedValue(new Error(errorMsg));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          fullName: "john doe",
          email: "john@example.com",
        }),
      } as unknown as NextRequest;

      const response = await POST(mockRequest);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toHaveProperty("error", "Error al crear la persona");
      expect(body).toHaveProperty("details", errorMsg);
      expect(consoleSpy).toHaveBeenCalledWith("CREATE PERSON ERROR:", expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe("DELETE", () => {
    it("should delete multiple persons and return the count", async () => {
      const mockResult = { count: 3 };
      (prisma.person.deleteMany as jest.Mock).mockResolvedValue(mockResult);

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          ids: [1, 2, 3]
        }),
      } as unknown as NextRequest;

      const response = await DELETE(mockRequest);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveProperty("message", "Personas eliminadas");
      expect(body).toHaveProperty("count", 3);
      expect(prisma.person.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2, 3] } }
      });
    });

    it("should return a 400 response if no ids are provided", async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({}),
      } as unknown as NextRequest;

      const response = await DELETE(mockRequest);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toHaveProperty("error", "IDs no proporcionados");
      expect(prisma.person.deleteMany).not.toHaveBeenCalled();
    });

    it("should return a 400 response if ids array is empty", async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ ids: [] }),
      } as unknown as NextRequest;

      const response = await DELETE(mockRequest);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toHaveProperty("error", "IDs no proporcionados");
      expect(prisma.person.deleteMany).not.toHaveBeenCalled();
    });

    it("should return a 400 response with error details when an exception occurs", async () => {
      const errorMsg = "Database deletion error";
      (prisma.person.deleteMany as jest.Mock).mockRejectedValue(new Error(errorMsg));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          ids: [1, 2, 3]
        }),
      } as unknown as NextRequest;

      const response = await DELETE(mockRequest);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toHaveProperty("error", "Error al eliminar personas en lote");
      expect(body).toHaveProperty("details", errorMsg);
      expect(consoleSpy).toHaveBeenCalledWith("BULK DELETE PERSONS ERROR:", expect.any(Error));

      consoleSpy.mockRestore();
    });
  });
});
