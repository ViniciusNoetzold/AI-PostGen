'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PenTool, Image as ImageIcon, Users, FileText, Settings } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/ai-post-gen', label: 'AI Post Gen', icon: PenTool },
  { href: '/studio', label: 'Product Studio', icon: ImageIcon },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-slate-700/50 bg-slate-900 min-h-screen flex flex-col hidden md:flex shrink-0">
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Smart<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">.</span>CRM
        </h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => {
          // Exactly matches the path, or is a subpath (but not just '/' matching everything)
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300',
                isActive
                  ? 'bg-slate-800 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'text-pink-500')} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-6 border-t border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-pink-500/20">
            ME
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">Admin User</span>
            <span className="text-xs text-slate-400">admin@mezzold.com</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
