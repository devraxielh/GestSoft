jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));

import { authOptions } from './auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

describe('authOptions.authorize', () => {
    let authorize: any;

    beforeAll(() => {
        // Find the Credentials provider and get its authorize function
        const provider = authOptions.providers.find((p: any) => p.name === 'Credentials') as any;

        // In next-auth, provider options might be wrapped.
        // If provider is the result of CredentialsProvider(), it should have the authorize method in its options.
        // Actually next-auth CredentialsProvider returns an object. Let's inspect it in the first test.
        // It might be under provider.options.authorize or provider.authorize depending on next-auth version
        authorize = provider.options?.authorize || provider.authorize;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return null if email or password are not provided', async () => {
        expect(await authorize({ email: 'test@example.com' })).toBeNull();
        expect(await authorize({ password: 'password123' })).toBeNull();
        expect(await authorize({})).toBeNull();
        expect(await authorize(undefined)).toBeNull();
    });

    it('should return null if user is not found', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

        const result = await authorize({ email: 'notfound@example.com', password: 'password123' }, null);

        expect(result).toBeNull();
        expect(prisma.user.findUnique).toHaveBeenCalledWith({
            where: { email: 'notfound@example.com' },
            include: { roles: { include: { permissions: true } } }
        });
    });

    it('should return null if user is found but not active', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({ active: false });

        const result = await authorize({ email: 'inactive@example.com', password: 'password123' }, null);

        expect(result).toBeNull();
        expect(prisma.user.findUnique).toHaveBeenCalled();
        expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null if password is invalid', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 1,
            email: 'test@example.com',
            password: 'hashedpassword',
            active: true,
            name: 'Test User',
            roles: []
        });
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        const result = await authorize({ email: 'test@example.com', password: 'wrongpassword' }, null);

        expect(result).toBeNull();
        expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashedpassword');
    });

    it('should return formatted user object if authentication succeeds', async () => {
        const mockUser = {
            id: 1,
            email: 'test@example.com',
            name: 'Test User',
            image: 'profile.jpg',
            password: 'hashedpassword',
            active: true,
            roles: [
                {
                    name: 'Admin',
                    permissions: [{ name: 'read' }, { name: 'write' }]
                },
                {
                    name: 'User',
                    permissions: [{ name: 'read' }]
                }
            ]
        };

        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        const result = await authorize({ email: 'test@example.com', password: 'password123' }, null);

        expect(result).toEqual({
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            role: 'Admin, User',
            permissions: ['read', 'write'], // duplicates should be removed
            image: 'profile.jpg'
        });
        expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword');
    });
});
