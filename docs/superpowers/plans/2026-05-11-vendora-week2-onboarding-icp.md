# Vendora — Week 2: Onboarding + ICP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A 3-step onboarding wizard captures `company_name`, `icp_definition`, `value_proposition` and stamps `onboarding_completed_at` on the profile. Users without onboarding completed are forced into the wizard. `/settings` lets users edit any of the three fields later.

**Architecture:** Server-rendered wizard at `/onboarding` with 3 steps tracked by URL search param `?step=1|2|3`. Each step submits a Server Action that updates the user's `profiles` row. The middleware (already in place from Week 1) gains a redirect rule: authenticated users hitting `/dashboard` without `onboarding_completed_at` go to `/onboarding`; users with it set who hit `/onboarding` go to `/dashboard`. Profile reads are centralized in `src/lib/profile.ts`.

**Tech Stack:** Next.js 16, Supabase Postgres, Supabase Auth (already set up Week 1), shadcn/ui (Card, Input, Label, Button, Textarea — Textarea added this week), Zod, Vitest.

**Spec ref:** `docs/superpowers/specs/2026-05-10-vendora-saas-design.md` § 9 Week 2 milestone.

**Audience:** Beginner developer; same style as Week 1 plan — exact commands, full code blocks.

**Prerequisite:** Week 1 plan complete and tagged `v0.1.0-week1`. Local `pnpm dev` works. Production deploy live at `https://saas-sdr.vercel.app`.

---

## File Structure (created or modified in this plan)

```
saas-sdr/
├── src/
│   ├── lib/
│   │   ├── supabase/...                       (no changes)
│   │   └── profile.ts                         # NEW: getProfile, updateProfile, requireProfile helpers
│   ├── components/
│   │   └── ui/
│   │       └── textarea.tsx                   # NEW: shadcn add
│   ├── app/
│   │   ├── (app)/
│   │   │   ├── onboarding/
│   │   │   │   ├── page.tsx                   # NEW: wizard host (server component)
│   │   │   │   ├── step-form.tsx              # NEW: client form per step
│   │   │   │   └── actions.ts                 # NEW: saveStep1/2/3 + complete
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx                   # NEW: edit form (server component)
│   │   │   │   └── actions.ts                 # NEW: updateSettings server action
│   │   │   └── dashboard/
│   │   │       └── page.tsx                   # MODIFIED: show ICP / value prop snippet
│   │   └── (auth)/
│   │       └── actions.ts                     # MODIFIED: post-login redirect respects onboarding state
│   └── lib/supabase/middleware.ts             # MODIFIED: enforce onboarding redirect
└── tests/
    └── lib/
        ├── supabase/middleware.test.ts        # MODIFIED: add onboarding redirect cases
        └── profile.test.ts                    # NEW: profile helper tests
```

**Why this layout:**
- `(app)/onboarding/` and `(app)/settings/` are siblings of `dashboard/` so they share the protected route group (already enforced by middleware).
- `src/lib/profile.ts` centralizes DB reads for the profile so middleware, dashboard, settings, and onboarding all use the same helper — single point to mock in tests.
- Server actions colocated with the page that uses them (`actions.ts` per route).

---

## Task 1: Add `textarea` shadcn component

**Files:**
- Create: `src/components/ui/textarea.tsx` (via shadcn CLI)

- [ ] **Step 1: Add textarea**

```powershell
cd C:\Users\Joaor\Projects\saas-sdr
pnpm dlx shadcn@latest add textarea --yes
```

Expected: file `src/components/ui/textarea.tsx` created.

- [ ] **Step 2: Commit**

```powershell
git add src/components/ui/textarea.tsx package.json pnpm-lock.yaml
git -c user.email=kakatros40@gmail.com -c user.name=Joaor commit -m "feat(ui): add shadcn textarea"
```

