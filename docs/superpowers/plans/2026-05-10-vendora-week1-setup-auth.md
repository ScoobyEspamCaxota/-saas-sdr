# Vendora — Week 1: Setup + Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold Next.js 15 project with Tailwind/shadcn, wire Supabase Auth (email + Google), apply initial DB schema, protect `/app/*` routes with middleware, and deploy to Vercel. End state: user can sign up, log in, see empty dashboard, log out — on production URL.

**Architecture:** Next.js 15 App Router with TypeScript. Supabase provides auth + Postgres. Server-side auth check via `@supabase/ssr` cookie helpers. Middleware enforces auth on `/app/*`. Vercel for hosting with env vars for Supabase keys. Initial DB schema includes only `profiles` table (other tables added in later weeks).

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS 4, shadcn/ui, Supabase (Auth + Postgres), pnpm, Vercel.

**Spec ref:** `docs/superpowers/specs/2026-05-10-vendora-saas-design.md` § 9 Week 1 milestone.

**Audience:** Beginner developer. Each step has exact commands. Account creation is included.

---

## File Structure (created in this plan)

```
saas-sdr/
├── .env.local                              # Local env (gitignored)
├── .env.example                            # Template committed to git
├── .gitignore
├── README.md
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── components.json                         # shadcn config
├── middleware.ts                           # Auth route protection
├── supabase/
│   └── migrations/
│       └── 0001_profiles.sql               # Initial schema
├── src/
│   ├── app/
│   │   ├── layout.tsx                      # Root layout
│   │   ├── page.tsx                        # Landing (placeholder)
│   │   ├── globals.css
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── auth/callback/route.ts      # OAuth callback handler
│   │   └── (app)/
│   │       └── dashboard/
│   │           └── page.tsx                # Empty dashboard
│   ├── components/
│   │   └── ui/                             # shadcn components (button, input, etc.)
│   └── lib/
│       └── supabase/
│           ├── client.ts                   # Browser client
│           ├── server.ts                   # Server client (RSC + actions)
│           └── middleware.ts               # Cookie session refresh helper
└── tests/
    └── lib/
        └── supabase/
            └── middleware.test.ts          # Test session refresh logic
```

**Why this layout:**
- `(auth)` and `(app)` route groups separate public/private without affecting URL.
- `lib/supabase/` colocates the three client variants (browser/server/middleware) per Supabase SSR docs — touched together when SSR patterns change.
- Single migration file per schema change, numbered for ordering.
- `tests/` mirrors `src/` paths.

---

## Task 1: Install Prerequisites

**Files:** none (system-level installs)

- [ ] **Step 1: Verify Node.js 20+ installed**

Run (PowerShell):
```powershell
node --version
```
Expected: `v20.x.x` or higher.

If missing or older: download LTS installer from `https://nodejs.org/`, install, restart terminal, re-run.

- [ ] **Step 2: Install pnpm globally**

Run:
```powershell
npm install -g pnpm
pnpm --version
```
Expected: `9.x.x` or `10.x.x`.

- [ ] **Step 3: Verify Git installed**

Run:
```powershell
git --version
```
Expected: `git version 2.x`.

If missing: install from `https://git-scm.com/download/win`.

- [ ] **Step 4: Configure Git user (if first time)**

Run:
```powershell
git config --global user.email "kakatros40@gmail.com"
git config --global user.name "Joaor"
```

---

## Task 2: Create Service Accounts (week 1 only)

**Files:** none (browser actions). Save credentials to a password manager.

- [ ] **Step 1: Create GitHub account/repo**

Open `https://github.com/new`. Repo name: `saas-sdr`. Visibility: **Private**. Do NOT initialize with README. Click "Create repository". Note the SSH or HTTPS URL.

- [ ] **Step 2: Create Supabase account + project**

Open `https://supabase.com/dashboard/sign-up`. Sign up with GitHub.

Click "New Project":
- Name: `vendora-prod`
- Database Password: generate strong, save to password manager
- Region: **South America (São Paulo)** (`sa-east-1`)
- Plan: Free (upgrade to Pro later)

Wait ~2 min for provisioning.

Go to Project Settings → API. Save:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (KEEP SECRET — server-only)

- [ ] **Step 3: Create Vercel account**

