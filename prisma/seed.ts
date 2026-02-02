import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding database...')

    // Create Admin user - PROTECTED ADMIN ACCOUNT
    // Email: admin@mattengg.com | Password: Matt@4321admin
    // This admin account can only be modified by the admin themselves
    const adminPassword = await bcrypt.hash('Matt@4321admin', 12)
    const admin = await prisma.user.upsert({
        where: { email: 'admin@mattengg.com' },
        update: {
            // Ensure password is always set to the correct value on re-seeding
            password: adminPassword,
            name: 'System Admin',
            role: 'ADMIN',
            status: 'ACTIVE',
            department: 'Management',
        },
        create: {
            email: 'admin@mattengg.com',
            name: 'System Admin',
            password: adminPassword,
            role: 'ADMIN',
            status: 'ACTIVE',
            department: 'Management',
        },
    })
    console.log(`✅ Created Admin: ${admin.email}`)

    console.log('')
    console.log('🎉 Seeding completed!')
    console.log('')
    console.log('📋 Admin Account:')
    console.log('═════════════════════════════════════════════════════════')
    console.log('🔒 ADMIN:    admin@mattengg.com / Matt@4321admin')
    console.log('═════════════════════════════════════════════════════════')
    console.log('')
    console.log('ℹ️  All mock/demo data has been removed from seeding.')
    console.log('   Only the admin account will be created.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
