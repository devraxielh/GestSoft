import { GET, POST } from './route'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    setting: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
  },
}))

describe('Configuracion API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return existing config if it exists', async () => {
      const mockConfig = { id: 1, companyName: 'Test Company' }
      ;(prisma.setting.findUnique as jest.Mock).mockResolvedValue(mockConfig)

      const response = await GET()
      // Use standard Response methods since NextResponse extends Response
      const data = await response.json()

      expect(prisma.setting.findUnique).toHaveBeenCalledWith({
        where: { id: 1 }
      })
      expect(prisma.setting.create).not.toHaveBeenCalled()
      expect(response.status).toBe(200)
      expect(data).toEqual(mockConfig)
    })

    it('should create default config if it does not exist', async () => {
      ;(prisma.setting.findUnique as jest.Mock).mockResolvedValue(null)
      const mockCreatedConfig = { id: 1, companyName: 'GestSoft', logoUrl: '/logo.webp' }
      ;(prisma.setting.create as jest.Mock).mockResolvedValue(mockCreatedConfig)

      const response = await GET()
      const data = await response.json()

      expect(prisma.setting.findUnique).toHaveBeenCalledWith({
        where: { id: 1 }
      })
      expect(prisma.setting.create).toHaveBeenCalledWith({
        data: {
          id: 1,
          companyName: 'GestSoft',
          logoUrl: '/logo.webp'
        }
      })
      expect(response.status).toBe(200)
      expect(data).toEqual(mockCreatedConfig)
    })

    it('should return 500 on error', async () => {
      ;(prisma.setting.findUnique as jest.Mock).mockRejectedValue(new Error('DB Error'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Error al obtener la configuración' })
    })
  })
})
