# Quick Start Guide: Working Hours Tracking

## Prerequisites
⚠️ **Important**: You need Node.js version 20.9.0 or higher
- Current version: 16.20.2
- Upgrade Node.js before running the application

## Installation Steps

### 1. Upgrade Node.js (Required)
Download and install Node.js 20.9.0+ from: https://nodejs.org/

Verify installation:
```bash
node --version
# Should show v20.9.0 or higher
```

### 2. Install Dependencies (if not already done)
```bash
npm install
```

### 3. Database Migration (Already Completed)
The migration has been applied. If you need to run it again:
```bash
npx prisma migrate dev
```

### 4. Generate Prisma Client
```bash
npx prisma generate
```

### 5. Start Development Server
```bash
npm run dev
```

The app will be available at http://localhost:3000

## Testing the Feature

### As an Employee:

1. **Login to the website**
   - Navigate to `/login`
   - Enter your credentials
   - ✅ Attendance record is automatically created with checkIn time

2. **View Your Attendance**
   - Go to `/attendance` page
   - See "Today's Attendance" card showing your status
   - Check-in time is displayed

3. **Check Out (Option 1: Manual)**
   - Click the "Check Out" button on the attendance page
   - ✅ See toast message: "Checked out successfully! Working hours: X.XX hours"
   
4. **Check Out (Option 2: Automatic)**
   - Click "Logout" from the sidebar menu
   - ✅ Checkout happens automatically before logout
   - Working hours are calculated and saved

5. **View Your Working Hours**
   - Go back to `/attendance` page
   - See the "Hours" column in the attendance table
   - Your working hours for today is displayed (e.g., "8.50h")

### As an Admin:

1. **Login as Admin**
   - Use admin credentials
   - Navigate to `/dashboard`

2. **View Employee Working Hours**
   - Scroll down to see "Employee Working Hours" card
   - View summary statistics:
     - Total Present
     - Currently Working
     - Total Hours Today

3. **Monitor Real-Time Status**
   - See all employees with green "Active" badges (currently working)
   - View check-in and check-out times
   - See current working hours for each employee
   - Data refreshes every 60 seconds automatically

4. **View Detailed Breakdown**
   - Each employee card shows:
     - Name and department
     - Active status (if still logged in)
     - Working hours (formatted as "8h 30m")
     - Check-in time
     - Check-out time

## API Endpoints

### For Employees:
- `POST /api/attendance/checkout` - Record checkout and calculate hours

### For Admins:
- `GET /api/attendance/working-hours` - Get all employees' working hours

## Troubleshooting

### Issue: "Node.js version >=20.9.0 is required"
**Solution**: Upgrade Node.js to version 20.9.0 or higher

### Issue: "Module not found: @/components/shared/employee-working-hours"
**Solution**: Make sure all files were created correctly. Run:
```bash
npm run build
```

### Issue: Database migration not applied
**Solution**: Run the migration:
```bash
npx prisma migrate dev --name add-working-hours
```

### Issue: Working hours not showing
**Solution**: 
1. Make sure you checked out (either manually or by logging out)
2. Refresh the page
3. Check browser console for errors

### Issue: Admin can't see working hours card
**Solution**: 
1. Make sure you're logged in as ADMIN, HR, PA, or BA role
2. Check that the component is imported correctly in dashboard page

## Feature Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     EMPLOYEE WORKFLOW                        │
└─────────────────────────────────────────────────────────────┘

1. Employee Login
   ↓
2. Attendance Record Created (checkIn = current time)
   ↓
3. Employee Works (time tracking in progress)
   ↓
4. Employee Checks Out (Manual or Automatic)
   ↓
5. Working Hours Calculated (checkOut - checkIn)
   ↓
6. Attendance Record Updated (checkOut, workingHours saved)

┌─────────────────────────────────────────────────────────────┐
│                      ADMIN WORKFLOW                          │
└─────────────────────────────────────────────────────────────┘

1. Admin Logs In
   ↓
2. Views Dashboard
   ↓
3. Sees "Employee Working Hours" Card
   ↓
4. Views Real-Time Data:
   - Who's currently working (Active badge)
   - How many hours each employee has worked
   - Total hours across all employees
   ↓
5. Data Auto-Refreshes Every 60 Seconds
```

## Key Files Reference

```
project-management/
├── prisma/
│   └── schema.prisma                          # Added workingHours field
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx                   # Admin dashboard with working hours
│   │   │   └── attendance/
│   │   │       └── page.tsx                   # Attendance page with hours column
│   │   └── api/
│   │       └── attendance/
│   │           ├── checkout/
│   │           │   └── route.ts               # Checkout & calculate hours API
│   │           └── working-hours/
│   │               └── route.ts               # Get all working hours API
│   ├── components/
│   │   └── shared/
│   │       └── employee-working-hours.tsx     # Working hours display component
│   └── context/
│       └── auth-context.tsx                   # Updated logout to record checkout
└── WORKING_HOURS_FEATURE.md                   # Full documentation
```

## What's Next?

1. ✅ Database schema updated
2. ✅ API endpoints created
3. ✅ Frontend components built
4. ✅ Dashboard integrated
5. ⏳ **Upgrade Node.js** (Required)
6. ⏳ Test the feature
7. ⏳ Deploy to production

## Support

If you encounter any issues, check:
1. Node.js version (must be 20.9.0+)
2. All files are created correctly
3. Database migration applied successfully
4. No console errors in browser
5. API endpoints are accessible

For detailed documentation, see: `WORKING_HOURS_FEATURE.md`
