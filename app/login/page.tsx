"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function LoginPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callbackError = useMemo(() => {
    if (searchParams.get("error") === "auth_failed") {
      return t.login.authFailed;
    }
    return null;
  }, [searchParams, t.login.authFailed]);

  const signInWithGoogle = async () => {
    setLoadingGoogle(true);
    setError(null);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (signInError) {
      setError(signInError.message);
      setLoadingGoogle(false);
    }
  };

  const signInWithPassword = async (event?: FormEvent) => {
    if (event) {
      event.preventDefault();
    }
    if (!email.trim() || !password) {
      setError(t.login.missingCredentialsError);
      return;
    }

    setLoadingPassword(true);
    setError(null);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoadingPassword(false);
      return;
    }

    window.location.href = "/";
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900 rounded-2xl p-10 flex flex-col items-center gap-6 shadow-xl w-full max-w-sm">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-bold text-white">{t.login.heading}</h1>
          <p className="text-gray-400 text-sm text-center">{t.login.subtitle}</p>
        </div>

        <button
          onClick={signInWithGoogle}
          disabled={loadingGoogle || loadingPassword}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-medium py-3 px-6 rounded-lg transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {loadingGoogle ? t.login.signingInButton : t.login.signInButton}
        </button>

        <div className="w-full flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-xs text-gray-500">{t.login.orDivider}</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        <form className="w-full space-y-3" onSubmit={signInWithPassword}>
          <div>
            <label className="block text-xs text-gray-400 mb-1">{t.login.emailLabel}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-white text-sm"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">{t.login.passwordLabel}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-white text-sm"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            disabled={loadingGoogle || loadingPassword}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
          >
            {loadingPassword ? t.login.signingInButton : t.login.signInWithPasswordButton}
          </button>
        </form>

        {(callbackError || error) && (
          <p className="w-full text-center text-xs text-red-400">{callbackError ?? error}</p>
        )}

        <div className="w-full border-t border-gray-800 pt-4 flex flex-col items-center gap-2">
          <p className="text-gray-500 text-xs">{t.login.noAccount}</p>
          <a
            href="/?demo=true"
            className="w-full text-center py-2 px-4 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors text-sm"
          >
            {t.login.demoButton}
          </a>
        </div>

        <p className="text-gray-600 text-xs text-center">{t.login.accessLimited}</p>

        <LanguageSwitcher isDarkMode={true} />
      </div>
    </main>
  );
}
