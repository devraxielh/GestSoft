const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log("Wiping old permissions...")
    await prisma.permission.deleteMany({})

    const entities = [
        { key: 'user', label: 'Usuarios' },
        { key: 'role', label: 'Roles' },
        { key: 'faculty', label: 'Facultades' },
        { key: 'program', label: 'Programas' },
        { key: 'event', label: 'Eventos' },
        { key: 'certificate', label: 'Certificados' },
        { key: 'person', label: 'Personas' },
        { key: 'assignment', label: 'Asignaciones' }
    ]

    const actions = [
        { action: 'create', label: 'Crear' },
        { action: 'read', label: 'Ver' },
        { action: 'update', label: 'Editar' },
        { action: 'delete', label: 'Eliminar' }
    ]

    const permissionsToCreate = []
    
    entities.forEach(entity => {
        actions.forEach(action => {
            permissionsToCreate.push({
                name: `${action.action}_${entity.key}`,
                description: `${action.label} ${entity.label}`
            })
        })
    })

    console.log("Seeding new action-based permissions...")
    await prisma.permission.createMany({
        data: permissionsToCreate
    })

    const allPerms = await prisma.permission.findMany()
    const adminRole = await prisma.role.findFirst({ where: { name: 'Administrador' } })
    
    if (adminRole) {
        console.log("Assigning all permissions to Administrador...")
        await prisma.role.update({
            where: { id: adminRole.id },
            data: {
                permissions: {
                    set: allPerms.map(p => ({ id: p.id }))
                }
            }
        })
    }

    console.log("✅ Seed completed")
}

main().catch(console.error).finally(() => prisma.$disconnect())
