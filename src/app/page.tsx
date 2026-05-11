import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <h1 className="text-4xl font-bold">Vendora</h1>
      <p className="mt-4 max-w-xl text-lg text-muted-foreground">
        Seu SDR de IA. Encontra leads, escreve email personalizado, agenda reunião — enquanto você dorme.
      </p>
      <div className="mt-8 flex gap-4">
        <Link href="/signup" className={buttonVariants()}>
          Começar grátis
        </Link>
        <Link href="/login" className={buttonVariants({ variant: 'outline' })}>
          Entrar
        </Link>
      </div>
    </div>
  );
}
