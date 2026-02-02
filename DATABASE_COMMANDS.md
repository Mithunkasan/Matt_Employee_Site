# Database Management Commands

## 🗑️ Clear All Data

To remove all mock/demo data from the database:

```bash
npm run db:clear
```

This command will:
- ✅ Delete all notifications
- ✅ Delete all leave requests
- ✅ Delete all daily reports
- ✅ Delete all attendance records
- ✅ Delete all projects
- ✅ Delete all users

**Note**: This removes ALL data including any data you've added after seeding.

---

## 🌱 Seed Demo Data

To add demo/test data to the database:

```bash
npm run db:seed
```

This will create:
- 1 Admin user
- 1 HR user
- 1 PA user
- 3 Employee users
- 3 Sample projects
- Sample attendance records
- Sample daily reports

**Demo Accounts Created:**
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.com | admin123 |
| HR | hr@demo.com | hr123456 |
| PA | pa@demo.com | pa123456 |
| Employee | john@demo.com | emp123456 |
| Employee | emily@demo.com | emp123456 |
| Employee | alex@demo.com | emp123456 |

---

## 🔄 Reset Database (Clear + Fresh Migrations)

To completely reset the database and apply all migrations:

```bash
npx prisma migrate reset
```

This will:
1. Drop the database
2. Recreate the database
3. Apply all migrations
4. Optionally run seed (you'll be prompted)

---

## 📊 View Database (GUI)

To open Prisma Studio and view/edit data:

```bash
npm run db:studio
```

This opens a web interface at http://localhost:5555 where you can:
- View all tables
- Add/edit/delete records manually
- See relationships between data

---

## 🔧 Other Useful Commands

### Generate Prisma Client
```bash
npm run db:generate
```

### Push Schema Changes (without migration)
```bash
npm run db:push
```

### Create New Migration
```bash
npm run db:migrate
```

---

## 📝 Common Workflows

### Starting Fresh
```bash
# Clear all data
npm run db:clear

# Add demo data
npm run db:seed
```

### Complete Database Reset
```bash
# Reset and recreate everything
npx prisma migrate reset

# Optional: Add demo data
npm run db:seed
```

### After Schema Changes
```bash
# Create migration
npm run db:migrate

# Generate Prisma Client
npm run db:generate
```

---

## ⚠️ Important Notes

1. **Clear vs Reset**:
   - `npm run db:clear` - Only deletes data, keeps schema
   - `npx prisma migrate reset` - Drops entire database and recreates it

2. **Production Warning**:
   - Never run these commands on production databases
   - Always backup before clearing data

3. **After Clearing**:
   - You won't be able to log in (no users exist)
   - Run `npm run db:seed` to create demo accounts

4. **Development Server**:
   - You can clear/seed data while dev server is running
   - No need to restart the server

---

## 🎯 Quick Reference

| Task | Command |
|------|---------|
| Clear all data | `npm run db:clear` |
| Add demo data | `npm run db:seed` |
| View database | `npm run db:studio` |
| Reset completely | `npx prisma migrate reset` |
| Generate client | `npm run db:generate` |
| Create migration | `npm run db:migrate` |

---

## 🔍 Troubleshooting

### "Cannot delete because of foreign key constraints"
Use `npm run db:clear` instead of deleting tables manually - it respects the correct deletion order.

### "Database is empty after clearing"
This is expected. Run `npm run db:seed` to add demo data.

### "Can't connect to database"
Check your `.env` file has the correct `DATABASE_URL`.

### "Migration failed"
Try `npx prisma migrate reset` to start fresh.
