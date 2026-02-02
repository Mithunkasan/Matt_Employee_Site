# 🔧 Database Connection Error - Fix Guide

## ❌ Error:
```
Can't reach database server at `ep-nameless-lab-a16ccpzp-pooler.ap-southeast-1.aws.neon.tech:5432`
```

## 🎯 Most Likely Cause:
Your **Neon database has auto-suspended** due to inactivity. Neon free tier databases automatically pause after ~5 minutes of no activity.

---

## ✅ Solution Steps:

### **Step 1: Wake Up Your Database**

1. **Open Neon Console:**
   - Go to: https://console.neon.tech
   - Log in with your account

2. **Find Your Project:**
   - Look for project: `ep-nameless-lab-a16ccpzp`
   - You should see a status indicator

3. **Activate the Database:**
   - If it shows "Suspended" or "Inactive", click on it
   - The database will wake up automatically (takes 2-10 seconds)
   - Wait until it shows "Active" or "Running"

### **Step 2: Test the Connection**

Once the database is active, test it:

```powershell
# Navigate to your project
cd "d:\company website\project-management"

# Test the connection
npx prisma db push
```

If this succeeds, your database is connected!

### **Step 3: Restart Your Dev Server**

After confirming the connection works:

**Option A: Use the restart script**
```powershell
.\RESTART_SERVER.bat
```

**Option B: Manual restart**
1. Press `Ctrl+C` in the terminal running `npm run dev`
2. Run: 
   ```powershell
   Remove-Item -Recurse -Force .next
   npm run dev
   ```

---

## 🚀 Alternative: Keep Database Always Active

To prevent auto-suspension on Neon free tier:

### **Option 1: Upgrade to Paid Plan** (Recommended for Production)
- Neon Pro plan keeps databases active 24/7
- No more auto-suspend issues

### **Option 2: Use a Keep-Alive Script** (Free Tier Workaround)
Create a simple ping script that queries the database every 4 minutes:

```javascript
// scripts/keep-db-alive.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function keepAlive() {
    try {
        await prisma.user.count()
        console.log('✅ Database pinged:', new Date().toLocaleTimeString())
    } catch (error) {
        console.error('❌ Database ping failed:', error.message)
    }
}

// Ping every 4 minutes
setInterval(keepAlive, 4 * 60 * 1000)
keepAlive() // Initial ping

console.log('🏓 Database keep-alive started (pinging every 4 minutes)')
```

Run it alongside your dev server:
```powershell
node scripts/keep-db-alive.js
```

---

## 📊 Quick Diagnostics:

### Check if it's a Neon issue:
1. Go to https://neonstatus.com/
2. Check if there are any ongoing incidents

### Check your connection string:
Your current DATABASE_URL should match:
```
postgresql://neondb_owner:npg_wSUKT9M0LzQO@ep-nameless-lab-a16ccpzp-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

---

## 🆘 Still Having Issues?

### Try these in order:

1. **Check Internet Connection:**
   - Make sure you have stable internet
   - Try accessing other websites

2. **Verify Neon Project:**
   - Log into Neon console
   - Check if the project still exists
   - Verify the connection string hasn't changed

3. **Create New Connection:**
   - In Neon console, go to your project
   - Navigate to "Connection Details"
   - Copy the connection string again
   - Replace in your `.env` file

4. **Contact Neon Support:**
   - If the database won't wake up
   - Go to Neon support: https://neon.tech/docs/introduction/support

---

## 💡 Prevention:

To avoid this in the future:

- **Development:** The database will suspend - just wake it up when needed
- **Production:** Use Neon Pro plan or another always-on database
- **Keep-Alive:** Run the keep-alive script during active development

---

**Generated:** 2026-02-02  
**Your Database:** ep-nameless-lab-a16ccpzp
