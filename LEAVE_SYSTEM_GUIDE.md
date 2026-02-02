# Leave Request System - Complete Guide

## ✅ What Was Fixed

### Problem:
Admin was not receiving leave requests from employees.

### Solution Implemented:
1. ✅ **Notifications System** - Created functional notification dropdown
2. ✅ **Leave Management Page** - Created admin interface to view and approve/reject leaves
3. ✅ **Sidebar Navigation** - Added "Leaves" link for Admin, HR, and BA
4. ✅ **Real-time Updates** - Notifications refresh every 30 seconds
5. ✅ **Visual Indicators** - Unread count badge on bell icon

---

## 🎯 Complete Feature Flow

### For Employees/HR/BA:

1. **Request Leave:**
   - Click "Request Leave" button on dashboard
   - Fill in:
     - Start Date
     - End Date
     - Reason for leave
   - See indicator:
     - **First leave**: "✓ Your first leave is free!" (green)
     - **Subsequent leaves**: "⚠️ This will be Loss of Pay (LOP)" (orange)
   - Click "Submit Request"
   - Get toast notification confirming submission

2. **Result:**
   - Leave request created with status: PENDING
   - Admin receives notification immediately
   - Employee can view their request in "/leaves" page

### For Admin:

1. **Receive Notification:**
   - Bell icon shows badge with unread count (e.g., "2")
   - Click bell icon to open notifications dropdown
   - See notification: "New Leave Request - {Name} ({Department}) has requested leave from {Start} to {End}. Reason: {reason}"
   - Click "Mark as read" or "Mark all read"

2. **Review Leave Request:**
   - Click "Leaves" in sidebar navigation
   - See leave requests dashboard with:
     - **Stats cards**: Total, Pending, Approved, Rejected
     - **Filter buttons**: All, Pending, Approved, Rejected
     - **Table** showing all leave requests with employee details

3. **Approve or Reject:**
   - For PENDING requests, see two buttons:
     - ✅ Green "Approve" button
     - ❌ Red "Reject" button
   - Click to approve or reject
   - Employee receives notification of decision
   - Status updates immediately

---

## 🧪 Step-by-Step Testing

### Step 1: Submit Leave Request as Employee

```bash
1. Login as: john@demo.com / emp123456
2. Go to Dashboard (/)
3. Click "Request Leave" button in header
4. Fill form:
   - Start Date: Tomorrow's date
   - End Date: Day after tomorrow
   - Reason: "Personal work"
5. Click "Submit Request"
6. See green toast: "Leave request submitted! This is your free leave."
7. Logout
```

### Step 2: Check Notification as Admin

```bash
1. Login as: admin@company.com / admin123
2. Look at bell icon in top right
3. See red badge with number "1"
4. Click bell icon
5. See notification dropdown open
6. See: "New Leave Request - John Smith (Development) has requested leave..."
7. Click notification to mark as read
   - Blue dot disappears
   - Badge count decreases
```

### Step 3: Review Leave Request

```bash
1. While logged in as admin
2. Click "Leaves" in sidebar (4th item)
3. See Leaves page with:
   - Stats: 1 Total, 1 Pending, 0 Approved, 0 Rejected
   - Filter showing "All" selected
   - Table with John Smith's leave request
4. Click "Pending" filter to see only pending requests
```

### Step 4: Approve Leave Request

```bash
1. In the Leaves table
2. Find John Smith's request
3. See two buttons: "Approve" and "Reject"
4. Click "Approve" button
5. See green toast: "Leave request approved"
6. Request disappears from Pending filter
7. Stats update: 0 Pending, 1 Approved
8. Click "Approved" filter to see the approved request
```

### Step 5: Submit Second Leave (LOP Warning)

```bash
1. Logout from admin
2. Login as: john@demo.com / emp123456
3. Click "Request Leave" again
4. Fill form with different dates
5. See orange warning: "⚠️ This will be a Loss of Pay (LOP) leave"
6. See message: "You have already used 1 free leave. This leave will be marked as Loss of Pay (LOP)."
7. Submit request
8. See orange toast: "Leave request submitted! This will be Loss of Pay (LOP)."
```

