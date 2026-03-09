import { NextRequest } from "next/server";
import { DELETE } from "./route";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    documento: {
      delete: jest.fn(),
    },
  },
}));

describe("DELETE /api/documentos/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 200 ok when deletion is successful", async () => {
    (prisma.documento.delete as jest.Mock).mockResolvedValue({ id: 1 });

    const req = {} as NextRequest;
    const params = Promise.resolve({ id: "1" });

    const response = await DELETE(req, { params });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(prisma.documento.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("should return 400 status with error message when deletion fails", async () => {
    (prisma.documento.delete as jest.Mock).mockRejectedValue(new Error("Database error"));

    const req = {} as NextRequest;
    const params = Promise.resolve({ id: "1" });

    const response = await DELETE(req, { params });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "Error al eliminar" });
    expect(prisma.documento.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
