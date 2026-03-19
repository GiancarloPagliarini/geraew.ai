'use client';

import { XCircle, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PaymentCancelPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#1a2123] px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f3f0ed]/8">
          <XCircle className="h-8 w-8 text-[#f3f0ed]/40" />
        </div>
        <h1 className="text-2xl font-bold text-[#f3f0ed]">Pagamento cancelado</h1>
        <p className="max-w-md text-sm text-[#f3f0ed]/50">
          Nenhuma cobrança foi realizada. Você pode tentar novamente quando quiser.
        </p>
      </div>
      <button
        onClick={() => router.push('/')}
        className="flex items-center gap-2 rounded-xl bg-[#f3f0ed]/8 px-6 py-3 text-sm font-bold text-[#f3f0ed] transition-all hover:bg-[#f3f0ed]/12 active:scale-[0.98]"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao editor
      </button>
    </div>
  );
}
