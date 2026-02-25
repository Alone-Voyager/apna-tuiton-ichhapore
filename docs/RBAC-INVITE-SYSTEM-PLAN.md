# 🔐 RBAC & Invite System — Implementation Plan
### Apna Tuition Management Platform

> **Goal:** Add a full Role-Based Access Control (RBAC) system with an invite-based user onboarding flow. When an admin invites a user, the system auto-generates credentials (email pattern + temporary password) and sends them to the invited user. The invited user can log in and access only what their role allows.

---

## 📐 Current Architecture Overview

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Auth | Supabase Auth (`auth.users`) |
| Database | PostgreSQL via Supabase |
| Admin Profiles | `admin_profiles` table (linked to `auth.users`) |
| Row-Level Security | Supabase RLS Policies |
| Middleware | `src/middleware.ts` (session-based route protection) |
| API Routes | `src/app/api/**` (Next.js Route Handlers) |

---

## 👥 Roles Definition

| Role | Description | Access Level |
|---|---|---|
| `super_admin` | Platform owner / God mode | Full access to all organizations |
| `admin` | Organization owner | Full access to their own org |
| `staff` | Staff member (e.g., coordinator) | Limited admin access (configurable) |
| `teacher` | Teaching staff | View classes, mark attendance, view students |
| `student` | Enrolled student | View own profile, attendance, fees, assignments |

> **Note:** `super_admin`, `admin`, and `staff` already exist in `admin_profiles`. This plan adds `teacher` and `student` as first-class auth users with their own portals.

---

## 🗺️ System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     ADMIN (super_admin / admin)              │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │             /dashboard/settings/users                │   │
│  │                                                      │   │
│  │  [Invite User]  →  Choose Role  →  Fill Details      │   │
│  │                         ↓                            │   │
│  │          Auto-generate: email + temp password        │   │
│  │                         ↓                            │   │
│  │       Create auth.users entry (Supabase Admin SDK)   │   │
│  │                         ↓                            │   │
│  │       Insert into user_invites table (pending)       │   │
│  │                         ↓                            │   │
│  │       Send email/WhatsApp with credentials           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    INVITED USER                              │
│                                                              │
│  Receives: email = "john.doe@apnatuition.com"               │
│            password = "Temp@123456"                          │
│                                                              │
│  Logs in at /login  →  Forced to change password            │
│                              ↓                              │
│                    Role-based redirect:                      │
│                    /student/dashboard  (student)             │
│                    /teacher/dashboard  (teacher)             │
│                    /dashboard          (admin/staff)         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Phase 1: Database Schema Changes

### 1.1 — New Table: `user_invites`

Tracks all pending/accepted invitations.

```sql
-- ============================================
-- user_invites: tracks invite lifecycle
-- ============================================
CREATE TABLE IF NOT EXISTS user_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    invited_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,

    -- Invitee details
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),

    -- Role the invited user is being given
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'staff', 'teacher', 'student')),

    -- For student/teacher: link to existing record
    student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,

    -- Invite status lifecycle
    status VARCHAR(50) DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),

    -- Temp credentials (hashed password should NOT be stored; just record that it was sent)
    temp_password_hint VARCHAR(100),  -- e.g., last 4 chars only for admin reference

    -- auth.users reference (filled after Supabase user is created)
    auth_user_id UUID,

    -- Expiry: invite link expires after N days
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(email, organization_id)
);

CREATE INDEX idx_user_invites_org ON user_invites(organization_id);
CREATE INDEX idx_user_invites_status ON user_invites(status);
CREATE INDEX idx_user_invites_role ON user_invites(role);
CREATE INDEX idx_user_invites_email ON user_invites(email);

-- Auto-update timestamp
CREATE TRIGGER update_user_invites_updated_at
    BEFORE UPDATE ON user_invites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 1.2 — New Table: `user_roles`

A normalized permissions table for fine-grained access control.

```sql
-- ============================================
-- user_roles: granular role permissions
-- ============================================
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    auth_user_id UUID NOT NULL,  -- maps to auth.users.id
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'admin', 'staff', 'teacher', 'student')),

    -- Permissions: JSONB for flexible, per-role feature toggling
    permissions JSONB DEFAULT '{
        "dashboard": true,
        "students": false,
        "classes": false,
        "attendance": false,
        "fees": false,
        "teachers": false,
        "assignments": false,
        "tests": false,
        "notifications": false,
        "reports": false,
        "settings": false,
        "invite_users": false
    }'::jsonb,

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(auth_user_id, organization_id)
);

