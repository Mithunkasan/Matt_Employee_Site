const { PrismaClient } = require('@prisma/client')
require('dotenv').config()
const prisma = new PrismaClient()

async function keepAlive() {
    try {
        await prisma.user.count()
        console.log('✅ Database pinged successfully:', new Date().toLocaleTimeString())
    } catch (error) {
        console.error('❌ Database ping failed:', error.message)
    }
}

// Ping every 4 minutes (240000 ms)
// Neon suspends after ~5 minutes, so this keeps it active
const PING_INTERVAL = 4 * 60 * 1000

setInterval(keepAlive, PING_INTERVAL)
keepAlive() // Initial ping

console.log('🏓 Database keep-alive service started')
console.log(`   Pinging database every ${PING_INTERVAL / 60000} minutes`)
console.log('   Press Ctrl+C to stop')
console.log('')
