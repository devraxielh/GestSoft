import { PUT, DELETE } from './route';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    thesisStudent: { deleteMany: jest.fn() },
    thesisAdvisor: { deleteMany: jest.fn() },
    thesisJury: { deleteMany: jest.fn() },
    thesis: { update: jest.fn(), delete: jest.fn() },
  },
}));

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => ({ data, options })),
  },
}));

describe('Trabajos de Grado [id] API Route', () => {
  const mockSession = { user: { id: '1', email: 'test@example.com' } };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PUT', () => {
    it('returns 401 if no session exists', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      const req = new Request('http://localhost', { method: 'PUT', body: JSON.stringify({}) });
      const params = Promise.resolve({ id: '1' });

      const response = await PUT(req, { params });

      expect(response).toEqual({
        data: { error: 'No autorizado' },
        options: { status: 401 },
      });
    });

    it('updates a thesis successfully', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(mockSession);
      const requestBody = {
        title: 'New Title',
        level: 'Undergraduate',
        defenseDate: '2023-01-01',
        grade: '4.5',
        status: 'Approved',
        programId: '2',
        studentIds: ['10', '11'],
        advisorIds: ['20'],
        juryIds: ['30', '31'],
      };
      const req = new Request('http://localhost', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      });
      const params = Promise.resolve({ id: '1' });

      const mockUpdatedThesis = { id: 1, title: 'New Title' };
      (prisma.thesis.update as jest.Mock).mockResolvedValueOnce(mockUpdatedThesis);

      const response = await PUT(req, { params });

      expect(prisma.thesisStudent.deleteMany).toHaveBeenCalledWith({ where: { thesisId: 1 } });
      expect(prisma.thesisAdvisor.deleteMany).toHaveBeenCalledWith({ where: { thesisId: 1 } });
      expect(prisma.thesisJury.deleteMany).toHaveBeenCalledWith({ where: { thesisId: 1 } });

      expect(prisma.thesis.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          title: 'New Title',
          level: 'Undergraduate',
          defenseDate: new Date('2023-01-01'),
          grade: 4.5,
          status: 'Approved',
          programId: 2,
          students: { create: [{ personId: 10 }, { personId: 11 }] },
          advisors: { create: [{ personId: 20, roleType: 'Principal' }] },
          juries: { create: [{ personId: 30 }, { personId: 31 }] },
        },
        include: {
          program: true,
          students: { include: { person: true } },
          advisors: { include: { person: true } },
          juries: { include: { person: true } },
        },
      });

      expect(response).toEqual({ data: mockUpdatedThesis, options: undefined });
    });

    it('handles empty string for grade gracefully', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(mockSession);
      const requestBody = {
        title: 'New Title',
        grade: '',
      };
      const req = new Request('http://localhost', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      });
      const params = Promise.resolve({ id: '1' });

      await PUT(req, { params });

      expect(prisma.thesis.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            grade: null,
          }),
        })
      );
    });

    it('returns 500 on internal error', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(mockSession);
      const req = new Request('http://localhost', { method: 'PUT', body: JSON.stringify({}) });
      const params = Promise.resolve({ id: '1' });

      (prisma.thesisStudent.deleteMany as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      const response = await PUT(req, { params });

      expect(response).toEqual({
        data: { error: 'Error interno al actualizar', details: 'DB Error' },
        options: { status: 500 },
      });
    });
  });

  describe('DELETE', () => {
    it('returns 401 if no session exists', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      const req = new Request('http://localhost', { method: 'DELETE' });
      const params = Promise.resolve({ id: '1' });

      const response = await DELETE(req, { params });

      expect(response).toEqual({
        data: { error: 'No autorizado' },
        options: { status: 401 },
      });
    });

    it('deletes a thesis successfully', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(mockSession);
      const req = new Request('http://localhost', { method: 'DELETE' });
      const params = Promise.resolve({ id: '1' });

      const response = await DELETE(req, { params });

      expect(prisma.thesisStudent.deleteMany).toHaveBeenCalledWith({ where: { thesisId: 1 } });
      expect(prisma.thesisAdvisor.deleteMany).toHaveBeenCalledWith({ where: { thesisId: 1 } });
      expect(prisma.thesisJury.deleteMany).toHaveBeenCalledWith({ where: { thesisId: 1 } });
      expect(prisma.thesis.delete).toHaveBeenCalledWith({ where: { id: 1 } });

      expect(response).toEqual({
        data: { success: true },
        options: undefined,
      });
    });

    it('returns 500 on internal error', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(mockSession);
      const req = new Request('http://localhost', { method: 'DELETE' });
      const params = Promise.resolve({ id: '1' });

      (prisma.thesis.delete as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      const response = await DELETE(req, { params });

      expect(response).toEqual({
        data: { error: 'Error al eliminar el trabajo de grado' },
        options: { status: 500 },
      });
    });
  });
});
