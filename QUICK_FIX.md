# 🚀 Quick Action Guide - Database Connection Lost

## Immediate Fix (Do This First):

### Step 1: Wake Up Your Database
1. Open: **https://console.neon.tech**
2. Find project: **ep-nameless-lab-a16ccpzp**
3. Click on it to wake it up
4. Wait 5-10 seconds until it shows "Active"

### Step 2: Clear Cache & Restart
Run this in PowerShell:
```powershell
cd "d:\company website\project-management"
Remove-Item -Recurse -Force .next
```

Or simply double-click: **RESTART_SERVER.bat**

### Step 3: Verify Connection
```powershell
npx prisma db push
```

---

## ✅ Your App Should Now Work!

---

## 🔄 Prevent Future Issues

### Option 1: Run Keep-Alive Service (While Developing)
Open a new terminal and run:
```powershell
npm run db:keepalive
```

This will ping your database every 4 minutes to keep it awake.

**Keep this running in the background while you work!**

### Option 2: Upgrade to Neon Pro
- No auto-suspend
- Always-on database
- Better for production
- Visit: https://neon.tech/pricing

---

## 📋 Common Commands

| Command | What It Does |
|---------|--------------|
| `npm run dev` | Start development server |
| `npm run db:keepalive` | Keep database awake (run in separate terminal) |
| `npm run db:studio` | Open Prisma Studio |
| `.\RESTART_SERVER.bat` | Restart dev server with cache clear |

---

## 🎯 Recommended Development Setup

**Terminal 1:**
```powershell
npm run dev
```

**Terminal 2:**
```powershell
npm run db:keepalive
```

This way:
- Your app runs in terminal 1
- Your database stays awake via terminal 2
- No more connection errors! 🎉

---

## 📞 Still Having Issues?

1. Check **DATABASE_CONNECTION_FIX.md** for detailed troubleshooting
2. Verify your internet connection
3. Check Neon status: https://neonstatus.com/
4. Contact Neon support if database won't wake up

---

**Last Updated:** 2026-02-02
