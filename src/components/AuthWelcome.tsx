import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { trySync } from "@/lib/sync";
import { useI18n } from "@/lib/i18n";

const SKIP_KEY = "sy-auth-skipped";

/** Optional first-open sign-in card with Skip — never blocks offline use. */
export function AuthWelcome() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) return;
    if (localStorage.getItem(SKIP_KEY)) return;
    let cancelled = false;
    const run = async () => {
      await new Promise((r) => setTimeout(r, 400));
      if (cancelled || !supabase) {
        if (!localStorage.getItem(SKIP_KEY)) setOpen(true);
        return;
      }
      try {
        const { data } = await supabase.auth.getSession();
        if (!cancelled && !data.session) setOpen(true);
      } catch {
        if (!cancelled) setOpen(true);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!open) return null;

  const skip = () => {
    localStorage.setItem(SKIP_KEY, "1");
    setOpen(false);
  };

  const signInEmail = async () => {
    if (!supabase) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
      else {
        toast.success(t("signedIn"));
        localStorage.setItem(SKIP_KEY, "1");
        setOpen(false);
        trySync().catch(() => {});
      }
    } finally {
      setBusy(false);
    }
  };

  const signUpEmail = async () => {
    if (!supabase) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) toast.error(error.message);
      else toast.success(t("checkEmail"));
    } finally {
      setBusy(false);
    }
  };

  const signInGoogle = async () => {
    if (!supabase) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-3xl bg-background p-5 shadow-2xl">
        <div className="mb-4 text-center">
          <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-hero text-2xl text-primary-foreground">
            🏪
          </div>
          <h2 className="text-xl font-bold">{t("welcomeTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("welcomeBody")}</p>
        </div>

        <div className="space-y-2">
          <button type="button" disabled={busy} onClick={signInGoogle} className="flex h-12 w-full items-center justify-center gap-2 rounded-full border bg-card font-semibold">
            <span className="text-lg">G</span> {t("continueGoogle")}
          </button>
          <Input type="email" placeholder={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl" />
          <Input type="password" placeholder={t("password")} value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl" />
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={busy} onClick={signInEmail} className="h-12 rounded-full bg-primary font-semibold text-primary-foreground">
              {t("signIn")}
            </button>
            <button type="button" disabled={busy} onClick={signUpEmail} className="h-12 rounded-full border font-semibold">
              {t("signUp")}
            </button>
          </div>
        </div>

        <button type="button" onClick={skip} className="mt-4 w-full py-3 text-center text-sm font-medium text-muted-foreground underline-offset-2 hover:underline">
          {t("skipForNow")}
        </button>
        <p className="mt-1 text-center text-[11px] text-muted-foreground">{t("skipHint")}</p>
      </div>
    </div>
  );
}
