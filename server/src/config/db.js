import { PrismaClient } from '../../prisma/generated/client.ts';
import { PrismaPg } from "@prisma/adapter-pg";

// Prevent creating a new PrismaClient on every hot-reload in dev,
// which exhausts Postgres connections.
const globalForPrisma = global;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = globalForPrisma.prisma || new PrismaClient({adapter});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
