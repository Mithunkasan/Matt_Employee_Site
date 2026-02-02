# Employee Working Hours Tracking Feature

## Overview
This feature automatically tracks employee working hours based on their login and logout times. Admin users can view all employees' working hours in real-time on the dashboard.

## What Was Implemented

### 1. Database Changes
**File**: `prisma/schema.prisma`
- Added `workingHours` field (Float) to the `Attendance` model
- This field stores the calculated working hours in hours (e.g., 8.5 hours)
- Default value is 0

**Migration**: Run `npx prisma migrate dev --name add-working-hours` (Already completed)

### 2. API Endpoints Created

#### a. Checkout API (`/api/attendance/checkout`)
**File**: `src/app/api/attendance/checkout/route.ts`
- **Method**: POST
- **Purpose**: Records employee checkout time and calculates working hours
- **Logic**:
  - Finds today's attendance record for the logged-in user
  - Calculates working hours: (checkOut time - checkIn time)
  - Updates the attendance record with checkOut time and workingHours
  - Returns attendance data with working hours

**Response Example**:
```json
{
  "message": "Checkout successful",
  "attendance": {
    "checkIn": "2026-02-01T09:00:00.000Z",
    "checkOut": "2026-02-01T17:30:00.000Z",
    "workingHours": 8.5
  }
}
```

#### b. Working Hours API (`/api/attendance/working-hours`)
**File**: `src/app/api/attendance/working-hours/route.ts`
- **Method**: GET
- **Purpose**: Fetches all employees' working hours for today (Admin only)
- **Access**: ADMIN, HR, PA, BA roles only
- **Features**:
  - Returns list of all employees present today
  - Shows check-in, check-out times, and working hours
  - For employees who haven't checked out yet, calculates current working time
  - Provides summary statistics (total employees present, active employees, total hours)
  - Refreshes every 60 seconds for real-time data

**Response Example**:
```json
{
  "employees": [
    {
      "id": "att123",
      "user": {
        "id": "user123",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "EMPLOYEE",
        "department": "Engineering"
      },
      "checkIn": "2026-02-01T09:00:00.000Z",
      "checkOut": "2026-02-01T17:30:00.000Z",
      "workingHours": 8.5,
      "isActive": false,
      "date": "2026-02-01"
    }
  ],
  "summary": {
    "totalEmployeesPresent": 25,
    "activeEmployees": 10,
    "totalHoursToday": 180.5
  }
}
```

### 3. Frontend Components

#### a. Employee Working Hours Card
**File**: `src/components/shared/employee-working-hours.tsx`
- Displays real-time employee working hours on admin dashboard
- Features:
  - Summary cards showing total present, currently working, and total hours
  - Scrollable list of all employees with their working hours
  - Real-time status indicator (green badge with pulse animation for active employees)
  - Shows check-in and check-out times for each employee
  - Formats hours as "8h 30m" for better readability
  - Auto-refreshes every 60 seconds

#### b. Admin Dashboard Integration
**File**: `src/app/(dashboard)/dashboard/page.tsx`
- Integrated EmployeeWorkingHoursCard into admin dashboard
- Only visible to non-employee users (ADMIN, HR, BA, PA)
- Positioned prominently after stats grid

#### c. Attendance Page Updates
**File**: `src/app/(dashboard)/attendance/page.tsx`
- Added `workingHours` field to Attendance interface
- Updated checkout handler to use new checkout API
- Added "Hours" column to attendance table
- Shows working hours in hours format (e.g., "8.50h")
- Displays success toast with working hours when checking out

### 4. Logout Integration
**File**: `src/context/auth-context.tsx`
- Modified logout function to automatically record checkout time
- Calls `/api/attendance/checkout` before logging out
- Ensures working hours are calculated even if user forgets to manually check out
- Applies to EMPLOYEE, BA, and HR roles

## How It Works

### For Employees:
1. **Login** → Attendance record created with checkIn time (automatic)
2. **Work** → Time is being tracked
3. **Logout** → Checkout API is called, working hours calculated automatically
4. **Manual Checkout** → Can click "Check Out" button on attendance page

### For Admins:
1. **View Dashboard** → See "Employee Working Hours" card
2. **Real-time Data** → Shows who's currently working (green "Active" badge)
3. **See Details** → Check-in time, checkout time, and total hours for each employee
4. **Monitor** → View total hours worked across all employees today

## Key Features

✅ **Automatic Tracking**: Time starts when employee logs in  
✅ **Real-time Updates**: Admin dashboard updates every 60 seconds  
✅ **Manual Checkout**: Employees can manually check out from attendance page  
✅ **Auto-checkout on Logout**: Working hours calculated when logging out  
✅ **Visual Indicators**: Active employees shown with green pulse badge  
✅ **Summary Statistics**: Total employees present, active count, total hours  
✅ **Clean UI**: Modern, professional design with card-based layout  
✅ **Role-based Access**: Only admins/HR/BA/PA can view all working hours  

## Example Use Case

**Scenario**: Employee "John Doe" works for 8 hours

1. **9:00 AM** - John logs into the website
   - Attendance record created with checkIn = 9:00 AM
   
2. **Throughout the day** - Admin can see:
   - John is "Active" (green badge)
   - Current working hours updates in real-time
   - At 3:00 PM, shows "6h 0m"
   
3. **5:00 PM** - John logs out
   - Checkout API called automatically
   - Working hours calculated: 8.0 hours
   - Toast message: "Checked out successfully! Working hours: 8.00 hours"
   
4. **Admin Dashboard** shows:
   - John Doe: 8.00h worked today
   - Status changed from "Active" to checked out
   - Contributed to total hours statistic

## Testing Checklist

- [ ] Employee can log in (checkIn time recorded)
- [ ] Admin can see employee in "Active" status on dashboard
- [ ] Working hours update in real-time while employee is logged in
- [ ] Employee can manually check out from attendance page
- [ ] Working hours are calculated correctly
- [ ] Checkout happens automatically on logout
- [ ] Attendance table shows working hours column
- [ ] Only authorized roles (ADMIN, HR, BA, PA) can access working hours API
- [ ] Summary statistics are accurate

## Files Modified/Created

### Created:
1. `src/app/api/attendance/checkout/route.ts`
2. `src/app/api/attendance/working-hours/route.ts`
3. `src/components/shared/employee-working-hours.tsx`
4. `prisma/migrations/[timestamp]_add-working-hours/`

### Modified:
1. `prisma/schema.prisma`
2. `src/app/(dashboard)/dashboard/page.tsx`
3. `src/app/(dashboard)/attendance/page.tsx`
4. `src/context/auth-context.tsx`

## Next Steps

1. **Upgrade Node.js** to version 20.9.0 or higher (currently on 16.20.2)
2. **Run the dev server**: `npm run dev`
3. **Test the feature**:
   - Log in as an employee
   - Check admin dashboard to see working hours
   - Log out and verify hours are recorded
4. **Deploy** to production once testing is complete

## Notes

- Working hours are calculated in decimal format (e.g., 8.5 hours = 8 hours 30 minutes)
- The system tracks hours per day (date-based)
- If an employee logs in multiple times in a day, only the first checkIn is recorded
- Real-time updates happen every 60 seconds to minimize server load
- All times are stored in UTC in the database
