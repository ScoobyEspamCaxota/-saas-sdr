import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

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
