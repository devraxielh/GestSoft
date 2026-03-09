import { DELETE } from "./route";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";

jest.mock("next-auth/next", () => ({
    getServerSession: jest.fn(),
}));

jest.mock("next/server", () => ({
    NextResponse: {
        json: jest.fn((body, init) => ({ body, init })),
    },
}));

describe("DELETE /api/trabajos-grado/[id]", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should return 401 if not authorized", async () => {
        (getServerSession as jest.Mock).mockResolvedValueOnce(null);

        const req = {} as Request;
        const params = Promise.resolve({ id: "1" });

        const response = await DELETE(req, { params });

        expect(getServerSession).toHaveBeenCalledTimes(1);
        expect(NextResponse.json).toHaveBeenCalledWith(
            { error: "No autorizado" },
            { status: 401 }
        );
        expect(response).toEqual({
            body: { error: "No autorizado" },
            init: { status: 401 }
        });
    });
});
