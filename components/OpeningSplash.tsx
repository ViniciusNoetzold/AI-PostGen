'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, X } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

const FALLBACK_TIMEOUT_MS = 15_000;
const EXIT_TRANSITION_MS = 500;

export function OpeningSplash() {
  const [visible, setVisible] = useState(true);
  const [closing, setClosing] = useState(false);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(true);
  const closingRef = useRef(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    closeTimeoutRef.current = setTimeout(() => setVisible(false), EXIT_TRANSITION_MS);
  }, []);

  useEffect(() => {
    if (!visible) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      dismiss();
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const fallbackTimeout = setTimeout(dismiss, FALLBACK_TIMEOUT_MS);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(fallbackTimeout);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dismiss, visible]);

  if (!visible) return null;

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-label="Abertura do Omni Workspace"
      className={`fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-black transition-opacity duration-500 ${closing ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
    >
      <div
        className={`absolute inset-0 grid place-items-center transition-opacity duration-500 ${ready ? 'opacity-0' : 'opacity-100'}`}
        aria-hidden={ready}
      >
        <BrandLogo className="h-16 max-w-[calc(100vw-3rem)]" nameClassName="text-2xl sm:text-4xl" priority />
      </div>

      <video
        autoPlay
        muted={muted}
        playsInline
        preload="auto"
        aria-label="Vídeo de abertura do Omni Workspace"
        onCanPlay={() => setReady(true)}
        onEnded={dismiss}
        onError={dismiss}
        className={`h-full w-full object-contain transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0'}`}
      >
        <source src="/media/omni-opening.mp4" type="video/mp4" />
      </video>

      <div className="absolute right-4 top-4 flex items-center gap-2 sm:right-6 sm:top-6">
        <button
          type="button"
          onClick={() => setMuted((current) => !current)}
          aria-label={muted ? 'Ativar som da abertura' : 'Silenciar abertura'}
          className="grid size-11 place-items-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md transition hover:border-white/30 hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-black/45 px-4 text-sm font-medium text-white backdrop-blur-md transition hover:border-white/30 hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          Pular
          <X className="size-4" />
        </button>
      </div>
    </section>
  );
}
