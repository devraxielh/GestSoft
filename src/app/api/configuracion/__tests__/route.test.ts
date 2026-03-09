import { POST, GET } from '../route'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    setting: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}))

describe('/api/configuracion', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  describe('GET', () => {
    it('should return existing configuration', async () => {
      const mockConfig = { id: 1, companyName: 'Test Company' }
      ;(prisma.setting.findUnique as jest.Mock).mockResolvedValue(mockConfig)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockConfig)
      expect(prisma.setting.findUnique).toHaveBeenCalledWith({ where: { id: 1 } })
    })

    it('should create default configuration if it does not exist', async () => {
      const mockDefaultConfig = { id: 1, companyName: 'GestSoft', logoUrl: '/logo.webp' }
      ;(prisma.setting.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.setting.create as jest.Mock).mockResolvedValue(mockDefaultConfig)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockDefaultConfig)
      expect(prisma.setting.create).toHaveBeenCalledWith({
        data: { id: 1, companyName: 'GestSoft', logoUrl: '/logo.webp' }
      })
    })

    it('should handle errors in GET', async () => {
      ;(prisma.setting.findUnique as jest.Mock).mockRejectedValue(new Error('DB Error'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: "Error al obtener la configuración" })
    })
  })

  describe('POST', () => {
    it('should successfully update configuration', async () => {
      const mockBody = {
        companyName: 'Test Company',
        primaryColor: '#000000',
      }

      const mockRequest = {
        json: jest.fn().mockResolvedValue(mockBody),
      } as unknown as Request

      const mockResponse = {
        id: 1,
        ...mockBody,
      }

      ;(prisma.setting.upsert as jest.Mock).mockResolvedValue(mockResponse)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockResponse)
      expect(prisma.setting.upsert).toHaveBeenCalledWith({
        where: { id: 1 },
        update: expect.objectContaining({
          companyName: mockBody.companyName,
          primaryColor: mockBody.primaryColor,
        }),
        create: expect.objectContaining({
          companyName: mockBody.companyName,
          primaryColor: mockBody.primaryColor,
        }),
      })
    })

    it('should successfully update configuration with missing values resulting in defaults', async () => {
      const mockBody = {}

      const mockRequest = {
        json: jest.fn().mockResolvedValue(mockBody),
      } as unknown as Request

      const mockResponse = {
        id: 1,
        companyName: 'GestSoft',
        logoUrl: '/logo.webp',
      }

      ;(prisma.setting.upsert as jest.Mock).mockResolvedValue(mockResponse)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockResponse)
      expect(prisma.setting.upsert).toHaveBeenCalledWith({
        where: { id: 1 },
        update: expect.objectContaining({
          companyName: undefined,
          primaryColor: undefined,
        }),
        create: expect.objectContaining({
          companyName: 'GestSoft',
          logoUrl: '/logo.webp',
        }),
      })
    })

    it('should handle errors in POST with message', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({}),
      } as unknown as Request

      ;(prisma.setting.upsert as jest.Mock).mockRejectedValue(new Error('DB Error'))

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: "Error al guardar la configuración",
        details: "DB Error"
      })
    })

    it('should handle errors in POST without message (fallback to String)', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({}),
      } as unknown as Request

      ;(prisma.setting.upsert as jest.Mock).mockRejectedValue('String Error')

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: "Error al guardar la configuración",
        details: "String Error"
      })
    })
  })
})
