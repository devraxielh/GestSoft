import { GET } from '../route';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';

// Mock next-auth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

describe('GET /api/perfil', () => {
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  beforeAll(() => {
    // Silence console logs during tests
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería retornar 401 si no hay sesión', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('No autorizado. Inicie sesión nuevamente.');
  });

  it('debería retornar 401 si no hay usuario en la sesión', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: null,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('No autorizado. Inicie sesión nuevamente.');
  });

  it('debería buscar usuario por ID si está presente y retornar los datos', async () => {
    const mockSession = {
      user: {
        id: '1',
        email: 'test@example.com',
      },
    };
    (getServerSession as jest.Mock).mockResolvedValueOnce(mockSession);

    const mockUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      image: null,
      role: { name: 'admin' },
    };
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser);

    const response = await GET();
    const data = await response.json();

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: { select: { name: true } },
      },
    });
    expect(response.status).toBe(200);
    expect(data).toEqual(mockUser);
  });

  it('debería buscar usuario por email si ID no está o es inválido', async () => {
    const mockSession = {
      user: {
        id: 'invalid-id',
        email: 'test@example.com',
      },
    };
    (getServerSession as jest.Mock).mockResolvedValueOnce(mockSession);

    const mockUser = {
      id: 2,
      name: 'Test User 2',
      email: 'test@example.com',
      image: null,
      role: { name: 'user' },
    };
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser);

    const response = await GET();
    const data = await response.json();

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: { select: { name: true } },
      },
    });
    expect(response.status).toBe(200);
    expect(data).toEqual(mockUser);
  });

  it('debería retornar 404 si el usuario no se encuentra en la base de datos', async () => {
    const mockSession = {
      user: {
        id: '1',
        email: 'test@example.com',
      },
    };
    (getServerSession as jest.Mock).mockResolvedValueOnce(mockSession);
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('No se encontró su información de usuario en la base de datos.');
  });

  it('debería retornar 500 en caso de error interno', async () => {
    const mockSession = {
      user: {
        id: '1',
        email: 'test@example.com',
      },
    };
    (getServerSession as jest.Mock).mockResolvedValueOnce(mockSession);
    (prisma.user.findUnique as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Error interno al cargar el perfil');
    expect(data.details).toBe('Database error');
  });
});
