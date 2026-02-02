import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createAdmin() {
    console.log('👤 Creating admin user...')
    console.log('')

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash('admin123', 12)

        // Create or update admin user
        const admin = await prisma.user.upsert({
            where: { email: 'admin@company.com' },
            update: {
                password: hashedPassword,
                name: 'Admin',
                role: 'ADMIN',
                status: 'ACTIVE',
            },
            create: {
                email: 'admin@company.com',
                name: 'Admin',
                password: hashedPassword,
                role: 'ADMIN',
                status: 'ACTIVE',
                department: 'Management',
            },
        })

        console.log('✅ Admin user created/updated successfully!')
        console.log('')
        console.log('┌─────────────────────────────────────┐')
        console.log('│       ADMIN LOGIN CREDENTIALS       │')
        console.log('├─────────────────────────────────────┤')
        console.log('│ Email:    admin@company.com         │')
        console.log('│ Password: admin123                  │')
        console.log('└─────────────────────────────────────┘')
        console.log('')
        console.log('🔗 Login at: http://localhost:3000/login')
        console.log('')
    } catch (error) {
        console.error('❌ Error creating admin user:', error)
        throw error
    }
}

createAdmin()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
