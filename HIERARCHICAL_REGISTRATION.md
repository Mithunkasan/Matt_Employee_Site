# Hierarchical User Registration System

## Overview
The system implements a registration structure where **only ADMIN and HR** can register users. The hierarchy ensures clear reporting lines from Employees up to HR.

## Registration Authority

### Who Can Register Users?
- **ADMIN**: Full control - can register any role.
- **HR**: Can register BA, MANAGER, TEAM_LEADER, and EMPLOYEE.
- **Other Roles**: Cannot register users.

## Registration Hierarchy

```
ADMIN
  ├── Can register: All roles (ADMIN, HR, MANAGER, TEAM_LEADER, BA, PA, EMPLOYEE)
  └── No manager assigned (for ADMIN/HR roles)
  
HR
  ├── Can register: BA, MANAGER, TEAM_LEADER, EMPLOYEE
  ├── BA → Managed by HR (automatically)
  ├── MANAGER → Managed by HR (automatically)
  ├── TEAM_LEADER → Must be assigned to a MANAGER (manual selection required)
  └── EMPLOYEE → Must be assigned to a TEAM_LEADER (manual selection required)
```

## Database Schema

### User Model
- `managerId` (String?, optional): References the user's direct manager.
- `manager` (User?): Relation to the manager user.
- `subordinates` (User[]): List of users managed by this user.

## API Rules

### POST /api/users

**Authorization:**
- Only ADMIN and HR can create users.
- Other roles will receive: `"Only ADMIN and HR can register users"`.

**HR Registration Rules:**
1. **Allowed Roles**: BA, MANAGER, TEAM_LEADER, EMPLOYEE.
2. **Restricted Roles**: ADMIN, HR, PA.
3. **Automatic Manager Assignment**:
   - BA → HR becomes the manager.
   - MANAGER → HR becomes the manager.
4. **Manual Manager Assignment**:
   - TEAM_LEADER → Must provide `managerId` of a MANAGER.
   - EMPLOYEE → Must provide `managerId` of a TEAM_LEADER.

**ADMIN Registration Rules:**
1. **Can register**: Any role.
2. **Manager Assignment**:
   - ADMIN, HR → No manager.
   - TEAM_LEADER → Must provide `managerId` of a MANAGER.
   - EMPLOYEE → Must provide `managerId` of a TEAM_LEADER.
   - Other roles → Optional `managerId`.

## Validation Rules

### For TEAM_LEADER Role:
- `managerId` is **required**.
- Manager must have the **MANAGER** role.
- Error if manager is not a MANAGER: `"TEAM_LEADER must be managed by a MANAGER"`.

### For EMPLOYEE Role:
- `managerId` is **required**.
- Manager must have the **TEAM_LEADER** role.
- Error if manager is not a TEAM_LEADER: `"EMPLOYEE must be managed by a TEAM_LEADER"`.

## UI Behavior

### Role Selection Dropdown
**For ADMIN:**
- Shows all roles: ADMIN, HR, MANAGER, TEAM_LEADER, BA, PA, EMPLOYEE.

**For HR:**
- Shows: BA, MANAGER, TEAM_LEADER, EMPLOYEE.

### Manager Selection
Depending on the selected role, a manager selection dropdown appears:

1. **Role: TEAM_LEADER**
   - **Manager** dropdown appears.
   - Shows only active **MANAGERS**.
   - Selection is **required**.
   - Helper text: "Team Leader must be assigned to a Manager".

2. **Role: EMPLOYEE**
   - **Team Leader (Manager)** dropdown appears.
   - Shows only active **TEAM_LEADERS**.
   - Selection is **required**.
   - Helper text: "Employee must be assigned to a Team Leader".

### Department Selection
- Hidden when registering **TEAM_LEADER** or **EMPLOYEE** (replaced by manager selection).
- Visible for all other roles.

## Example Flows

### 1. HR Registers a Manager
**Result**: Manager created with HR as the manager (automatic).

### 2. HR Registers a Team Leader
- Selects role "Team Leader".
- Selects a "Manager" from the list of Managers.
**Result**: Team Leader created with the specified Manager as manager.

### 3. HR Registers an Employee
- Selects role "Employee".
- Selects a "Team Leader" from the list of Team Leaders.
**Result**: Employee created with the specified Team Leader as manager.

## Organizational Structure

This creates a clear multi-level hierarchy:

```
HR (Central Registration Authority)
├── BA (Business Associate)
├── MANAGER
│   ├── TEAM_LEADER
│   │   ├── EMPLOYEE
│   │   └── EMPLOYEE
│   └── TEAM_LEADER
│       └── EMPLOYEE
└── MANAGER
    └── TEAM_LEADER
```

## Benefits
1. **Strict Hierarchy**: Every user (except top-level) has a clear reporting line.
2. **Data Integrity**: Enforced through API validations.
3. **Simplified UI**: Manager options are filtered by role.
4. **Auditability**: Reporting structures are stored directly in the database.
