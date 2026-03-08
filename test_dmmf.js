const { Prisma } = require('@prisma/client');
console.log(Prisma.dmmf.datamodel.models.map(m => m.name));
