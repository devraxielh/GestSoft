import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
import { prisma } from '@/lib/prisma'
import { sendThesisNotification } from '@/lib/mailer'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    thesis: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/mailer', () => ({
  sendThesisNotification: vi.fn(),
}))

function createMockRequest(body: any) {
  return new NextRequest('http://localhost:3000/api/trabajos-grado/send-email', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/trabajos-grado/send-email', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
  })

  it('returns 400 if thesisIds is missing', async () => {
    const req = createMockRequest({})
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('No se proporcionaron trabajos de grado')
  })

  it('returns 400 if thesisIds is not an array', async () => {
    const req = createMockRequest({ thesisIds: '123' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('No se proporcionaron trabajos de grado')
  })

  it('returns 400 if thesisIds is an empty array', async () => {
    const req = createMockRequest({ thesisIds: [] })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('No se proporcionaron trabajos de grado')
  })

  it('returns 404 if no theses are found in DB', async () => {
    vi.mocked(prisma.thesis.findMany).mockResolvedValueOnce([])

    const req = createMockRequest({ thesisIds: [1] })
    const res = await POST(req)
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe('No se encontraron trabajos de grado')
  })

  it('returns 400 if theses are found but no students have valid emails', async () => {
    vi.mocked(prisma.thesis.findMany).mockResolvedValueOnce([
      {
        id: 1,
        title: 'Thesis 1',
        students: [
          {
            person: {
              email: null,
              fullName: 'Student 1',
            },
          },
        ],
      } as any,
    ])

    const req = createMockRequest({ thesisIds: [1] })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('No hay estudiantes con correo electrónico válido vinculados a estos trabajos')
  })

  it('sends emails successfully in batches', async () => {
    const students = Array.from({ length: 6 }).map((_, i) => ({
      person: { email: `student${i}@test.com`, fullName: `Student ${i}` },
    }))

    vi.mocked(prisma.thesis.findMany).mockResolvedValueOnce([
      {
        id: 1,
        title: 'Thesis 1',
        students,
      } as any,
    ])

    vi.mocked(sendThesisNotification).mockResolvedValue(undefined as never)

    const req = createMockRequest({ thesisIds: [1] })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.sent).toBe(6)
    expect(json.failed).toBe(0)
    expect(json.total).toBe(6)

    expect(sendThesisNotification).toHaveBeenCalledTimes(6)
    expect(sendThesisNotification).toHaveBeenCalledWith(
      'student0@test.com',
      'Student 0',
      'Thesis 1',
      'http://localhost:3000/consulta'
    )
  })

  it('handles partial failures and returns errors', async () => {
    vi.mocked(prisma.thesis.findMany).mockResolvedValueOnce([
      {
        id: 1,
        title: 'Thesis 1',
        students: [
          { person: { email: 'success@test.com', fullName: 'Success Student' } },
          { person: { email: 'fail@test.com', fullName: 'Fail Student' } },
        ],
      } as any,
    ])

    vi.mocked(sendThesisNotification).mockImplementation(async (email) => {
      if (email === 'fail@test.com') {
        throw new Error('SMTP Error')
      }
    })

    const req = createMockRequest({ thesisIds: [1] })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.sent).toBe(1)
    expect(json.failed).toBe(1)
    expect(json.total).toBe(2)
    expect(json.errors).toEqual(['SMTP Error'])
  })

  it('returns 500 if DB query throws an error', async () => {
    vi.mocked(prisma.thesis.findMany).mockRejectedValueOnce(new Error('DB Error'))

    const req = createMockRequest({ thesisIds: [1] })
    const res = await POST(req)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toContain('Error al enviar correos: DB Error')
  })
})