(If `package.json`/`pnpm-lock.yaml` weren't modified, drop them from the add list.)

---

## Task 2: Profile helper module + tests

**Files:**
- Create: `src/lib/profile.ts`
- Create: `tests/lib/profile.test.ts`

- [ ] **Step 1: Write failing test**

Create `C:\Users\Joaor\Projects\saas-sdr\tests\lib\profile.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockMaybeSingle = vi.fn();
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
const mockFrom = vi.fn(() => ({ select: mockSelect, update: mockUpdate }));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123', email: 't@e.com' } },
      }),
    },
  })),
}));

describe('profile helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getProfile returns the profile row for the current user', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: 'user-123', company_name: 'Acme', onboarding_completed_at: null },
      error: null,
    });
    const { getProfile } = await import('@/lib/profile');
    const profile = await getProfile();
    expect(profile?.id).toBe('user-123');
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockEq).toHaveBeenCalledWith('id', 'user-123');
  });

  it('getProfile returns null when no user is signed in', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      from: mockFrom,
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    });
    const { getProfile } = await import('@/lib/profile');
    const profile = await getProfile();
    expect(profile).toBeNull();
  });

  it('updateProfile patches the row for the current user', async () => {
    const { updateProfile } = await import('@/lib/profile');
    await updateProfile({ company_name: 'Acme Inc.' });
    expect(mockUpdate).toHaveBeenCalledWith({ company_name: 'Acme Inc.' });
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```powershell
pnpm test tests/lib/profile.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/profile'`.

- [ ] **Step 3: Implement helper**

Create `C:\Users\Joaor\Projects\saas-sdr\src\lib\profile.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';

export type Profile = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  icp_definition: string | null;
  value_proposition: string | null;
  plan: 'free' | 'starter' | 'growth' | 'scale';
  billing_customer_id: string | null;
  billing_subscription_id: string | null;
  emails_sent_this_month: number;
  trial_ends_at: string | null;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileUpdate = Partial<
  Pick<
    Profile,
    | 'full_name'
    | 'company_name'
    | 'icp_definition'
    | 'value_proposition'
    | 'onboarding_completed_at'
  >
>;

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

export async function updateProfile(patch: ProfileUpdate): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
  if (error) throw error;
}
```

- [ ] **Step 4: Run tests to verify pass**

```powershell
pnpm test tests/lib/profile.test.ts
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/profile.ts tests/lib/profile.test.ts
git -c user.email=kakatros40@gmail.com -c user.name=Joaor commit -m "feat(profile): add profile read/update helpers with tests"
```

---

## Task 3: Middleware enforces onboarding

**Files:**
- Modify: `src/lib/supabase/middleware.ts`
- Modify: `tests/lib/supabase/middleware.test.ts`

The middleware currently redirects unauthenticated users away from app routes. We add: an authenticated user with `onboarding_completed_at IS NULL` who hits `/dashboard|/campaigns|/leads|/settings` is redirected to `/onboarding`. An authenticated user with `onboarding_completed_at` set who hits `/onboarding` is redirected to `/dashboard`.

- [ ] **Step 1: Extend the existing test file with new cases**

Open `C:\Users\Joaor\Projects\saas-sdr\tests\lib\supabase\middleware.test.ts` and REPLACE the file contents with:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const getUserMock = vi.fn();
const maybeSingleMock = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: getUserMock },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: maybeSingleMock })),
      })),
    })),
  })),
}));

describe('updateSession', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    getUserMock.mockReset();
    maybeSingleMock.mockReset();
  });

  it('redirects unauthenticated user from /dashboard to /login', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } });
    const { updateSession } = await import('@/lib/supabase/middleware');
    const req = new NextRequest('http://localhost:3000/dashboard');
    const res = await updateSession(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/login');
  });

  it('allows unauthenticated user on public route', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } });
    const { updateSession } = await import('@/lib/supabase/middleware');
    const req = new NextRequest('http://localhost:3000/');
    const res = await updateSession(req);
    expect(res.status).toBe(200);
  });

  it('redirects authenticated user without onboarding from /dashboard to /onboarding', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: { id: 'u1' } } });
    maybeSingleMock.mockResolvedValueOnce({
      data: { onboarding_completed_at: null },
      error: null,
    });
    const { updateSession } = await import('@/lib/supabase/middleware');
    const req = new NextRequest('http://localhost:3000/dashboard');
    const res = await updateSession(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/onboarding');
  });

  it('redirects authenticated user with onboarding done from /onboarding to /dashboard', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: { id: 'u1' } } });
    maybeSingleMock.mockResolvedValueOnce({
      data: { onboarding_completed_at: '2026-01-01T00:00:00Z' },
      error: null,
    });
    const { updateSession } = await import('@/lib/supabase/middleware');
    const req = new NextRequest('http://localhost:3000/onboarding');
    const res = await updateSession(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });
});
```

- [ ] **Step 2: Run test to confirm new cases fail**

```powershell
pnpm test tests/lib/supabase/middleware.test.ts
```

Expected: 2 of 4 fail (the new onboarding-related cases).

- [ ] **Step 3: Update middleware**

Open `C:\Users\Joaor\Projects\saas-sdr\src\lib\supabase\middleware.ts` and REPLACE its contents with:

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ['/dashboard', '/campaigns', '/leads', '/settings'];
const AUTH_PAGES = ['/login', '/signup'];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

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
  const pathname = request.nextUrl.pathname;

  if (!user && (isProtected(pathname) || pathname === '/onboarding')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && AUTH_PAGES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  if (user && (isProtected(pathname) || pathname === '/onboarding')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed_at')
      .eq('id', user.id)
      .maybeSingle();

    const onboardingDone = Boolean(profile?.onboarding_completed_at);

    if (!onboardingDone && pathname !== '/onboarding') {
      const url = request.nextUrl.clone();
      url.pathname = '/onboarding';
      return NextResponse.redirect(url);
    }

    if (onboardingDone && pathname === '/onboarding') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
```

