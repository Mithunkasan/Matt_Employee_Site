import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

/**
 * Seed a default admin user.
 * Run with: npx ts-node src/scripts/seedAdmin.ts
 */
async function main() {
    const email = 'admin@example.com';
    const plainPassword = 'AdminPass123'; // change as needed
    const hashed = await bcrypt.hash(plainPassword, 10);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        console.log('✅ Admin user already exists');
        return;
    }

    await prisma.user.create({
        data: {
            email,
            password: hashed,
            name: 'Admin User',
            role: 'ADMIN',
            status: 'ACTIVE',
        },
    });

    console.log(`🚀 Admin user created → ${email} / ${plainPassword}`);
}

main()
    .catch((e) => {
        console.error('❌ Seed failed', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