Open `https://vercel.com/signup`. Sign up with GitHub. Authorize Vercel to read your repos.

Account creation only — we connect the repo in Task 12.

(Anthropic, Stripe, Inngest, Resend, Sentry, PostHog accounts are deferred to later week plans.)

---

## Task 3: Scaffold Next.js Project

**Files:**
- Create: `C:/Users/Joaor/Projects/saas-sdr/` (entire scaffold)

- [ ] **Step 1: Create project with `create-next-app`**

Run from `C:\Users\Joaor\Projects\` (parent dir):
```powershell
cd C:\Users\Joaor\Projects
pnpm create next-app@latest saas-sdr --typescript --tailwind --app --src-dir --import-alias "@/*" --eslint --no-turbopack
```

When prompted to install dependencies, say yes.

Expected: directory `saas-sdr/` created with `package.json`, `src/app/`, `tailwind.config.ts`, etc.

- [ ] **Step 2: Move existing spec/plan into the new project (it's already there)**

The earlier brainstorm wrote spec to `C:\Users\Joaor\Projects\saas-sdr\docs\superpowers\specs\` and this plan to `docs/superpowers/plans/`. Confirm both directories exist:
```powershell
cd C:\Users\Joaor\Projects\saas-sdr
ls docs\superpowers\specs
ls docs\superpowers\plans
```
Expected: both list one `.md` file.

- [ ] **Step 3: Verify project boots**

Run:
```powershell
pnpm dev
```
Open `http://localhost:3000`. Expected: Next.js welcome page.

Press `Ctrl+C` to stop.

---

## Task 4: Initialize Git + Push to GitHub

**Files:**
- Modify: `.gitignore` (append entries)
- Create: `.env.example`
- Create: `README.md`

- [ ] **Step 1: Verify `.gitignore` includes env files**

Open `C:\Users\Joaor\Projects\saas-sdr\.gitignore`. Confirm it contains `.env*` (next.js template includes this). If absent, append:
```
.env
.env.local
.env.*.local
```

- [ ] **Step 2: Create `.env.example`**

Create `C:\Users\Joaor\Projects\saas-sdr\.env.example` with:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 3: Create `README.md`**

Create `C:\Users\Joaor\Projects\saas-sdr\README.md`:
```markdown
# Vendora

AI SDR SaaS for Brazilian B2B SMBs. See `docs/superpowers/specs/` for design.

## Local development

1. Copy `.env.example` to `.env.local` and fill values from Supabase dashboard.
2. `pnpm install`
3. `pnpm dev`
4. Open http://localhost:3000

## Stack

Next.js 15, Supabase, Tailwind, shadcn/ui.
```

- [ ] **Step 4: First commit**

Run from `saas-sdr/`:
```powershell
git init
git add .
git commit -m "feat: initial Next.js scaffold with Tailwind + TypeScript"
```

Note: there is already a git repo here from when the spec was committed earlier. If `git init` warns "Reinitialized existing Git repository", that is fine — proceed.

- [ ] **Step 5: Push to GitHub**

Replace `<YOUR_REPO_URL>` with the URL from Task 2 Step 1:
```powershell
git branch -M main
git remote add origin <YOUR_REPO_URL>
git push -u origin main
```

If `git remote add` fails with "remote origin already exists", run `git remote set-url origin <YOUR_REPO_URL>` instead, then push.

---

## Task 5: Configure Supabase Env Vars

**Files:**
- Create: `.env.local`

- [ ] **Step 1: Copy template**

Run from `saas-sdr/`:
```powershell
Copy-Item .env.example .env.local
```

- [ ] **Step 2: Fill values**

Open `.env.local` in your editor. Paste the three Supabase values you saved in Task 2 Step 2:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Save. Confirm `.env.local` is gitignored (it should NOT appear in `git status`).

---

## Task 6: Install Supabase + Project Dependencies

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1: Install runtime deps**

Run from `saas-sdr/`:
```powershell
pnpm add @supabase/supabase-js @supabase/ssr zod
```

- [ ] **Step 2: Install dev deps for testing**

```powershell
pnpm add -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom @types/node
```

- [ ] **Step 3: Add test scripts to package.json**