- [ ] **Step 4: Run tests to verify all pass**

```powershell
pnpm test tests/lib/supabase/middleware.test.ts
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/supabase/middleware.ts tests/lib/supabase/middleware.test.ts
git -c user.email=kakatros40@gmail.com -c user.name=Joaor commit -m "feat(auth): middleware redirects to /onboarding when profile incomplete"
```

---

## Task 4: Onboarding wizard pages + actions

**Files:**
- Create: `src/app/(app)/onboarding/page.tsx`
- Create: `src/app/(app)/onboarding/step-form.tsx`
- Create: `src/app/(app)/onboarding/actions.ts`

The wizard is server-rendered. The step is read from `?step=` (defaults to 1). Each form posts to a server action that writes the relevant fields and redirects to the next step. The final step also stamps `onboarding_completed_at`.

- [ ] **Step 1: Create server actions**

Create `C:\Users\Joaor\Projects\saas-sdr\src\app\(app)\onboarding\actions.ts`:

```typescript
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { updateProfile } from '@/lib/profile';

export type WizardState = { error?: string } | undefined;

const step1Schema = z.object({
  company_name: z.string().min(2, 'Informe o nome da empresa'),
});

const step2Schema = z.object({
  icp_definition: z
    .string()
    .min(20, 'Descreva o ICP com pelo menos 20 caracteres'),
});

const step3Schema = z.object({
  value_proposition: z
    .string()
    .min(20, 'Descreva a proposta de valor com pelo menos 20 caracteres'),
});

export async function saveStep1(_prev: WizardState, formData: FormData): Promise<WizardState> {
  const parsed = step1Schema.safeParse({ company_name: formData.get('company_name') });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await updateProfile({ company_name: parsed.data.company_name });
  revalidatePath('/onboarding');
  redirect('/onboarding?step=2');
}

export async function saveStep2(_prev: WizardState, formData: FormData): Promise<WizardState> {
  const parsed = step2Schema.safeParse({ icp_definition: formData.get('icp_definition') });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await updateProfile({ icp_definition: parsed.data.icp_definition });
  revalidatePath('/onboarding');
  redirect('/onboarding?step=3');
}

export async function saveStep3(_prev: WizardState, formData: FormData): Promise<WizardState> {
  const parsed = step3Schema.safeParse({ value_proposition: formData.get('value_proposition') });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await updateProfile({
    value_proposition: parsed.data.value_proposition,
    onboarding_completed_at: new Date().toISOString(),
  });
  revalidatePath('/', 'layout');
  redirect('/dashboard');
}
```

- [ ] **Step 2: Create the client step form**

