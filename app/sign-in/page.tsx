import { SignIn } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/auth";

export default function SignInPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 px-4">
      {isClerkConfigured() ? (
        <SignIn routing="hash" />
      ) : (
        <div className="max-w-md rounded-2xl border border-amber-500/30 bg-slate-900 p-8 text-center">
          <h1 className="text-xl font-semibold text-white">Autenticação local</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            O modo administrador local está ativo somente em localhost. Configure as chaves do Clerk antes de publicar.
          </p>
        </div>
      )}
    </div>
  );
}
