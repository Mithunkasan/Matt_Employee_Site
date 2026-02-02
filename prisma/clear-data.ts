import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🗑️  Clearing all data from database...')
    console.log('')

    try {
        // Delete in correct order due to foreign key constraints
        console.log('Deleting notifications...')
        await prisma.notification.deleteMany({})

        console.log('Deleting leave requests...')
        await prisma.leaveRequest.deleteMany({})

        console.log('Deleting daily reports...')
        await prisma.dailyReport.deleteMany({})

        console.log('Deleting attendance sessions...')
        await prisma.attendanceSession.deleteMany({})

        console.log('Deleting attendance records...')
        await prisma.attendance.deleteMany({})

        console.log('Deleting projects...')
        await prisma.project.deleteMany({})

        console.log('Deleting all users (including demo accounts)...')
        await prisma.user.deleteMany({
            where: {
                NOT: {
                    email: 'admin@mattengg.com' // Keep only the admin
                }
            }
        })

        console.log('')
        console.log('✅ All mock data has been deleted!')
        console.log('')
        console.log('📋 Remaining Account:')
        console.log('═════════════════════════════════════════════════════════')
        console.log('🔒 ADMIN: admin@mattengg.com / Matt@4321admin')
        console.log('═════════════════════════════════════════════════════════')
        console.log('')
        console.log('ℹ️  Your database is now clean with only the admin account.')

    } catch (error) {
        console.error('❌ Error clearing data:', error)
        throw error
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
