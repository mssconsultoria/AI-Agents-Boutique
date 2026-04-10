'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface TrialBannerProps {
  daysRemaining: number;
  onUpgradeClick?: () => void;
}

const STORAGE_KEY = 'trial-banner-dismissed';

export default function TrialBanner({ daysRemaining, onUpgradeClick }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') {
      setDismissed(true);
    }
  }, []);

  if (dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, 'true');
  }

  function handleUpgrade() {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      router.push('/pricing');
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-40 glass-panel flex items-center justify-between px-12 py-3">
      {/* Left: icon + headline + description */}
      <div className="flex items-center gap-3">
        <span className="text-xl" role="img" aria-label="Ícone de timer">
          ⏱️
        </span>
        <div className="flex flex-col">
          <span className="font-headline font-bold italic text-on-surface">
            Seu trial termina em {daysRemaining} dia{daysRemaining !== 1 ? 's' : ''}
          </span>
          <span className="text-sm text-on-surface-variant font-[Inter,sans-serif]">
            Faça upgrade agora para continuar com acesso completo
          </span>
        </div>
      </div>

      {/* Right: CTA + dismiss */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleUpgrade}
          aria-label="Fazer upgrade do plano"
          className="bg-primary text-on-primary editorial-gradient px-6 py-2 rounded-sm text-sm font-semibold transition-opacity hover:opacity-90"
        >
          Upgrade Agora
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Descartar banner de trial"
          className="text-on-surface-variant hover:text-on-surface text-sm transition-colors px-2 py-2"
        >
          Descartar
        </button>
      </div>
    </div>
  );
}
