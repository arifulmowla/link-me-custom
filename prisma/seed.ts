import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.link.upsert({
    where: { code: "demo001" },
    update: {
      targetUrl: "https://example.com/welcome",
      source: "seed",
      isActive: true,
      expiresAt: null,
    },
    create: {
      code: "demo001",
      targetUrl: "https://example.com/welcome",
      source: "seed",
      isActive: true,
    },
  });

  await prisma.link.upsert({
    where: { code: "demo002" },
    update: {
      targetUrl: "https://example.com/pricing",
      source: "seed",
      isActive: true,
      expiresAt: null,
    },
    create: {
      code: "demo002",
      targetUrl: "https://example.com/pricing",
      source: "seed",
      isActive: true,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