Create `C:\Users\Joaor\Projects\saas-sdr\src\app\(app)\onboarding\step-form.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import type { WizardState } from './actions';
import { Button } from '@/components/ui/button';

type Action = (state: WizardState, formData: FormData) => Promise<WizardState>;

export function StepForm({
  action,
  submitLabel,
  children,
}: {
  action: Action;
  submitLabel: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState<WizardState, FormData>(action, undefined);
  return (
    <form action={formAction} className="space-y-4">
      {children}
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Salvando...' : submitLabel}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Create the wizard page**

Create `C:\Users\Joaor\Projects\saas-sdr\src\app\(app)\onboarding\page.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { saveStep1, saveStep2, saveStep3 } from './actions';
import { StepForm } from './step-form';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  const requested = Number((await searchParams).step ?? '1');
  const step = Math.max(1, Math.min(3, isNaN(requested) ? 1 : requested));

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Onboarding — passo {step} de 3</CardTitle>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <StepForm action={saveStep1} submitLabel="Continuar">
              <div>
                <Label htmlFor="company_name">Nome da empresa</Label>
                <Input
                  id="company_name"
                  name="company_name"
                  defaultValue={profile.company_name ?? ''}
                  required
                  autoFocus
                />
              </div>
            </StepForm>
          )}
          {step === 2 && (
            <StepForm action={saveStep2} submitLabel="Continuar">
              <div>
                <Label htmlFor="icp_definition">
                  ICP (perfil de cliente ideal)
                </Label>
                <Textarea
                  id="icp_definition"
                  name="icp_definition"
                  rows={6}
                  defaultValue={profile.icp_definition ?? ''}
                  placeholder="Ex: agências de marketing digital com 5-50 funcionários no Brasil que vendem para PMEs..."
                  required
                  autoFocus
                />
              </div>
            </StepForm>
          )}
          {step === 3 && (
            <StepForm action={saveStep3} submitLabel="Concluir">
              <div>
                <Label htmlFor="value_proposition">Proposta de valor</Label>
                <Textarea
                  id="value_proposition"
                  name="value_proposition"
                  rows={6}
                  defaultValue={profile.value_proposition ?? ''}
                  placeholder="Ex: ajudamos agências a fechar 3 reuniões qualificadas por semana sem contratar SDR..."
                  required
                  autoFocus
                />
              </div>
            </StepForm>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Type-check + build smoke test**

```powershell
npx tsc --noEmit
pnpm build
```

Expected: zero TS errors. Build succeeds. New routes appear: `ƒ /onboarding`.

If `Textarea` is not found, run Task 1 first.

- [ ] **Step 5: Commit**

```powershell
git add "src/app/(app)/onboarding"
git -c user.email=kakatros40@gmail.com -c user.name=Joaor commit -m "feat(onboarding): 3-step wizard for company, ICP, value proposition"
```

---

## Task 5: Settings page (edit later)

**Files:**
- Create: `src/app/(app)/settings/page.tsx`
- Create: `src/app/(app)/settings/actions.ts`
- Create: `src/app/(app)/settings/settings-form.tsx`

- [ ] **Step 1: Server action**

Create `C:\Users\Joaor\Projects\saas-sdr\src\app\(app)\settings\actions.ts`:

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { updateProfile } from '@/lib/profile';

export type SettingsState = { error?: string; ok?: boolean } | undefined;

const schema = z.object({
  company_name: z.string().min(2, 'Informe o nome da empresa'),
  icp_definition: z.string().min(20, 'ICP precisa de pelo menos 20 caracteres'),
  value_proposition: z
    .string()
    .min(20, 'Proposta de valor precisa de pelo menos 20 caracteres'),
});

export async function updateSettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const parsed = schema.safeParse({
    company_name: formData.get('company_name'),
    icp_definition: formData.get('icp_definition'),
    value_proposition: formData.get('value_proposition'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await updateProfile(parsed.data);
  revalidatePath('/settings');
  revalidatePath('/dashboard');
  return { ok: true };
}
```

- [ ] **Step 2: Client form**

Create `C:\Users\Joaor\Projects\saas-sdr\src\app\(app)\settings\settings-form.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import { updateSettings, type SettingsState } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function SettingsForm({
  defaults,
}: {
  defaults: {
    company_name: string;
    icp_definition: string;
    value_proposition: string;
  };
}) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    updateSettings,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="company_name">Nome da empresa</Label>
        <Input
          id="company_name"
          name="company_name"
          defaultValue={defaults.company_name}
          required
        />
      </div>
      <div>
        <Label htmlFor="icp_definition">ICP</Label>
        <Textarea
          id="icp_definition"
          name="icp_definition"
          rows={6}
          defaultValue={defaults.icp_definition}
          required
        />
      </div>
      <div>
        <Label htmlFor="value_proposition">Proposta de valor</Label>
        <Textarea
          id="value_proposition"
          name="value_proposition"
          rows={6}
          defaultValue={defaults.value_proposition}
          required
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-700">Salvo.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Salvando...' : 'Salvar'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Settings page**

Create `C:\Users\Joaor\Projects\saas-sdr\src\app\(app)\settings\page.tsx`:

```tsx
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { SettingsForm } from './settings-form';

export default async function SettingsPage() {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>
          Voltar
        </Link>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Empresa, ICP e proposta</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm
            defaults={{
              company_name: profile.company_name ?? '',
              icp_definition: profile.icp_definition ?? '',
              value_proposition: profile.value_proposition ?? '',
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

```powershell
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```powershell
git add "src/app/(app)/settings"
git -c user.email=kakatros40@gmail.com -c user.name=Joaor commit -m "feat(settings): edit page for company / ICP / value proposition"
```

---

## Task 6: Dashboard shows ICP/value snippet + settings link

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Replace dashboard contents**

Open `C:\Users\Joaor\Projects\saas-sdr\src\app\(app)\dashboard\page.tsx` and REPLACE its contents with:

```tsx
import Link from 'next/link';
import { getProfile } from '@/lib/profile';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogoutButton } from './logout-button';

export default async function DashboardPage() {
  const profile = await getProfile();

  return (
    <div className="container mx-auto p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Vendora</h1>
        <div className="flex items-center gap-4">
          <Link href="/settings" className={buttonVariants({ variant: 'outline' })}>
            Configurações
          </Link>
          <LogoutButton />
        </div>
      </header>

      <main className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{profile?.company_name ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>ICP</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{profile?.icp_definition ?? '—'}</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Proposta de valor</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{profile?.value_proposition ?? '—'}</p>
          </CardContent>
        </Card>
      </main>

      <p className="mt-8 text-sm text-muted-foreground">
        Próximas semanas: importar leads e gerar campanhas.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Build to confirm everything compiles together**

```powershell
pnpm build
```

Expected: build succeeds, routes include `ƒ /dashboard`, `ƒ /onboarding`, `ƒ /settings`.

- [ ] **Step 3: Commit**

```powershell
git add "src/app/(app)/dashboard/page.tsx"
git -c user.email=kakatros40@gmail.com -c user.name=Joaor commit -m "feat(dashboard): show ICP/value summary + link to settings"
```

---

## Task 7: Smoke test, push, tag

- [ ] **Step 1: Run all tests**

```powershell
pnpm test
```

Expected: all tests pass (middleware × 4, profile × 3 = 7 total).

- [ ] **Step 2: Local smoke test**

```powershell
pnpm dev
```

Open `http://localhost:3000` in an incognito window:

1. Sign up with a fresh email + password.
2. Should land on `/onboarding?step=1` (NOT /dashboard) because `onboarding_completed_at` is null. If you instead land on `/dashboard`, the middleware redirect didn't fire — debug.
3. Fill company name → Continuar → step 2.
4. Fill ICP (≥ 20 chars) → Continuar → step 3.
5. Fill value proposition (≥ 20 chars) → Concluir → `/dashboard`.
6. Dashboard shows the three cards filled in.
7. Click **Configurações** → `/settings` shows pre-filled form. Edit ICP, click Salvar → see "Salvo." Reload → value persisted.
8. Manually navigate to `/onboarding` → should redirect to `/dashboard` (because completed).
9. Click **Sair** → `/login`. Try `/dashboard` → redirects to `/login`. Try `/onboarding` → also redirects to `/login`.

If any step fails, read the terminal output for errors.

Stop dev server (Ctrl+C).

- [ ] **Step 3: Push and tag**

```powershell
git push origin main
git -c user.email=kakatros40@gmail.com -c user.name=Joaor tag -a v0.2.0-week2 -m "Week 2 milestone: onboarding + ICP wizard"
git push origin v0.2.0-week2
```

- [ ] **Step 4: Production smoke test**

Wait ~2 min for Vercel auto-deploy. Open `https://saas-sdr.vercel.app/` in incognito.
Repeat steps 1–9 from local smoke test on prod URL.

If anything breaks on prod but worked locally, check Vercel deploy logs first (most likely env var or Supabase URL config issue).

---

## Definition of Done (Week 2)

- All 7 tasks committed to `main`.
- `pnpm test` passes (7 tests).
- Brand new signup is forced through `/onboarding` and cannot reach `/dashboard` until all 3 steps are completed.
- Completed user hitting `/onboarding` is bounced to `/dashboard`.
- `/settings` saves edits to all three fields and they persist.
- Dashboard shows current company / ICP / value proposition.
- Production deploy at `https://saas-sdr.vercel.app/` passes the smoke test.
- Git tag `v0.2.0-week2` exists on remote.

---

## What's NOT in this plan (deferred)

- Google OAuth (Week 3 with Gmail)
- Lead CSV upload (Week 3)
- Gmail OAuth (Week 3)
- Plan / billing fields shown anywhere (Week 6)
- Onboarding "back" button (could be added but YAGNI for MVP — users can hit browser back)
- Step indicator UI (numbered breadcrumb) — text "passo X de 3" is sufficient for MVP