Open `package.json`. Find the `"scripts"` block. Add:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "vitest --ui"
```

- [ ] **Step 4: Create `vitest.config.ts`**

Create `C:\Users\Joaor\Projects\saas-sdr\vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 5: Create test setup file**

Create `C:\Users\Joaor\Projects\saas-sdr\tests\setup.ts`:
```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 6: Verify test runner works**

Run:
```powershell
pnpm test
```
Expected: "No test files found" — that is fine. Test runner is configured.

- [ ] **Step 7: Commit**

```powershell
git add package.json pnpm-lock.yaml vitest.config.ts tests/setup.ts
git commit -m "chore: add Supabase client libs and vitest"
```

---

## Task 7: Install shadcn/ui

**Files:**
- Create: `components.json`
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/label.tsx`
- Create: `src/components/ui/card.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Initialize shadcn**

Run from `saas-sdr/`:
```powershell
pnpm dlx shadcn@latest init
```

Answer prompts:
- Style: **New York**
- Base color: **Neutral**
- CSS variables: **yes**

This writes `components.json` and updates `globals.css`.

- [ ] **Step 2: Add core components**

```powershell
pnpm dlx shadcn@latest add button input label card
```

Expected: files appear under `src/components/ui/`.

- [ ] **Step 3: Commit**

```powershell
git add components.json src/components src/app/globals.css src/lib/utils.ts
git commit -m "feat: add shadcn/ui with button, input, label, card"
```

---

## Task 8: Apply Initial DB Schema (profiles table)

**Files:**
- Create: `supabase/migrations/0001_profiles.sql`

- [ ] **Step 1: Create the migration file**

Create `C:\Users\Joaor\Projects\saas-sdr\supabase\migrations\0001_profiles.sql`:
```sql
-- Initial schema: profiles table linked to auth.users
-- Source spec: docs/superpowers/specs/2026-05-10-vendora-saas-design.md § 5

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  company_name text,
  icp_definition text,
  value_proposition text,
  plan text not null default 'free' check (plan in ('free','starter','growth','scale')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  emails_sent_this_month int not null default 0,
  trial_ends_at timestamptz,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_updated before update on profiles
  for each row execute function set_updated_at();

alter table profiles enable row level security;

create policy "own_profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Auto-create profile row on user signup
create or replace function handle_new_user() returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

- [ ] **Step 2: Apply via Supabase SQL Editor**

Open Supabase dashboard → your project → **SQL Editor** (left sidebar) → **New query**. Paste the entire content of `0001_profiles.sql`. Click **Run**.

Expected: "Success. No rows returned."

- [ ] **Step 3: Verify in Table Editor**

Supabase dashboard → **Table Editor** → confirm `profiles` table exists with columns matching the SQL.

- [ ] **Step 4: Commit**

```powershell
git add supabase/migrations/0001_profiles.sql
git commit -m "feat(db): add profiles table with RLS and auto-create trigger"
```

---

## Task 9: Create Supabase Client Helpers

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.ts`

- [ ] **Step 1: Browser client**

Create `C:\Users\Joaor\Projects\saas-sdr\src\lib\supabase\client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 2: Server client (RSC + Server Actions)**

Create `C:\Users\Joaor\Projects\saas-sdr\src\lib\supabase\server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component — setAll is a no-op outside of Server Actions/Route Handlers.
          }
        },
      },
    },
  );
}
```

- [ ] **Step 3: Middleware client (session refresh)**

Create `C:\Users\Joaor\Projects\saas-sdr\src\lib\supabase\middleware.ts`:
```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect /app/* routes
  if (
    !user &&
    (request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/campaigns') ||
      request.nextUrl.pathname.startsWith('/leads') ||
      request.nextUrl.pathname.startsWith('/settings'))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect signed-in users away from auth pages
  if (
    user &&
    (request.nextUrl.pathname === '/login' ||
      request.nextUrl.pathname === '/signup')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

- [ ] **Step 4: Commit**

```powershell
git add src/lib/supabase
git commit -m "feat(auth): add Supabase browser/server/middleware clients"
```

---

## Task 10: Wire Middleware

**Files:**
- Create: `middleware.ts` (project root)
- Test: `tests/lib/supabase/middleware.test.ts`

- [ ] **Step 1: Write failing test for protected route redirect**

Create `C:\Users\Joaor\Projects\saas-sdr\tests\lib\supabase\middleware.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Supabase ssr to control auth state
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  })),
}));

