import { GET } from '@/app/api/verificacion/route'
import { prisma } from '@/lib/prisma'
import { generateVerificationCode } from '@/lib/hash'

// Mock NextResponse completely so we don't need real Next.js requests/responses
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body: any, init?: any) => {
      return {
        status: init?.status || 200,
        json: async () => body,
      };
    }),
  },
}))

// Mock prisma and hash functions
jest.mock('@/lib/prisma', () => ({
  prisma: {
    certificateAssignment: {
      findMany: jest.fn(),
    },
    thesis: {
      findMany: jest.fn(),
    },
  },
}))

jest.mock('@/lib/hash', () => ({
  generateVerificationCode: jest.fn(),
}))

describe('GET /api/verificacion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // We can just use standard Request since we aren't testing NextResponse logic
  const makeRequest = (url: string) => {
    return {
      url,
    } as unknown as Request
  }

  it('should return 400 if no code is provided', async () => {
    const request = makeRequest('http://localhost/api/verificacion')
    const response = await GET(request) as any
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json).toEqual({ error: 'Se requiere un código de verificación' })
  })

  it('should return 404 if code is not found in either assignments or theses', async () => {
    // Mock empty results
    ;(prisma.certificateAssignment.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.thesis.findMany as jest.Mock).mockResolvedValue([])

    const request = makeRequest('http://localhost/api/verificacion?code=INVALID_CODE')
    const response = await GET(request) as any
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json).toEqual({ error: 'Código de verificación no válido o certificado no encontrado' })

    // Verify it checked both databases
    expect(prisma.certificateAssignment.findMany).toHaveBeenCalledTimes(1)
    expect(prisma.thesis.findMany).toHaveBeenCalledTimes(1)
  })

  it('should return assignment if found in assignments', async () => {
    const mockDate = new Date('2023-01-01')
    const mockAssignment = {
      id: 1,
      person: { fullName: 'John Doe', identification: '123' },
      certificate: { participationType: 'Attendee', event: { name: 'Event 1' }, issueDate: mockDate },
      participationDetails: 'Details'
    }

    ;(prisma.certificateAssignment.findMany as jest.Mock).mockResolvedValue([mockAssignment])
    ;(prisma.thesis.findMany as jest.Mock).mockResolvedValue([])

    // It should match the code exactly
    ;(generateVerificationCode as jest.Mock).mockReturnValue('VALID_CODE')

    const request = makeRequest('http://localhost/api/verificacion?code=VALID_CODE')
    const response = await GET(request) as any
    const json = await response.json()

    expect(response.status).toBe(200)

    // Check returned assignment, convert date back to string
    expect(json.assignment).toEqual(mockAssignment) // NextResponse mock returns it directly in this case

    expect(prisma.certificateAssignment.findMany).toHaveBeenCalledTimes(1)
    expect(prisma.thesis.findMany).not.toHaveBeenCalled() // Short circuits
  })

  it('should return thesis if found in theses', async () => {
    const mockThesis = {
      id: 1,
      title: 'Thesis Title',
      level: 'Undergraduate',
      programId: '1',
      students: [
        { person: { fullName: 'Jane Doe', identification: '456' } }
      ]
    }

    ;(prisma.certificateAssignment.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.thesis.findMany as jest.Mock).mockResolvedValue([mockThesis])

    ;(generateVerificationCode as jest.Mock).mockReturnValue('VALID_THESIS_CODE')

    const request = makeRequest('http://localhost/api/verificacion?code=VALID_THESIS_CODE')
    const response = await GET(request) as any
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ thesis: mockThesis })

    expect(prisma.certificateAssignment.findMany).toHaveBeenCalledTimes(1)
    expect(prisma.thesis.findMany).toHaveBeenCalledTimes(1)
  })

  it('should properly handle trimming and case insensitivity', async () => {
    const mockThesis = {
      id: 1,
      title: 'Thesis Title',
      level: 'Undergraduate',
      programId: '1',
      students: [
        { person: { fullName: 'Jane Doe', identification: '456' } }
      ]
    }

    ;(prisma.certificateAssignment.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.thesis.findMany as jest.Mock).mockResolvedValue([mockThesis])

    ;(generateVerificationCode as jest.Mock).mockReturnValue('VALID_THESIS_CODE')

    // Pass padded lower case
    const request = makeRequest('http://localhost/api/verificacion?code=  valid_thesis_code  ')
    const response = await GET(request) as any
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ thesis: mockThesis })

    expect(prisma.certificateAssignment.findMany).toHaveBeenCalledTimes(1)
    expect(prisma.thesis.findMany).toHaveBeenCalledTimes(1)
  })

  it('should handle internal server errors gracefully', async () => {
    // Mock an error
    ;(prisma.certificateAssignment.findMany as jest.Mock).mockRejectedValue(new Error('Database failure'))

    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const request = makeRequest('http://localhost/api/verificacion?code=SOME_CODE')
    const response = await GET(request) as any
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json).toEqual({ error: 'Error interno del servidor' })

    consoleSpy.mockRestore()
  })
})
