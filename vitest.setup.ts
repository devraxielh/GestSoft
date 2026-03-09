import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '',
}))

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: null,
    status: 'unauthenticated',
  }),
}))

// Create mock Prisma Client
vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      certificateAssignment: {
        findMany: vi.fn(),
      },
      thesis: {
        findMany: vi.fn(),
      },
    },
  }
})