describe('updateSession', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
  });

  it('redirects unauthenticated user from /dashboard to /login', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware');
    const req = new NextRequest('http://localhost:3000/dashboard');
    const res = await updateSession(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/login');
  });

  it('allows unauthenticated user on public route', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware');
    const req = new NextRequest('http://localhost:3000/');
    const res = await updateSession(req);
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```powershell
pnpm test
```
Expected: tests run; if they fail with module-not-found, the import paths are wrong — fix them. If they pass, this verifies Task 9's middleware client already works.

If they pass: skip to Step 4. If they fail with assertion errors, continue to Step 3.

- [ ] **Step 3: Adjust middleware client if needed**

If tests assert wrong behavior, re-read `src/lib/supabase/middleware.ts` and fix the redirect logic. Re-run `pnpm test`.

- [ ] **Step 4: Create root middleware**

Create `C:\Users\Joaor\Projects\saas-sdr\middleware.ts`:
```typescript
import { updateSession } from '@/lib/supabase/middleware';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

- [ ] **Step 5: Commit**

```powershell
git add middleware.ts tests/lib/supabase/middleware.test.ts
git commit -m "feat(auth): protect /dashboard routes via middleware"
```

---

## Task 11: Build Login + Signup Pages + Logout

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/signup/page.tsx`
- Create: `src/app/(auth)/auth/callback/route.ts`
- Create: `src/app/(auth)/actions.ts`
- Create: `src/app/(app)/dashboard/page.tsx`
- Create: `src/app/(app)/dashboard/logout-button.tsx`
- Modify: `src/app/page.tsx` (landing placeholder)
- Modify: `src/app/layout.tsx` (only if metadata change needed)

- [ ] **Step 1: Server actions for auth**

Create `C:\Users\Joaor\Projects\saas-sdr\src\app\(auth)\actions.ts`:
```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const credentialsSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
});

export type AuthState = { error?: string } | undefined;

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    ...parsed.data,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });
  if (error) return { error: error.message };

  redirect('/login?message=Verifique seu email para confirmar a conta');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
```

- [ ] **Step 2: Login page**

Create `C:\Users\Joaor\Projects\saas-sdr\src\app\(auth)\login\page.tsx`:
```tsx
'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { login, type AuthState } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(login, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Entrar no Vendora</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" name="password" type="password" required autoComplete="current-password" />
            </div>
            {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? 'Entrando...' : 'Entrar'}
            </Button>
            <p className="text-center text-sm">
              Sem conta?{' '}
              <Link href="/signup" className="underline">
                Criar conta
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Signup page**

Create `C:\Users\Joaor\Projects\saas-sdr\src\app\(auth)\signup\page.tsx`:
```tsx
'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { signup, type AuthState } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SignupPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signup, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Criar conta no Vendora</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div>
              <Label htmlFor="password">Senha (mín. 8 caracteres)</Label>
              <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
            </div>
            {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? 'Criando...' : 'Criar conta'}
            </Button>
            <p className="text-center text-sm">
              Já tem conta?{' '}
              <Link href="/login" className="underline">
                Entrar
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: OAuth callback handler (used by email confirmation links)**

Create `C:\Users\Joaor\Projects\saas-sdr\src\app\(auth)\auth\callback\route.ts`:
```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=callback_failed`);
}
```

- [ ] **Step 5: Empty dashboard with logout button**

Create `C:\Users\Joaor\Projects\saas-sdr\src\app\(app)\dashboard\logout-button.tsx`:
```tsx
'use client';

import { logout } from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  return (
    <form action={logout}>
      <Button variant="outline" type="submit">
        Sair
      </Button>
    </form>
  );
}
```

Create `C:\Users\Joaor\Projects\saas-sdr\src\app\(app)\dashboard\page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from './logout-button';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="container mx-auto p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Vendora</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="mt-8">
        <p>Bem-vindo. As funcionalidades virão nas próximas semanas.</p>
      </main>
    </div>
  );
}
```

- [ ] **Step 6: Replace landing page placeholder**

Replace contents of `C:\Users\Joaor\Projects\saas-sdr\src\app\page.tsx`:
```tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <h1 className="text-4xl font-bold">Vendora</h1>
      <p className="mt-4 max-w-xl text-lg text-muted-foreground">
        Seu SDR de IA. Encontra leads, escreve email personalizado, agenda reunião — enquanto você dorme.
      </p>
      <div className="mt-8 flex gap-4">
        <Button asChild>
          <Link href="/signup">Começar grátis</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Entrar</Link>
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Run dev server and smoke test locally**

