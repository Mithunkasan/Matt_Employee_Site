const { PrismaClient } = require('@prisma/client')
require('dotenv').config()
const prisma = new PrismaClient()

async function test() {
    try {
        console.log('Connecting to:', process.env.DATABASE_URL.replace(/:[^:]+@/, ':****@'))
        const count = await prisma.user.count()
        console.log('Success! User count:', count)
        process.exit(0)
    } catch (err) {
        console.error('Connection failed!')
        console.error(err)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

test()