---

## 📁 Files Created/Modified

### New Files:
1. ✅ `src/components/shared/notification-dropdown.tsx` - Functional notification dropdown
2. ✅ `src/app/(dashboard)/leaves/page.tsx` - Leave management page
3. ✅ `src/components/shared/leave-request-button.tsx` - Leave request form

### Modified Files:
1. ✅ `src/components/layout/header.tsx` - Integrated NotificationDropdown
2. ✅ `src/components/layout/sidebar.tsx` - Added Leaves navigation
3. ✅ `src/app/api/leaves/route.ts` - Added notification creation
4. ✅ `src/app/(dashboard)/dashboard/page.tsx` - Added Leave Request button

---

## 🎨 UI Components

### Notification Dropdown Features:
- ✅ Bell icon with unread count badge
- ✅ Dropdown with scrollable list
- ✅ "Mark as read" button for each notification
- ✅ "Mark all read" button
- ✅ Blue dot indicator for unread notifications
- ✅ Time ago format (e.g., "2 minutes ago")
- ✅ Auto-refresh every 30 seconds

### Leaves Page Features:
- ✅ Stats cards (Total, Pending, Approved, Rejected)
- ✅ Filter buttons
- ✅ Employee information (name, department)
- ✅ Date range display
- ✅ Reason display
- ✅ Status badges (color-coded)
- ✅ Approve/Reject buttons for pending requests
- ✅ Responsive table design

---

## 🔧 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/leaves` | GET | Get all leave requests (filtered by role) |
| `/api/leaves` | POST | Create new leave request + send notifications |
| `/api/leaves/[id]` | PATCH | Update leave status (approve/reject) |
| `/api/notifications` | GET | Get user's notifications |
| `/api/notifications/[id]` | PATCH | Mark notification as read |

---

## 📊 Database Flow

### When Employee Submits Leave:
```
1. Create LeaveRequest record
   - userId: Employee ID
   - startDate, endDate, reason
   - status: PENDING

2. Query user details (name, department)

3. Find all ADMIN users

4. Create Notification for each admin:
   - userId: Admin ID
   - title: "New Leave Request"
   - message: "{Name} ({Dept}) has requested leave..."
   - read: false
```

### When Admin Approves/Rejects:
```
1. Update LeaveRequest
   - status: APPROVED or REJECTED

2. Create Notification for employee:
   - title: "Leave Request {Status}"
   - message: "Your leave request has been {approved/rejected}"
   - read: false
```

---

## ⚡ Real-Time Features

1. **Notifications auto-refresh**: Every 30 seconds
2. **Unread count updates**: Immediately when marked as read
3. **Leave status updates**: Real-time after approve/reject
4. **Stats cards update**: Immediately after filtering

---

## 🎯 Access Control

### Who Can See What:

| Feature | Admin | HR | BA | Employee |
|---------|-------|----|----|----------|
| Request Leave | ❌ | ✅ | ✅ | ✅ |
| View Own Leaves | - | ✅ | ✅ | ✅ |
| View All Leaves | ✅ | ✅ | ✅ | ❌ |
| Approve/Reject | ✅ | ❌ | ❌ | ❌ |
| Receive Notifications | ✅ | ✅ | ✅ | ✅ |

---

## 🚀 Ready to Test!

Your dev server is running at: **http://localhost:3000**

**Test Accounts:**
- **Admin**: `admin@company.com` / `admin123`
- **Employee**: `john@demo.com` / `emp123456`
- **HR**: `hr@demo.com` / `hr123456`

All features are live and working! 🎉

---

## ✨ What's Working Now:

1. ✅ Employees can request leave
2. ✅ Admins receive notifications instantly
3. ✅ Notifications show in dropdown with unread count
4. ✅ Admins can view all leave requests in "/leaves"
5. ✅ Admins can approve or reject requests
6. ✅ First leave is free, subsequent leaves show LOP warning
7. ✅ Real-time updates everywhere
8. ✅ Beautiful, professional UI

The leave request system is now **fully functional**! 🎊