```powershell
pnpm dev
```

Open `http://localhost:3000`:
- Click "Começar grátis" → /signup. Submit with `test@example.com` + `password123`.
- Check Supabase dashboard → Authentication → Users. Confirm row appeared.
- Check Table Editor → profiles. Confirm row auto-created via trigger.
- For local testing, in Supabase dashboard go to Authentication → Settings → temporarily disable "Confirm email" (re-enable for prod). Or open the email-confirmation link from Authentication → Users → Send magic link.
- Once confirmed, log in at /login. Should redirect to /dashboard showing your email.
- Click "Sair". Should redirect to /login.
- Try visiting `/dashboard` while logged out → should redirect to /login.

If any step fails, check the browser console + terminal for errors. Common: env var mismatch, RLS blocking insert (re-check Step 8 trigger).

Stop dev server with `Ctrl+C`.

- [ ] **Step 8: Commit**

```powershell
git add src/app
git commit -m "feat(auth): login, signup, logout pages with Supabase Auth + landing"
```

---

## Task 12: Deploy to Vercel

**Files:** none (browser actions + final verification)

- [ ] **Step 1: Push latest to GitHub**

```powershell
git push origin main
```

- [ ] **Step 2: Import project in Vercel**

Open `https://vercel.com/new`. Find your `saas-sdr` repo. Click "Import".

Configure:
- Framework: Next.js (auto-detected)
- Root Directory: `./`
- Build Command: leave default (`pnpm run build`)
- Install Command: leave default

Under **Environment Variables**, add (copy values from your local `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL` — temporarily set to `https://placeholder.vercel.app`; update after deploy.

Click **Deploy**. Wait 1–3 min for build.

- [ ] **Step 3: Update `NEXT_PUBLIC_SITE_URL` and Supabase redirect URLs**

After deploy completes, copy your live URL (e.g. `https://saas-sdr-abc123.vercel.app`).

In Vercel: Settings → Environment Variables → edit `NEXT_PUBLIC_SITE_URL` to the live URL. Click **Redeploy** (Deployments tab → ⋯ on the latest → Redeploy).

In Supabase dashboard: Authentication → URL Configuration:
- Site URL: `https://saas-sdr-abc123.vercel.app`
- Redirect URLs (Add): `https://saas-sdr-abc123.vercel.app/auth/callback`

Save.

- [ ] **Step 4: Production smoke test**

Open the live URL in an incognito window:
- Sign up with a fresh email.
- Confirm email link (check inbox; link goes to your Vercel URL).
- Log in → /dashboard appears with your email.
- Log out → back to /login.
- Try `/dashboard` while logged out → redirects.

If email confirmation doesn't redirect to your Vercel domain, re-check Supabase URL Configuration in Step 3.

- [ ] **Step 5: Tag the milestone**

```powershell
git tag -a v0.1.0-week1 -m "Week 1 milestone: setup + auth shipped"
git push origin v0.1.0-week1
```

---

## Definition of Done (Week 1)

- All 12 tasks completed and committed to `main`.
- Live Vercel URL serves landing, signup, login, dashboard, logout.
- Sign up creates `auth.users` row AND `profiles` row via trigger.
- Signed-out access to `/dashboard` redirects to `/login`.
- Signed-in access to `/login` or `/signup` redirects to `/dashboard`.
- `pnpm test` passes (middleware tests).
- Git tag `v0.1.0-week1` exists on remote.

---

## What's NOT in this plan (deferred to later weeks)

- Google OAuth provider (deferred to Week 3 with Gmail OAuth)
- Onboarding wizard (Week 2)
- ICP / value prop forms (Week 2)
- All other DB tables: gmail_accounts, leads, campaigns, campaign_messages, events (added per-week as features land)
- Inngest, Anthropic, Stripe, Resend setup (Weeks 4–6)
- Sentry / PostHog (Week 6)
