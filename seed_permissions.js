const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();

function pluralize(name) {
  const lower = name.toLowerCase();

  // Custom pluralizations to match existing naming
  if (lower === 'faculty') return 'faculties';
  if (lower === 'certificateassignment') return 'assignments';

  if (lower.endsWith('y')) return lower.slice(0, -1) + 'ies';
  if (lower.endsWith('s')) return lower;
  return lower + 's';
}

function getResourceName(modelName) {
  const customNames = {
    'User': 'Usuarios',
    'Role': 'Roles',
    'Faculty': 'Facultades',
    'Program': 'Programas',
    'Event': 'Eventos',
    'Certificate': 'Certificados',
    'Person': 'Personas',
    'CertificateAssignment': 'Asignaciones',
    'Permission': 'Permisos',
    'Setting': 'Configuración'
  };

  return customNames[modelName] || modelName;
}

async function main() {
  console.log("Seeding dynamically generated permissions...");

  const models = Prisma.dmmf.datamodel.models;
  const actions = ['create', 'read', 'update', 'delete'];

  const permissionsToSeed = [];

  for (const model of models) {
    // Skip some internal models if you want, or we can just include them all.
    // We'll include all to be safe and let the master role have everything.
    const resourceId = pluralize(model.name);
    const resourceLabel = getResourceName(model.name);

    for (const action of actions) {
      const actionLabels = {
        'create': 'Crear',
        'read': 'Ver',
        'update': 'Editar',
        'delete': 'Eliminar'
      };

      permissionsToSeed.push({
        name: `${action}_${resourceId}`,
        description: `${actionLabels[action]} ${resourceLabel.toLowerCase()}`
      });
    }
  }

  // Also add any custom extra permissions if needed
  permissionsToSeed.push({
    name: "manage_system",
    description: "Configuración global del sistema"
  });

  // Limpiar permisos antiguos (opcional, pero recomendado si cambiamos el esquema)
  // No los borraremos físicamente para no romper relaciones existentes si no es necesario,
  // pero usaremos upsert.

  console.log(`Found ${permissionsToSeed.length} permissions to seed.`);

  for (const perm of permissionsToSeed) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description },
      create: perm
    });
  }

  // Asignar todos los permisos al rol de Administrador
  const masterRole = await prisma.role.findFirst({ where: { name: "Administrador" } }) || await prisma.role.findFirst();

  if (masterRole) {
    const allPerms = await prisma.permission.findMany();
    await prisma.role.update({
      where: { id: masterRole.id },
      data: { permissions: { set: allPerms.map(p => ({ id: p.id })) } } // Use 'set' to replace all
    });
    console.log(`Assigned all ${allPerms.length} permissions to role: ${masterRole.name}`);
  } else {
    console.log("No roles found to assign permissions. Please create an 'Administrador' role first.");
  }

  console.log("Done seeding permissions.");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
