const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const permissions = [
    { name: "manage_users", description: "Ver, crear, editar y eliminar usuarios" },
    { name: "manage_roles", description: "Ver, crear, editar y eliminar roles" },
    { name: "manage_faculties", description: "Ver, crear, editar y eliminar facultades" },
    { name: "manage_programs", description: "Ver, crear, editar y eliminar programas" },
    { name: "manage_events", description: "Ver, crear, editar y eliminar eventos" },
    { name: "manage_certificates", description: "Generar y descargar certificados" },
    { name: "manage_persons", description: "Ver, crear, editar y eliminar personas" }
  ];

  console.log("Seeding permissions...");
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm
    });
  }

  // Asignar todos los permisos al rol de Super Admin / Master
  const masterRole = await prisma.role.findFirst({ where: { name: "admin" } }) || await prisma.role.findFirst();
  if (masterRole) {
     const allPerms = await prisma.permission.findMany();
     await prisma.role.update({
       where: { id: masterRole.id },
       data: { permissions: { connect: allPerms.map(p => ({ id: p.id })) } }
     });
     console.log(`Assigned all permissions to role: ${masterRole.name}`);
  }

  console.log("Done seeding permissions.");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
