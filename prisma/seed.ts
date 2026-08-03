import { PrismaClient } from "@prisma/client";
import { seedDemo } from "../src/lib/seed-core";

const prisma = new PrismaClient();

seedDemo(prisma)
  .then(() => {
    console.log("Seed de demonstração concluído ✔");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
