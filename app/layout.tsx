import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { ThemePreference } from "@/components/ThemeToggle";
import { ClerkProvider } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AI Post Gen",
    template: "%s | AI Post Gen",
  },
  description: "Workspace para criação, organização e publicação de conteúdo com inteligência artificial.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const authConfigured = isClerkConfigured();
  const shell = (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full bg-slate-950 text-slate-100">
        <ThemePreference />
        <div className="flex min-h-screen">
        <Sidebar authConfigured={authConfigured} />
        <main className="min-w-0 flex-1 bg-slate-50 pb-24 dark:bg-slate-950 md:pb-0">
          {children}
        </main>
        </div>
      </body>
    </html>
  );
  return authConfigured ? <ClerkProvider>{shell}</ClerkProvider> : shell;
}
