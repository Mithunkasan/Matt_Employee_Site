import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function resolveDatasourceUrl() {
  const url = process.env.DATABASE_URL
  if (!url) return undefined

  // In dev/Turbopack, too many concurrent route workers can saturate Prisma's
  // local pool and cause "Timed out fetching a new connection from the connection pool".
  // Keep the pool small and wait longer; does not change database data.
  if (process.env.NODE_ENV !== 'production') {
    try {
      const parsed = new URL(url)
      if (!parsed.searchParams.has('connection_limit')) {
        parsed.searchParams.set('connection_limit', '5')
      }
      parsed.searchParams.set('pool_timeout', '60')
      return parsed.toString()
    } catch {
      return url
    }
  }

  return url
}

if (!globalForPrisma.prisma) {
  console.log('--- Initializing Prisma Client ---')
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: resolveDatasourceUrl(),
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
