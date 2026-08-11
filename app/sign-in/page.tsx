import { SignIn } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/auth";
import { BrandLogo } from "@/components/BrandLogo";

export default function SignInPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 px-4 py-10">
      <div className="flex w-full max-w-md flex-col items-center gap-7">
        <BrandLogo className="h-20 w-full justify-center" nameClassName="text-3xl sm:text-4xl" priority />
        {isClerkConfigured() ? (
          <SignIn routing="hash" />
        ) : (
          <div className="w-full rounded-2xl border border-amber-500/30 bg-slate-900 p-8 text-center">
            <h1 className="text-xl font-semibold text-white">Autenticação local</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              O modo administrador local está ativo somente em localhost. Configure as chaves do Clerk antes de publicar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
