import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

let prisma: PrismaClient | null = null;

export async function getPrismaClient(): Promise<PrismaClient> {
  if (prisma) return prisma;

  const connectionString = process.env.POSTGRES_URI;
  if (!connectionString) {
    throw new Error('POSTGRES_URI environment variable is not set');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter } as any);
  return prisma;
}

export { prisma };