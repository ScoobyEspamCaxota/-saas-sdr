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
