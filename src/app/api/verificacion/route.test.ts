import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { prisma } from '@/lib/prisma'
import { generateVerificationCode } from '@/lib/hash'

// Mock de hash.ts si es necesario, pero aquí es mejor usar la implementación real
// o podemos pre-calcular los códigos usando la función real para hacer que los mocks
// devuelvan objetos cuyos datos coincidan con lo esperado.

describe('GET /api/verificacion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe devolver 400 si no se proporciona el código', async () => {
    const request = new Request('http://localhost/api/verificacion')
    const response = await GET(request)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json).toEqual({ error: 'Se requiere un código de verificación' })
  })

  it('debe devolver 404 si el código no coincide con ningún certificado o tesis', async () => {
    // Simulamos que la BD devuelve vacío
    vi.mocked(prisma.certificateAssignment.findMany).mockResolvedValue([])
    vi.mocked(prisma.thesis.findMany).mockResolvedValue([])

    const request = new Request('http://localhost/api/verificacion?code=INVALID_CODE')
    const response = await GET(request)
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json).toEqual({ error: 'Código de verificación no válido o certificado no encontrado' })
  })

  it('debe devolver 200 y la asignación si el código coincide con un certificado', async () => {
    // Datos simulados de la base de datos
    const mockAssignmentDate = new Date('2024-01-01T12:00:00Z')

    const mockAssignment = {
      id: 1,
      certificateId: 1,
      personId: 1,
      participationDetails: 'Ponente principal',
      person: {
        fullName: 'Juan Perez',
        identification: '12345678',
      },
      certificate: {
        participationType: 'Ponente',
        issueDate: mockAssignmentDate,
        event: { name: 'Congreso Tech 2024' }
      }
    }

    // Calculamos el código esperado usando la misma lógica
    const expectedCode = generateVerificationCode({
      fullName: mockAssignment.person.fullName,
      identification: mockAssignment.person.identification,
      participationType: mockAssignment.certificate.participationType,
      eventName: mockAssignment.certificate.event.name,
      issueDate: mockAssignment.certificate.issueDate.toISOString(),
      participationDetails: mockAssignment.participationDetails
    })

    vi.mocked(prisma.certificateAssignment.findMany).mockResolvedValue([mockAssignment as any])
    vi.mocked(prisma.thesis.findMany).mockResolvedValue([])

    const request = new Request(`http://localhost/api/verificacion?code=${expectedCode}`)
    const response = await GET(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ assignment: { ...mockAssignment, certificate: { ...mockAssignment.certificate, issueDate: mockAssignmentDate.toISOString() } } })
  })

  it('debe devolver 200 y la tesis si el código coincide con un estudiante de la tesis', async () => {
    vi.mocked(prisma.certificateAssignment.findMany).mockResolvedValue([])

    // Datos simulados de la tesis
    const mockThesis = {
      id: 1,
      title: 'Desarrollo de Software Avanzado',
      level: 'Pregrado',
      programId: 5,
      program: { id: 5, name: 'Ingeniería de Sistemas' },
      students: [
        { person: { fullName: 'Ana Garcia', identification: '98765432' } },
        { person: { fullName: 'Pedro Ramirez', identification: '11223344' } } // Estudiante no buscado
      ],
      advisors: [],
      juries: []
    }

    // Calculamos el código esperado para el primer estudiante
    const expectedCode = generateVerificationCode({
      fullName: mockThesis.students[0].person.fullName,
      identification: mockThesis.students[0].person.identification,
      title: mockThesis.title,
      level: mockThesis.level,
      programId: String(mockThesis.programId)
    })

    vi.mocked(prisma.thesis.findMany).mockResolvedValue([mockThesis as any])

    const request = new Request(`http://localhost/api/verificacion?code=${expectedCode}`)
    const response = await GET(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ thesis: mockThesis })
  })

  it('debe ignorar espacios y diferencias en mayúsculas/minúsculas en el código', async () => {
    const mockAssignmentDate = new Date('2024-01-01T12:00:00Z')

    const mockAssignment = {
      id: 2,
      certificateId: 2,
      personId: 2,
      participationDetails: '',
      person: {
        fullName: 'Maria Lopez',
        identification: '55667788',
      },
      certificate: {
        participationType: 'Asistente',
        issueDate: mockAssignmentDate,
        event: { name: 'Seminario Web' }
      }
    }

    const expectedCode = generateVerificationCode({
      fullName: mockAssignment.person.fullName,
      identification: mockAssignment.person.identification,
      participationType: mockAssignment.certificate.participationType,
      eventName: mockAssignment.certificate.event.name,
      issueDate: mockAssignment.certificate.issueDate.toISOString(),
      participationDetails: mockAssignment.participationDetails
    })

    vi.mocked(prisma.certificateAssignment.findMany).mockResolvedValue([mockAssignment as any])
    vi.mocked(prisma.thesis.findMany).mockResolvedValue([])

    // Pasamos el código con espacios extra y en minúsculas
    const messyCode = `  ${expectedCode.toLowerCase()}  `
    const request = new Request(`http://localhost/api/verificacion?code=${encodeURIComponent(messyCode)}`)
    const response = await GET(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.assignment).toBeDefined()
  })

  it('debe devolver 500 en caso de error interno', async () => {
    // Simulamos un error en la BD
    vi.mocked(prisma.certificateAssignment.findMany).mockRejectedValue(new Error('DB Error'))

    // Ocultar console.error durante este test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const request = new Request('http://localhost/api/verificacion?code=SOME_CODE')
    const response = await GET(request)
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json).toEqual({ error: 'Error interno del servidor' })

    consoleSpy.mockRestore()
  })
})
