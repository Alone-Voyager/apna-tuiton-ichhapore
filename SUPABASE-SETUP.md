# Supabase Setup - Quick Start

## ✅ What's Already Done


- ✅ @supabase/supabase-js package installed
- ✅ Environment variables configured in `.env`
- ✅ Supabase clients created (`supabase` and `supabaseAdmin`)
- ✅ Authentication helpers ready (`auth.ts`)
- ✅ Database query utilities ready (`queries.ts`)
- ✅ TypeScript types defined (`types.ts`)
- ✅ Project builds successfully

## 🚀 Next Steps

### 1. Deploy Database Schema to Supabase

1. Go to your Supabase project: https://gvhguudtztutbxwolsxd.supabase.co
2. Navigate to **SQL Editor**
3. Run the following files in order:
   - `database/schema.sql` (creates all tables, views, functions, RLS policies)
   - `database/seed-data.sql` (optional: adds sample data)

### 2. Create Your First Admin User

After deploying the schema, create an admin account:

```sql
-- Run in Supabase SQL Editor
-- This will be your login credentials
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  'admin@example.com',
  crypt('YourSecurePassword123!', gen_salt('bf')),
  now(),
  now(),
  now()
);

-- Then create the admin profile (use the user ID from above)
INSERT INTO admin_profiles (user_id, full_name, email, role)
SELECT 
  id,
  'Admin Name',
  'admin@example.com',
  'super_admin'
FROM auth.users
WHERE email = 'admin@example.com';
```

### 3. (Optional) Regenerate Types After Schema Deployment

Once your schema is deployed, you can regenerate types for better TypeScript support:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Generate types
npx supabase gen types typescript --project-id gvhguudtztutbxwolsxd > src/lib/supabase/types-generated.ts
```

Then update `src/lib/supabase/client.ts`:

```typescript
import type { Database } from './types-generated';

export const supabase = createClient<Database>(
  // ... rest of config
);
```

### 4. Test the Connection

Create a test file `src/app/api/test-supabase/route.ts`:

```typescript
import { supabase } from '@/lib/supabase/client';

export async function GET() {
  const { data, error } = await supabase.from('classes').select('*').limit(5);
  
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  
  return Response.json({ data });
}
```

Then visit: http://localhost:3000/api/test-supabase

## 📚 Usage Examples

Check out `src/lib/supabase/README.md` for comprehensive usage examples including:
- Authentication (sign up, sign in, sign out)
- Student management
- Attendance tracking
- Fee payments
- Teacher schedules and attendance
- Dashboard stats
- Real-time subscriptions

## 🔑 Important Security Notes

1. **Never commit your `.env` file** - it contains sensitive keys
2. **Service role key** (NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) bypasses RLS - use only in server-side code
3. **Anon key** (NEXT_PUBLIC_SUPABASE_ANON_KEY) respects RLS - safe for client-side code
4. All tables have Row Level Security (RLS) enabled

## 🐛 Troubleshooting

### "relation 'admin_profiles' does not exist"
- You need to run `database/schema.sql` in your Supabase SQL Editor first

### "new row violates row-level security policy"
- Make sure you're authenticated and have an entry in `admin_profiles`
- For signup, we use `supabaseAdmin` to bypass RLS temporarily

### TypeScript errors about table types
- The types will work properly after you deploy the schema and regenerate types (step 3 above)
- For now, the clients work without strict typing

## 📖 Documentation

- [Full Supabase Setup Guide](./README.md)
- [Database Schema Documentation](../../../database/README.md)
- [Teacher Attendance Guide](../../../database/TEACHER-ATTENDANCE.md)
- [Database API Reference](../../../database/API-REFERENCE.md)

## ✨ What You Can Do Now

Even before deploying the schema, you can:
- ✅ Build the project successfully
- ✅ Use authentication methods (after schema deployment)
- ✅ Import and use query functions in your components
- ✅ Test Supabase connection

After deploying the schema, you'll have a fully functional tuition management system with:
- Student management
- Class management  
- Attendance tracking (students and teachers)
- Fee payment management
- Teacher schedules
- Notifications and inquiries
- Activity logs and analytics
