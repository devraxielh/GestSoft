import { GET } from "./route";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Mock the prisma client
jest.mock("@/lib/prisma", () => ({
  prisma: {
    permission: {
      findMany: jest.fn(),
    },
  },
}));

describe("GET /api/permissions", () => {
  let consoleErrorMock: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorMock = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorMock.mockRestore();
  });

  it("should return a list of permissions on success", async () => {
    // Arrange
    const mockPermissions = [
      { id: 1, name: "View Users", description: "Can view users list" },
      { id: 2, name: "Edit Users", description: "Can edit users" },
    ];
    (prisma.permission.findMany as jest.Mock).mockResolvedValue(mockPermissions);

    // Act
    const response = await GET();
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data).toEqual(mockPermissions);
    expect(prisma.permission.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.permission.findMany).toHaveBeenCalledWith({
      orderBy: { id: "asc" },
    });
  });

  it("should return 500 on database error", async () => {
    // Arrange
    const errorMsg = "Database connection failed";
    const dbError = new Error(errorMsg);
    (prisma.permission.findMany as jest.Mock).mockRejectedValue(dbError);

    // Act
    const response = await GET();
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "No se pudieron obtener los permisos" });
    expect(consoleErrorMock).toHaveBeenCalledTimes(1);
    expect(consoleErrorMock).toHaveBeenCalledWith("Error fetching permissions:", dbError);
  });
});
