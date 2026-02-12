# 🔒 PERMANENT ADMIN ACCOUNT CONFIGURATION

## Admin Credentials (PERMANENT - DO NOT CHANGE)

**Email:** `admin@mattengg.com`  
**Password:** `Matt@4321admin`  
**Role:** ADMIN  
**Status:** ACTIVE  
**Department:** Management

---

## 🛡️ Protection Mechanisms

### 1. **Database Seed Script** (`prisma/seed.ts`)
The admin account is automatically created/updated via the seed script:
- Uses `upsert` operation to ensure the account always exists
- Password is always reset to `Matt@4321admin` on re-seeding
- Account details are locked to the specified values

### 2. **Automatic Seeding**
The seed script runs automatically in these scenarios:
- After `npx prisma migrate reset`
- After `npx prisma migrate dev` (when configured)
- Manual execution: `npm run db:seed`

### 3. **Package.json Configuration**
```json
"prisma": {
  "seed": "npx tsx prisma/seed.ts"
}
```

This ensures Prisma automatically runs the seed after database operations.

---

## 📋 Database Commands Reference

### Seed the Database (Create Admin)
```bash
npm run db:seed
```

### Reset Database (Includes Auto-Seeding)
```bash
npx prisma migrate reset
```

### Generate Prisma Client
```bash
npm run db:generate
```

### Run Migrations
```bash
npm run db:migrate
```

### Open Prisma Studio
```bash
npm run db:studio
```

---

## ⚠️ IMPORTANT NOTES

1. **Never Delete the Seed File**: The file `prisma/seed.ts` contains the permanent admin configuration
2. **Password Hash**: The password is hashed using bcrypt with 12 salt rounds
3. **Upsert Logic**: The seed uses `upsert` to either create or update the admin account
4. **Reset Safety**: Even if the database is completely reset, the admin account will be recreated automatically

---

## 🔧 How It Works

### Seed Script Logic (`prisma/seed.ts`)
```typescript
const adminPassword = await bcrypt.hash('Matt@4321admin', 12)
const admin = await prisma.user.upsert({
    where: { email: 'admin@mattengg.com' },
    update: {
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
```

### What This Means:
- If admin account exists → Updates password and details
- If admin account doesn't exist → Creates new account
- **Result:** Admin account is ALWAYS available with correct credentials

---

## 🎯 Quick Access

### Login URL
```
http://localhost:3000/login
```

### Credentials
```
Email: admin@mattengg.com
Password: Matt@4321admin
```

---

## 📝 Maintenance

### If Admin Account Gets Locked/Modified
Simply run:
```bash
npm run db:seed
```

This will reset the admin account to the correct credentials.

### After Database Reset
The admin account is automatically recreated. No manual action needed.

---

## ✅ Verification

To verify the admin account exists:
1. Run `npm run db:studio`
2. Open Prisma Studio in your browser
3. Navigate to the `User` model
4. Look for `admin@mattengg.com`

---

**Last Updated:** 2026-02-10  
**Maintained By:** System Configuration  
**Status:** ✅ ACTIVE & PROTECTED
