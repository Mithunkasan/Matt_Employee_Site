# 📊 Employee Activity Monitor - Feature Documentation

## Overview

The **Employee Activity Monitor** is a real-time dashboard for Admin and HR users to track employee work hours, online/offline status, and session details.

---

## 🎯 Features

### 1. **Real-Time Online/Offline Status**
- See which employees are currently logged in (Online)
- See which employees have logged out (Offline)
- Status updates automatically every 30 seconds

### 2. **Session Tracking**
- View all login/logout sessions for each employee
- See exact login and logout times
- Count of sessions per employee per day

### 3. **Work Hours Tracking**
- Total work hours for each employee today
- Hours per individual session
- Real-time calculation for active sessions

### 4. **Summary Statistics**
- Total employees online now
- Total employees offline
- Total hours worked today (all employees)
- Total number of employees

---

## 🚀 How to Access

### For Admin Users:

1. **From Dashboard:**
   - Login as Admin
   - You'll see a prominent blue card: **"Employee Activity Monitor"**
   - Click on it to view the full activity monitor

2. **Direct URL:**
   - Navigate to: `/employee-activity`

### For HR Users:
- Same access as Admin users

### For Other Roles:
- This feature is restricted to Admin and HR only

---

## 📱 Dashboard Layout

### Summary Cards (Top Row)
- **Online Now**: Green card showing current online employees
- **Offline**: Gray card showing offline employees
- **Total Hours Today**: Blue card with cumulative hours
- **Total Employees**: Purple card with total count

### Employee Activity Table
Shows detailed information for each employee:

| Column | Information |
|--------|-------------|
| **Employee** | Name, avatar, department |
| **Status** | Online (green) or Offline (gray) badge |
| **Sessions Today** | Number of login/logout sessions |
| **Total Hours** | Cumulative work hours for the day |
| **Login/Logout Times** | All sessions with timestamps |

---

## 🔄 Auto-Refresh

The dashboard automatically refreshes every **30 seconds** to show real-time data.

A timestamp at the top-right shows when the data was last updated.

---

## 💡 Understanding Session Data

### Active Session
- Shows login time with a green "Active" badge
- No logout time (still ongoing)
- Hours are calculated in real-time

### Completed Session
- Shows both login and logout times
- Displays duration in parentheses
- Example: `9:00 AM → 5:00 PM (8h)`

### Multiple Sessions
Employees can have multiple sessions in one day:
- Logged in at 9:00 AM, logged out at 12:00 PM (3h)
- Logged in at 1:00 PM, still active (4h so far)
- **Total**: 7h total work hours

---

## 🎨 Visual Indicators

### Status Badges
- 🟢 **Green with pulse animation**: Employee is online
- ⚫ **Gray**: Employee is offline

### Time Display
- **Login**: Green arrow icon 🔼
- **Logout**: Gray arrow icon 🔽
- **Active**: Green "Active" badge (no logout time yet)

---

## 📊 Use Cases

### 1. **Monitor Attendance**
See who's currently working in real-time

### 2. **Track Work Hours**
View total hours worked by each employee

### 3. **Identify Patterns**
- Who works multiple shifts?
- Who has the longest continuous session?
- Total productivity hours for the team

### 4. **Compliance**
Ensure employees are logging proper work hours

---

## 🔧 Technical Details

### API Endpoint
```
GET /api/admin/employee-activity
```

**Authorization**: Admin or HR role required

**Response**:
```json
{
  "employees": [
    {
      "id": "attendance_id",
      "user": {
        "id": "user_id",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "EMPLOYEE",
        "department": "Engineering"
      },
      "date": "2026-02-02",
      "status": "PRESENT",
      "totalHours": 7.5,
      "isOnline": true,
      "sessionCount": 2,
      "sessions": [
        {
          "id": "session_id",
          "checkIn": "2026-02-02T09:00:00Z",
          "checkOut": "2026-02-02T12:00:00Z",
          "hoursWorked": 3.0
        },
        {
          "id": "session_id_2",
          "checkIn": "2026-02-02T13:00:00Z",
          "checkOut": null,
          "hoursWorked": 0
        }
      ]
    }
  ],
  "summary": {
    "totalEmployees": 15,
    "onlineCount": 10,
    "offlineCount": 5,
    "totalHours": 65.5
  }
}
```

### Components
- **Page**: `src/app/(dashboard)/employee-activity/page.tsx`
- **Component**: `src/components/admin/employee-activity-dashboard.tsx`
- **API**: `src/app/api/admin/employee-activity/route.ts`

---

## 📝 Notes

1. **Data Accuracy**: Shows data for current day only (resets at midnight)
2. **Refresh Rate**: Auto-refreshes every 30 seconds
3. **Active Sessions**: Hours for active sessions are calculated in real-time
4. **Sorting**: Online employees appear first, then sorted by total hours

---

## 🎯 Future Enhancements

Potential improvements:
- [ ] Export to CSV/Excel
- [ ] Date range picker to view historical data
- [ ] Department-wise filtering
- [ ] Email alerts for long working hours
- [ ] Weekly/Monthly reports
- [ ] Charts and graphs for visualization

---

**Created**: 2026-02-02  
**Last Updated**: 2026-02-02  
**Version**: 1.0