CREATE INDEX idx_user_roles_auth_user ON user_roles(auth_user_id);
CREATE INDEX idx_user_roles_org ON user_roles(organization_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 1.3 — New Table: `student_profiles`

Links a student (from `students` table) with a Supabase auth user so they can log in.

```sql
-- ============================================
-- student_profiles: auth link for students
-- ============================================
CREATE TABLE IF NOT EXISTS student_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE UNIQUE NOT NULL,
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    must_change_password BOOLEAN DEFAULT TRUE,  -- force change on first login
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_student_profiles_student_id ON student_profiles(student_id);
CREATE INDEX idx_student_profiles_org ON student_profiles(organization_id);

CREATE TRIGGER update_student_profiles_updated_at
    BEFORE UPDATE ON student_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 1.4 — New Table: `teacher_profiles`

Same as above, but for teachers.

```sql
-- ============================================
-- teacher_profiles: auth link for teachers
-- ============================================
CREATE TABLE IF NOT EXISTS teacher_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE UNIQUE NOT NULL,
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    must_change_password BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teacher_profiles_teacher_id ON teacher_profiles(teacher_id);
CREATE INDEX idx_teacher_profiles_org ON teacher_profiles(organization_id);

CREATE TRIGGER update_teacher_profiles_updated_at
    BEFORE UPDATE ON teacher_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 1.5 — Alter `admin_profiles` (extend roles)

The `admin_profiles` table already has `role IN ('super_admin', 'admin', 'staff')`. Add `must_change_password`:

```sql
ALTER TABLE admin_profiles
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;
```

---

## 🔒 Phase 2: RLS Policy Updates

### 2.1 — `user_invites` RLS

```sql
ALTER TABLE user_invites ENABLE ROW LEVEL SECURITY;

-- Admins of the org can manage invites
CREATE POLICY "Admins manage invites" ON user_invites
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_profiles ap
            WHERE ap.user_id = auth.uid()
            AND ap.is_active = TRUE
            AND (ap.role = 'super_admin' OR ap.organization_id = user_invites.organization_id)
        )
    );
```

### 2.2 — `student_profiles` RLS

```sql
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

-- Students can read their own profile
CREATE POLICY "Students view own profile" ON student_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Admins can manage all student profiles in their org
CREATE POLICY "Admins manage student profiles" ON student_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_profiles ap
            WHERE ap.user_id = auth.uid()
            AND ap.is_active = TRUE
            AND (ap.role = 'super_admin' OR ap.organization_id = student_profiles.organization_id)
        )
    );
```

### 2.3 — `students` table — Add Student Self-Access

```sql
-- Students can read their own record
CREATE POLICY "Students can view own data" ON students
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM student_profiles sp
            WHERE sp.user_id = auth.uid()
            AND sp.student_id = students.id
        )
    );
```

### 2.4 — `attendance` table — Add Student Self-Access

```sql
CREATE POLICY "Students can view own attendance" ON attendance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM student_profiles sp
            WHERE sp.user_id = auth.uid()
            AND sp.student_id = attendance.student_id
        )
    );
```

### 2.5 — `fee_payments` table — Add Student Self-Access

```sql
CREATE POLICY "Students can view own fees" ON fee_payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM student_profiles sp
            WHERE sp.user_id = auth.uid()
            AND sp.student_id = fee_payments.student_id
        )
    );
```

### 2.6 — Teacher RLS policies (similar pattern)

```sql
ALTER TABLE teacher_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers view own profile" ON teacher_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins manage teacher profiles" ON teacher_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_profiles ap
            WHERE ap.user_id = auth.uid()
            AND ap.is_active = TRUE
            AND (ap.role = 'super_admin' OR ap.organization_id = teacher_profiles.organization_id)
        )
    );

-- Teachers can view their own attendance and schedule
CREATE POLICY "Teachers view own teacher_attendance" ON teacher_attendance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM teacher_profiles tp
            WHERE tp.user_id = auth.uid()
            AND tp.teacher_id = teacher_attendance.teacher_id
        )
    );
```

---

## ⚙️ Phase 3: Backend API Routes

### 3.1 — `POST /api/users/invite`

**Responsibility:** Create a Supabase auth user, insert into `user_invites`, and optionally notify via email/WhatsApp.

**File:** `src/app/api/users/invite/route.ts`

```
Request Body:
{
  "full_name": "John Doe",
  "role": "student" | "teacher" | "staff" | "admin",
  "phone": "+91XXXXXXXXXX",             // optional
  "student_id": "uuid",                 // required if role = "student"
  "teacher_id": "uuid",                 // required if role = "teacher"
  "send_notification": true             // email/WhatsApp
}

Response:
{
  "success": true,
  "invite_id": "uuid",
  "generated_email": "john.doe.2024@org-slug.apnatuition.com",
  "temp_password": "Temp@XXXXXX"       // only shown once
}
```

**Flow:**
1. Validate admin access (check `admin_profiles` for caller).
2. Generate email: `{firstname}.{lastname}.{year}@{org-slug}.com` (sanitized, unique).
3. Generate temp password: `Apna@{6-random-alphanum}`.
4. Call `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true })`.
5. Based on role:
   - `student` → insert into `student_profiles`
   - `teacher` → insert into `teacher_profiles`
   - `admin/staff` → insert into `admin_profiles`
6. Insert into `user_invites` with status `pending`.
7. Insert into `user_roles` with default permissions for that role.
8. If `send_notification`, call WhatsApp/email service with credentials.
9. Return `invite_id`, `generated_email`, and `temp_password`.

---

### 3.2 — `GET /api/users/invite`

List all invites for the organization.

**File:** `src/app/api/users/invite/route.ts` (GET handler)

```
Query Params: ?status=pending|accepted|all&role=student|teacher|all&page=1&limit=20

Response:
{
  "invites": [...],
  "total": 50,
  "page": 1
}
```

---

### 3.3 — `DELETE /api/users/invite/[id]`

Revoke a pending invite.

**File:** `src/app/api/users/invite/[id]/route.ts`

1. Update `user_invites.status = 'revoked'`.
2. Optionally disable the auth user via `supabaseAdmin.auth.admin.updateUserById(auth_user_id, { ban_duration: 'none' })`.

---

### 3.4 — `GET /api/users` (User Management)

List all users in the organization across all roles.

**File:** `src/app/api/users/route.ts`

Joins `admin_profiles`, `student_profiles`, `teacher_profiles` and `user_invites` for a unified user list.

---

### 3.5 — `PATCH /api/users/[id]/role`

Update a user's role and permissions.

**File:** `src/app/api/users/[id]/route.ts`

1. Update `user_roles.permissions` JSONB.
2. Update role in `admin_profiles` / `student_profiles` / `teacher_profiles`.

---

### 3.6 — Update Middleware for Multi-Role Routing

**File:** `src/middleware.ts`

```typescript
// Current: only redirects to /dashboard
// New: redirect based on user's role

// After session validation:
const role = await getUserRole(supabase, session.user.id);

if (role === 'student') {
  // protect /student/** routes
  if (!pathname.startsWith('/student')) {
    return NextResponse.redirect(new URL('/student/dashboard', request.url));
  }
} else if (role === 'teacher') {
  if (!pathname.startsWith('/teacher') && !pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/teacher/dashboard', request.url));
  }
} else {
  // admin/staff/super_admin
  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
}
```

---

## 🖥️ Phase 4: Frontend Pages & Components

### 4.1 — User Management Page

**File:** `src/app/dashboard/settings/users/page.tsx`

**UI Components:**
- Tab navigation: `All Users | Pending Invites | Active Users`
- Invite button opens a modal/drawer
- User list table with: Name, Email, Role, Status, Actions (Edit Role, Revoke)
- Role badges with color coding

---

### 4.2 — Invite User Modal

**File:** `src/components/users/InviteUserModal.tsx`

**Fields:**
```
Full Name          [text input]
Role               [dropdown: admin / staff / teacher / student]
Phone              [optional]
── If role = "student" ──
  Link to Student  [searchable dropdown from students table]
── If role = "teacher" ──
  Link to Teacher  [searchable dropdown from teachers table]
Send notification  [checkbox: WhatsApp / Email]

[Cancel]  [Generate & Invite →]
```

**After Submit — Show Credentials Modal:**
```
✅ Invite Sent!

Login Email:    john.doe.2024@yourschool.com
Temp Password:  Apna@Ab3xK9

⚠️ Share these credentials with the user.
   They will be prompted to change password on first login.

[Copy Credentials]  [Close]
```

---

### 4.3 — Student Portal (New)

**Files:**

| File | Description |
|---|---|
| `src/app/student/layout.tsx` | Student shell layout (different sidebar) |
| `src/app/student/dashboard/page.tsx` | Student home: attendance, fees, upcoming |
| `src/app/student/attendance/page.tsx` | Own attendance history |
| `src/app/student/fees/page.tsx` | Own fee records |
| `src/app/student/assignments/page.tsx` | View assignments |
| `src/app/student/tests/page.tsx` | View test results |
| `src/app/student/profile/page.tsx` | View/edit profile |

---

### 4.4 — Teacher Portal (New)

**Files:**

| File | Description |
|---|---|
| `src/app/teacher/layout.tsx` | Teacher shell layout |
| `src/app/teacher/dashboard/page.tsx` | Teacher home: today's classes, recent activity |
| `src/app/teacher/attendance/page.tsx` | Mark student attendance |
| `src/app/teacher/classes/page.tsx` | View assigned classes |
| `src/app/teacher/assignments/page.tsx` | Manage assignments |
| `src/app/teacher/tests/page.tsx` | Manage tests / enter results |
| `src/app/teacher/students/page.tsx` | View students in assigned classes |

---

### 4.5 — Force Change Password Page

**File:** `src/app/change-password/page.tsx`

Triggered when `must_change_password = true` in the profile table.

---

### 4.6 — Permission Guard Component

**File:** `src/components/auth/PermissionGuard.tsx`

```typescript
// Usage:
<PermissionGuard permission="invite_users">
  <InviteButton />
</PermissionGuard>
```

Reads from `user_roles.permissions` JSONB, hides/shows UI elements.

---

## 🔑 Phase 5: Auth Utility Updates

### 5.1 — `src/lib/supabase/auth.ts` Changes

Add a new `inviteUser()` function and a `getUserRole()` helper:

```typescript
/**
 * Get role and permissions for the current authenticated user
 */
export async function getCurrentUserRole(): Promise<{
  role: string;
  permissions: Record<string, boolean>;
  profileType: 'admin' | 'student' | 'teacher';
}> {
  // 1. Check admin_profiles first
  // 2. Check student_profiles
  // 3. Check teacher_profiles
  // Returns role + permissions from user_roles table
}
```

### 5.2 — Custom Hook: `useCurrentUser`

**File:** `src/lib/hooks/useCurrentUser.ts`

```typescript
export function useCurrentUser() {
  // Returns: { user, role, permissions, profileType, isLoading }
  // Used across all pages for role-aware rendering
}
```

---

## 📧 Phase 6: Notification Service Updates

### 6.1 — Credential Notification Template

**File:** `src/lib/invite-notification-service.ts`

New service for sending invite credentials:

```typescript
export async function sendInviteCredentials({
  to_name,
  to_phone,
  to_email,
  generated_email,
  temp_password,
  role,
  org_name,
  login_url
}: InviteNotificationPayload): Promise<void> {
  // WhatsApp message template:
  // "Hello {name}! You've been invited to {org_name} as a {role}.
  //  Login: {login_url}
  //  Email: {generated_email}
  //  Password: {temp_password}
  //  Please change your password after first login."
}
```

---

## 📁 Folder Structure (Final)

```
src/
├── app/
│   ├── api/
│   │   ├── auth/              ← existing (login, logout, signup)
│   │   └── users/             ← NEW
│   │       ├── route.ts       ← GET all users
│   │       ├── invite/
│   │       │   └── route.ts   ← POST invite, GET list
│   │       └── [id]/
│   │           └── route.ts   ← PATCH role, DELETE revoke
│   ├── dashboard/
│   │   └── settings/
│   │       └── users/         ← NEW: User Management UI
│   │           └── page.tsx
│   ├── student/               ← NEW: Student Portal
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── attendance/page.tsx
│   │   ├── fees/page.tsx
│   │   ├── assignments/page.tsx
│   │   ├── tests/page.tsx
│   │   └── profile/page.tsx
│   ├── teacher/               ← NEW: Teacher Portal
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── classes/page.tsx
│   │   ├── attendance/page.tsx
│   │   ├── assignments/page.tsx
│   │   ├── tests/page.tsx
│   │   └── students/page.tsx
│   └── change-password/       ← NEW: Force password change
│       └── page.tsx
├── components/
│   ├── auth/
│   │   └── PermissionGuard.tsx  ← NEW
│   └── users/
│       ├── InviteUserModal.tsx  ← NEW
│       ├── UserTable.tsx        ← NEW
│       └── CredentialsModal.tsx ← NEW
├── lib/
│   ├── hooks/
│   │   └── useCurrentUser.ts    ← NEW
│   ├── supabase/
│   │   ├── auth.ts              ← UPDATED
│   │   └── types.ts             ← UPDATED (add new tables)
│   └── invite-notification-service.ts ← NEW
└── middleware.ts                ← UPDATED (multi-role routing)
```

---

## 🗃️ Database Migration File

All SQL from Phases 1 & 2 should go into:

```
database/migration-rbac-invite-system.sql
```

Run this in Supabase SQL Editor after backing up.

---

## 🔄 Invite Flow — Step by Step

```
1. Admin opens /dashboard/settings/users
2. Clicks "Invite User" button
3. Fills modal: Name, Role, Phone, (Student/Teacher link)
4. Clicks "Generate & Invite"
        ↓
5. API: POST /api/users/invite
        ├── Generate email: firstname.lastname.YYYY@orgslug.com
        ├── Generate temp password: Apna@XXXXXX
        ├── supabaseAdmin.auth.admin.createUser(...)
        ├── Insert into student_profiles / teacher_profiles / admin_profiles
        ├── Insert into user_invites (status: 'pending')
        ├── Insert into user_roles (default permissions)
        └── Send WhatsApp/email notification (if opted)
        ↓
6. Admin sees Credentials Modal with email + password (copy button)
7. Invited user receives WhatsApp/email with credentials
        ↓
8. User logs in at /login
9. Middleware detects role + must_change_password = true
10. Redirect to /change-password
11. User sets new password
12. user_invites.status = 'accepted', must_change_password = false
        ↓
13. Redirect to role-appropriate dashboard:
    - admin/staff  → /dashboard
    - teacher      → /teacher/dashboard
    - student      → /student/dashboard
```

---

## 🚦 Permission Matrix

| Feature | super_admin | admin | staff | teacher | student |
|---|---|---|---|---|---|
| Full Dashboard | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage Students | ✅ | ✅ | ✅ | View only | Own only |
| Manage Classes | ✅ | ✅ | ❌ | View only | ❌ |
| Mark Attendance | ✅ | ✅ | ✅ | ✅ | ❌ |
| View Own Attendance | — | — | — | ✅ | ✅ |
| Manage Fees | ✅ | ✅ | ✅ | ❌ | View only |
| Manage Teachers | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Assignments | ✅ | ✅ | ✅ | ✅ | View only |
| Enter Test Results | ✅ | ✅ | ✅ | ✅ | View only |
| Send Notifications | ✅ | ✅ | ✅ | ❌ | ❌ |
| View Reports | ✅ | ✅ | ✅ | ❌ | ❌ |
| Invite Users | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Access Other Orgs | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 📋 Implementation Checklist

### Phase 1 — Database (Start Here)
- [ ] Run `migration-rbac-invite-system.sql` in Supabase SQL Editor
- [ ] Verify all new tables: `user_invites`, `user_roles`, `student_profiles`, `teacher_profiles`
- [ ] Verify `admin_profiles.must_change_password` column added
- [ ] Test RLS policies with different user roles

### Phase 2 — Backend APIs
- [ ] `POST /api/users/invite` — create user + send invite
- [ ] `GET /api/users/invite` — list all invites
- [ ] `DELETE /api/users/invite/[id]` — revoke
- [ ] `GET /api/users` — list all org users
- [ ] `PATCH /api/users/[id]/role` — update role/permissions

### Phase 3 — Auth & Middleware
- [ ] Update `getCurrentUserRole()` in auth.ts
- [ ] Create `useCurrentUser` hook
- [ ] Update `middleware.ts` for multi-role routing
- [ ] Create `PermissionGuard` component

### Phase 4 — Admin UI
- [ ] User management page at `/dashboard/settings/users`
- [ ] `InviteUserModal` component
- [ ] `CredentialsModal` component (show generated creds)
- [ ] Sidebar link to "Users" in settings

### Phase 5 — Student Portal
- [ ] `/student/layout.tsx` (student navigation)
- [ ] `/student/dashboard`
- [ ] `/student/attendance`
- [ ] `/student/fees`
- [ ] `/student/assignments`
- [ ] `/student/tests`
- [ ] `/student/profile`

### Phase 6 — Teacher Portal
- [ ] `/teacher/layout.tsx`
- [ ] `/teacher/dashboard`
- [ ] `/teacher/classes`
- [ ] `/teacher/attendance` (mark for students)
- [ ] `/teacher/assignments`
- [ ] `/teacher/tests`

### Phase 7 — Credential Notifications
- [ ] `invite-notification-service.ts`
- [ ] WhatsApp template for new credentials
- [ ] Email template (optional)

### Phase 8 — Force Password Change
- [ ] `/change-password` page
- [ ] Middleware check for `must_change_password`
- [ ] API: `PATCH /api/users/change-password`

---

## 🔧 Key Technical Decisions

### Email Generation Strategy

```typescript
function generateInviteEmail(fullName: string, orgSlug: string): string {
  const nameParts = fullName.toLowerCase().trim().split(' ');
  const firstName = nameParts[0].replace(/[^a-z0-9]/g, '');
  const lastName = (nameParts[1] || 'user').replace(/[^a-z0-9]/g, '');
  const year = new Date().getFullYear();
  return `${firstName}.${lastName}.${year}@${orgSlug}.apnatuition.in`;
}
// Example: "John Doe" → "john.doe.2024@myschool.apnatuition.in"
```

### Password Generation Strategy

```typescript
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const random = Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  return `Apna@${random}`;
  // Example: "Apna@Ab3Kx9Qm"
}
```

### Using Supabase Admin to Create Users

```typescript
// IMPORTANT: This must run server-side only (API route)
// Uses the SERVICE_ROLE key (never expose to client)
const { data: authUser, error } = await supabaseAdmin.auth.admin.createUser({
  email: generatedEmail,
  password: tempPassword,
  email_confirm: true,  // skip email verification for invited users
  user_metadata: {
    full_name: fullName,
    role: role,
    organization_id: organizationId,
  }
});
```

---

## 🛡️ Security Considerations

1. **Never store plain-text passwords** — only show once in UI, never persist.
2. **`supabaseAdmin` (service role)** must only be used in server-side API routes, never in client components.
3. **RLS policies** must be updated for new tables before going live.
4. **`must_change_password` flag** enforces credential hygiene.
5. **Invite expiry** — invites expire in 7 days; expired invites should disable the auth user.
6. **Rate limiting** — consider limiting invite creation to prevent abuse.
7. **Audit log** — every invite action should write to `activity_logs`.

---

## 📅 Estimated Timeline

| Phase | Effort |
|---|---|
| Phase 1 (DB Schema) | 2–3 hours |
| Phase 2 (APIs) | 4–6 hours |
| Phase 3 (Auth/Middleware) | 2–3 hours |
| Phase 4 (Admin UI) | 4–6 hours |
| Phase 5 (Student Portal) | 6–8 hours |
| Phase 6 (Teacher Portal) | 6–8 hours |
| Phase 7 (Notifications) | 2–3 hours |
| Phase 8 (Force PW Change) | 1–2 hours |
| **Total** | **~27–39 hours** |

---

*Plan created: 2026-02-22 | Apna Tuition — RBAC Invite System v1.0*
