import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { OpeningSplash } from "@/components/OpeningSplash";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"),
  applicationName: "Omni Workspace",
  title: {
    default: "Omni Workspace",
    template: "%s | Omni Workspace",
  },
  description: "Workspace omnicanal para criação, organização e publicação de conteúdo com inteligência artificial.",
  openGraph: {
    title: "Omni Workspace",
    description: "Criação, CRM, agenda e publicação de conteúdo em um só workspace.",
    images: [{ url: "/brand/omni-workspace-logo.png", width: 1200, height: 928, alt: "Omni Workspace" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const authConfigured = isClerkConfigured();
  const shell = (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full bg-slate-950 text-slate-100">
        <OpeningSplash />
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
