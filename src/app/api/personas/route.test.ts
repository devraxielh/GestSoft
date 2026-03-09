import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE } from './route';
import { NextRequest } from 'next/server';

// Mock prisma
const { mockDeleteMany } = vi.hoisted(() => ({
  mockDeleteMany: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    person: {
      deleteMany: mockDeleteMany,
    },
  },
}));

describe('DELETE /api/personas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when ids are missing', async () => {
    const req = {
      json: async () => ({}),
    } as unknown as NextRequest;

    const response = await DELETE(req);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: 'IDs no proporcionados' });
    expect(mockDeleteMany).not.toHaveBeenCalled();
  });

  it('should return 400 when ids is not an array', async () => {
    const req = {
      json: async () => ({ ids: '123' }),
    } as unknown as NextRequest;

    const response = await DELETE(req);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: 'IDs no proporcionados' });
    expect(mockDeleteMany).not.toHaveBeenCalled();
  });

  it('should return 400 when ids array is empty', async () => {
    const req = {
      json: async () => ({ ids: [] }),
    } as unknown as NextRequest;

    const response = await DELETE(req);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: 'IDs no proporcionados' });
    expect(mockDeleteMany).not.toHaveBeenCalled();
  });

  it('should delete persons and return 200 on success', async () => {
    mockDeleteMany.mockResolvedValue({ count: 2 });

    const req = {
      json: async () => ({ ids: [1, 2] }),
    } as unknown as NextRequest;

    const response = await DELETE(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ message: 'Personas eliminadas', count: 2 });
    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: [1, 2],
        },
      },
    });
  });

  it('should return 400 on database error', async () => {
    mockDeleteMany.mockRejectedValue(new Error('DB connection failed'));

    const req = {
      json: async () => ({ ids: [1, 2] }),
    } as unknown as NextRequest;

    const response = await DELETE(req);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: 'Error al eliminar personas en lote', details: 'DB connection failed' });
  });
});
