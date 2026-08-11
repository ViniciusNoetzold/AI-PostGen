'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  CalendarDays,
  ChevronUp,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  PenTool,
  Settings,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { Show, useClerk, useUser } from '@clerk/nextjs';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { BrandLogo } from '@/components/BrandLogo';
import { saveUserProfile, useUserProfile, type UserProfile } from '@/lib/user-profile';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { href: '/', label: 'Dashboard', mobileLabel: 'Início', icon: LayoutDashboard },
  { href: '/ai-post-gen', label: 'AI Post Gen', mobileLabel: 'Posts', icon: PenTool },
  { href: '/studio', label: 'Product Studio', mobileLabel: 'Studio', icon: ImageIcon },
  { href: '/calendar', label: 'Calendário', mobileLabel: 'Agenda', icon: CalendarDays },
  { href: '/contacts', label: 'Clientes', mobileLabel: 'Clientes', icon: Users },
  { href: '/reports', label: 'Relatórios', mobileLabel: 'Relatórios', icon: FileText },
  { href: '/settings', label: 'Configurações', mobileLabel: 'Ajustes', icon: Settings },
];

interface AccountMenuProps {
  name: string;
  subtitle: string;
  avatarUrl?: string;
  onOpenProfile: () => void;
}

function AccountMenu({ name, subtitle, avatarUrl, onOpenProfile }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'ME';

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {open ? (
        <div className="absolute bottom-[calc(100%+0.75rem)] left-0 z-50 w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl shadow-black/40">
          <div className="border-b border-slate-800 px-3 py-2">
            <p className="truncate text-sm font-semibold text-white">{name}</p>
            <p className="truncate text-xs text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onOpenProfile();
            }}
            className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <UserRound className="size-4 text-pink-400" />
            Perfil e usuário
          </button>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <Settings className="size-4 text-cyan-400" />
            Configurações da aplicação
          </Link>
          <ThemeToggle
            showLabel
            className="w-full justify-start rounded-xl px-3 py-2.5 text-slate-300 hover:bg-slate-800 hover:text-white dark:text-slate-300"
          />
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex w-full items-center gap-3 rounded-xl bg-slate-900/70 p-3 text-left transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
      >
        <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-tr from-pink-500 to-cyan-500 text-xs font-bold text-white">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" fill sizes="36px" unoptimized className="object-cover" />
          ) : (
            initials
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-white">{name}</span>
          <span className="block truncate text-xs text-slate-500">{subtitle}</span>
        </span>
        <ChevronUp className={cn('size-4 shrink-0 text-slate-500 transition-transform', open && 'rotate-180')} />
      </button>
    </div>
  );
}

function LocalAccountSummary() {
  const profile = useUserProfile();
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<UserProfile>(profile);

  const openEditor = () => {
    setDraft(profile);
    setEditorOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveUserProfile({
      name: draft.name.trim(),
      role: draft.role.trim(),
      avatarUrl: draft.avatarUrl.trim(),
    });
    setEditorOpen(false);
  };

  return (
    <>
      <AccountMenu name={profile.name} subtitle={profile.role} avatarUrl={profile.avatarUrl} onOpenProfile={openEditor} />

      {editorOpen ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-dialog-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-400">Minha conta</p>
                <h2 id="profile-dialog-title" className="mt-1 text-lg font-bold text-white">Perfil do usuário</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                aria-label="Fechar edição do perfil"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </header>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4 p-5">
                <div className="flex justify-center">
                  <div className="relative size-24 overflow-hidden rounded-full border-4 border-slate-800 bg-slate-950">
                    {draft.avatarUrl ? (
                      <Image src={draft.avatarUrl} alt="Prévia da foto do perfil" fill sizes="96px" unoptimized className="object-cover" />
                    ) : (
                      <UserRound className="absolute inset-0 m-auto size-9 text-slate-500" />
                    )}
                  </div>
                </div>

                <label className="block text-sm font-medium text-slate-200">
                  Nome
                  <input
                    required
                    value={draft.name}
                    onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-200">
                  Cargo ou identificação
                  <input
                    value={draft.role}
                    onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))}
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-200">
                  URL da foto
                  <input
                    type="url"
                    required
                    value={draft.avatarUrl}
                    onChange={(event) => setDraft((current) => ({ ...current, avatarUrl: event.target.value }))}
                    placeholder="https://..."
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                  />
                </label>
              </div>
              <footer className="flex justify-end gap-3 border-t border-slate-800 bg-slate-950/40 px-5 py-4">
                <button type="button" onClick={() => setEditorOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white">
                  Cancelar
                </button>
                <button type="submit" className="rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110">
                  Salvar perfil
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

function AuthenticatedAccountSummary() {
  const { user } = useUser();
  const { openUserProfile } = useClerk();

  if (!user) return null;

  return (
    <AccountMenu
      name={user.fullName || user.username || 'Minha conta'}
      subtitle={user.primaryEmailAddress?.emailAddress || 'Perfil e sessão'}
      avatarUrl={user.imageUrl}
      onOpenProfile={() => openUserProfile()}
    />
  );
}

function AccountSummary({ authConfigured }: { authConfigured: boolean }) {
  if (!authConfigured) return <LocalAccountSummary />;

  return (
    <Show
      when="signed-in"
      fallback={<Link href="/sign-in" className="block rounded-xl bg-cyan-500 px-4 py-2.5 text-center text-sm font-semibold text-slate-950">Entrar</Link>}
    >
      <AuthenticatedAccountSummary />
    </Show>
  );
}

export function Sidebar({ authConfigured }: { authConfigured: boolean }) {
  const pathname = usePathname();

  return (
    <>
      <aside className="sticky top-0 z-40 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950 md:flex">
        <div className="px-6 pb-5 pt-7">
          <Link href="/" className="block" aria-label="Omni Workspace — ir para o dashboard">
            <BrandLogo className="h-12 w-full" nameClassName="text-lg" priority />
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3" aria-label="Navegação principal">
          {navItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-slate-800 text-white shadow-[inset_3px_0_0_#ec4899]'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                )}
              >
                <Icon className={cn('size-5', isActive && 'text-pink-400')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-5">
          <AccountSummary authConfigured={authConfigured} />
        </div>
      </aside>

      <nav
        className="fixed inset-x-3 bottom-3 z-50 flex gap-1 overflow-x-auto rounded-2xl border border-slate-700/80 bg-slate-950/95 p-2 shadow-2xl backdrop-blur md:hidden"
        aria-label="Navegação principal móvel"
      >
        {navItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              title={item.label}
              className={cn(
                'flex min-w-14 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium transition-colors',
                isActive ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'
              )}
            >
              <Icon className={cn('size-4', isActive && 'text-pink-400')} />
              <span className="max-w-16 truncate">{item.mobileLabel}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
