import { GET } from '../route'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'

// Mock dependencies
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}))

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      status: init?.status || 200,
      json: async () => body,
    })),
  },
}))

describe('GET /api/perfil', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Silence console logs for clean test output
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('handles successful profile retrieval', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: 1, email: 'test@example.com' }
    })
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
    })

    const response = await GET() as any;
    const data = await response.json()

    expect(NextResponse.json).toHaveBeenCalledWith({
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
    })
    expect(response.status).toBe(200)
    expect(data.name).toBe('Test User')
  })

  it('handles server errors during profile retrieval', async () => {
    // Force getServerSession to throw an exception
    const error = new Error('Simulated internal error')
    ;(getServerSession as jest.Mock).mockRejectedValueOnce(error)

    const response = await GET() as any;
    const data = await response.json()

    expect(NextResponse.json).toHaveBeenCalledWith(
        {
            error: "Error interno al cargar el perfil",
            details: "Simulated internal error"
        },
        { status: 500 }
    )
    expect(response.status).toBe(500)
    expect(data).toEqual({
      error: 'Error interno al cargar el perfil',
      details: 'Simulated internal error',
    })
  })

  it('returns 401 when no session exists', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValueOnce(null)

    const response = await GET() as any;

    expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "No autorizado. Inicie sesión nuevamente." },
        { status: 401 }
    )
    expect(response.status).toBe(401)
  })

  it('returns 404 when user is not found in database', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: 999, email: 'notfound@example.com' }
    })
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null)

    const response = await GET() as any;

    expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "No se encontró su información de usuario en la base de datos." },
        { status: 404 }
    )
    expect(response.status).toBe(404)
  })
})
