import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    // Create roles
    const adminRole = await prisma.role.upsert({
        where: { name: 'Administrador' },
        update: {},
        create: { name: 'Administrador' },
    })

    await prisma.role.upsert({
        where: { name: 'Usuario' },
        update: {},
        create: { name: 'Usuario' },
    })

    // Create faculties
    await prisma.faculty.upsert({
        where: { name: 'Sin facultad' },
        update: {},
        create: { name: 'Sin facultad' },
    })

    await prisma.faculty.upsert({
        where: { name: 'Ingeniería' },
        update: {},
        create: { name: 'Ingeniería' },
    })

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10)
    await prisma.user.upsert({
        where: { email: 'admin@admin.com' },
        update: {},
        create: {
            email: 'admin@admin.com',
            name: 'Administrador',
            password: hashedPassword,
            roles: {
                connect: [{ id: adminRole.id }]
            },
            active: true,
        },
    })

    console.log('✅ Seed data created successfully')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
