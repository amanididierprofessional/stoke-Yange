import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  getAccount,
  isLoggedIn,
  MIN_PASSWORD,
  recoverPassword,
  signIn,
  signUp,
} from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup" | "recover";
type Step = 1 | 2;

export function AuthWelcome({ onAuthed }: { onAuthed?: () => void }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<Step>(1);
  const [tab, setTab] = useState<"phone" | "email">("phone");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [business, setBusiness] = useState("");
  const [age, setAge] = useState("");
  const [busy, setBusy] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const [recoverFailed, setRecoverFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const logged = await isLoggedIn();
      if (cancelled) return;
      if (logged) {
        setOpen(false);
        onAuthed?.();
        return;
      }
      setMode("login");
      setOpen(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [onAuthed]);

  useEffect(() => {
    if (mode !== "signup") {
      setShowConfirm(false);
      return undefined;
    }
    if (password.length >= MIN_PASSWORD) {
      const tmr = setTimeout(() => setShowConfirm(true), 400);
      return () => clearTimeout(tmr);
    }
    setShowConfirm(false);
    setConfirm("");
    return undefined;
  }, [password, mode]);

  if (!open) return null;

  const progress = step === 1 ? 50 : 100;

  const goLogin = () => {
    setMode("login");
    setStep(1);
    setShowConfirm(false);
    setRecoverFailed(false);
  };
  const goSignup = () => {
    setMode("signup");
    setStep(1);
    setShowConfirm(false);
    setRecoverFailed(false);
  };
  const goRecover = async () => {
    const a = await getAccount();
    if (!a) {
      toast.message(t("needSignUp"));
      goSignup();
      return;
    }
    setMode("recover");
    setStep(2);
    setPassword("");
    setRecoverFailed(false);
  };

  const continueStep1 = async () => {
    if (!identifier.trim()) {
      toast.error(tab === "phone" ? t("phone") : t("email"));
      return;
    }
    if (password.length < MIN_PASSWORD) {
      toast.error(t("passwordMin"));
      return;
    }
    if (mode === "login") {
      setBusy(true);
      let res: Awaited<ReturnType<typeof signIn>>;
      try {
        res = await signIn({ loginType: tab, identifier, password });
      } catch (error) {
        console.error("[auth-ui] sign in failed", error);
        setBusy(false);
        toast.error("Could not finish signing in. Check your connection and try again.");
        return;
      }
      setBusy(false);
      if (!res.ok) {
        if (res.error === "no_account" || res.error === "mismatch") {
          toast.message(t("needSignUp"));
          goSignup();
          return;
        }
        if (res.error === "confirmation_required") {
          toast.error(lang === "rw"
            ? "Konti irasaba kwemeza email. Saba umuyobozi kuzimya email confirmation kugira ngo kwinjira ukoresheje telefone bikore."
            : "Supabase requires email confirmation. Phone-based sign-in needs email confirmation disabled in Supabase Auth settings.");
          return;
        }
        if (res.error === "cloud_unavailable") {
          toast.error(lang === "rw"
            ? "Serivisi yo kwinjira ntiboneka ubu. Reba internet wongere ugerageze."
            : "Sign-in service is unavailable. Check your connection and try again.");
          return;
        }
        if (res.error === "bad_password") {
          toast.error(t("badLogin"));
          toast.message(t("forgotPassword"));
          return;
        }
        toast.error(t("badLogin"));
        return;
      }
      setWelcome(true);
      setTimeout(() => {
        setOpen(false);
        onAuthed?.();
      }, 900);
      return;
    }
    if (showConfirm && confirm !== password) {
      toast.error(t("passwordMismatch"));
      return;
    }
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }
    setStep(2);
  };

  const submitProfile = async () => {
    if (!fullName.trim() || !business.trim()) {
      toast.error(t("profileRequired"));
      return;
    }
    setBusy(true);
    try {
      const res = await signUp({
        loginType: tab,
        identifier,
        password,
        fullName,
        businessName: business,
        age,
      });
      if (!res.ok) {
        if (res.error === "exists") {
          toast.message(t("needLogin"));
          goLogin();
          return;
        }
        if (res.error === "password_short") {
          toast.error(t("passwordMin"));
          setStep(1);
          return;
        }
        if (res.error === "profile") {
          toast.error(t("profileRequired"));
          return;
        }
        if (res.error === "internet_required") {
          toast.error(lang === "rw" ? "Ukeneye internet kugira ngo ufungure konti nshya." : "Connect to the internet to create your account.");
          return;
        }
        if (res.error === "cloud_unavailable") {
          toast.error(lang === "rw" ? "Konti ntishobora gufungurwa ubu. Reba internet hanyuma ugerageze nanone." : "Account creation is unavailable right now. Check your connection and try again.");
          return;
        }
        if (res.error === "confirmation_required") {
          toast.error(lang === "rw"
            ? "Konti yarakozwe ariko isaba kwemeza email. Kugira ngo kwinjira ukoresheje telefone bikore, email confirmation igomba kuzimwa muri Supabase Auth."
            : "The account was created, but Supabase requires email confirmation. Disable email confirmation in Supabase Auth for phone-based sign-in.");
          return;
        }
        // Never show "Wrong phone/email or password" on signup
        toast.error(t("signupFailed"));
        return;
      }
      setWelcome(true);
      setTimeout(() => {
        setOpen(false);
        onAuthed?.();
      }, 1000);
    } catch (error) {
      console.error("[auth-ui] sign up failed", error);
      toast.error(lang === "rw"
        ? "Konti ntishobora gufungurwa ubu. Reba internet wongere ugerageze."
        : "Couldn't create the account. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const submitRecover = async () => {
    if (password.length < MIN_PASSWORD) {
      toast.error(t("passwordMin"));
      return;
    }
    setBusy(true);
    const res = await recoverPassword({
      fullName,
      businessName: business,
      age,
      newPassword: password,
    });
    setBusy(false);
    if (!res.ok) {
      toast.error(t("verifyFail"));
      setRecoverFailed(true);
      return;
    }
    setRecoverFailed(false);
    setWelcome(true);
    setTimeout(() => {
      setOpen(false);
      onAuthed?.();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-background shadow-2xl">
        <div className="flex gap-2 px-5 pt-5">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: step >= 1 ? "100%" : "0%" }} />
          </div>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: step >= 2 || welcome ? "100%" : "0%" }} />
          </div>
        </div>
        <p className="px-5 pt-1 text-[10px] text-muted-foreground">
          {step}/2 · {progress}%
        </p>

        <div className="p-5">
          <div className="mb-4 text-center">
            <BrandLogo className="mx-auto mb-3 size-16 rounded-2xl" />
            <h2 className="text-lg font-bold">
              {welcome ? t("welcomeBtn") : mode === "recover" ? t("recoverTitle") : mode === "login" ? t("signIn") : t("signUp")}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {welcome ? "Murakaza neza! Your shop is opening…" : mode === "login" ? t("loginHint") : mode === "signup" ? t("signupHint") : t("recoverHint")}
            </p>
          </div>

          {!welcome && mode !== "recover" && (
            <div className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
              <button
                type="button"
                onClick={goLogin}
                className={cn(
                  "h-11 rounded-full text-sm font-bold transition-colors",
                  mode === "login" ? "bg-primary text-primary-foreground shadow-card" : "text-muted-foreground",
                )}
              >
                {t("signIn")}
              </button>
              <button
                type="button"
                onClick={goSignup}
                className={cn(
                  "h-11 rounded-full text-sm font-bold transition-colors",
                  mode === "signup" ? "bg-primary text-primary-foreground shadow-card" : "text-muted-foreground",
                )}
              >
                {t("signUp")}
              </button>
            </div>
          )}

          {!welcome && step === 1 && mode !== "recover" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
                {(["phone", "email"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTab(k)}
                    className={cn(
                      "h-10 rounded-full text-sm font-semibold",
                      tab === k ? "bg-card text-primary shadow-card" : "text-muted-foreground",
                    )}
                  >
                    {k === "phone" ? t("phone") : t("email")}
                  </button>
                ))}
              </div>
              <Input
                type={tab === "email" ? "email" : "tel"}
                inputMode={tab === "email" ? "email" : "tel"}
                placeholder={tab === "phone" ? t("phone") : t("email")}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="h-12 rounded-xl"
              />
              <Input
                type="password"
                placeholder={`${t("password")} (min ${MIN_PASSWORD})`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl"
              />
              {mode === "signup" && showConfirm && (
                <Input
                  type="password"
                  placeholder={t("reenterPassword")}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-12 rounded-xl"
                  autoFocus
                />
              )}
              <button
                type="button"
                disabled={busy}
                onClick={continueStep1}
                className={cn(
                  "h-12 w-full rounded-full font-semibold text-primary-foreground transition-colors",
                  welcome ? "bg-success" : "bg-primary",
                )}
              >
                {busy ? (lang === "rw" ? "Birimo kwinjira…" : "Signing in…") : mode === "login" ? t("signIn") : t("continue")}
              </button>
              {mode === "login" && !busy && (
                <button type="button" className="w-full text-center text-xs font-medium text-primary" onClick={goRecover}>
                  {t("forgotPassword")}
                </button>
              )}
            </div>
          )}

          {(step === 2 || mode === "recover") && !welcome && (
            <div className="space-y-3">
              <Input placeholder={t("fullName")} value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-12 rounded-xl" />
              <Input placeholder={t("businessName")} value={business} onChange={(e) => setBusiness(e.target.value)} className="h-12 rounded-xl" />
              <Input type="number" inputMode="numeric" placeholder={t("age")} value={age} onChange={(e) => setAge(e.target.value)} className="h-12 rounded-xl" />
              {mode === "recover" && (
                <Input type="password" placeholder={t("newPassword")} value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl" />
              )}
              <button
                type="button"
                disabled={busy}
                onClick={mode === "recover" ? submitRecover : submitProfile}
                className="h-12 w-full rounded-full bg-primary font-semibold text-primary-foreground"
              >
                {busy
                  ? (mode === "recover"
                    ? (lang === "rw" ? "Birimo kuvugurura..." : "Updating password…")
                    : (lang === "rw" ? "Birimo gufungura konti..." : "Creating account…"))
                  : t("submit")}
              </button>
              {mode === "recover" && (
                <button type="button" className="w-full text-xs text-muted-foreground" onClick={goLogin}>
                  {t("signIn")}
                </button>
              )}
              {recoverFailed && (
                <p className="pt-1 text-center text-[11px] text-muted-foreground">
                  {t("contactDev")}{" "}
                  <a href="tel:0796919900" className="underline">
                    0796919900
                  </a>
                  {" · "}
                  <a href="https://wa.me/250796919900" target="_blank" rel="noreferrer" className="underline">
                    WhatsApp
                  </a>
                </p>
              )}
            </div>
          )}

          {welcome && (
            <div className="flex flex-col items-center gap-3 py-5" role="status" aria-live="polite">
              <div className="rounded-full bg-primary/10 p-4"><PremiumDots /></div>
              <p className="text-sm font-semibold text-foreground">Murakaza neza!</p>
              <p className="text-center text-xs text-muted-foreground">Your shop is ready. Taking you in now.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function PremiumDots({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center justify-center gap-1.5" aria-label={label ?? "Loading"}>
      {[0, 1, 2, 3].map((dot) => (
        <span key={dot} className="sy-loading-dot" style={{ animationDelay: `${dot * 140}ms` }} />
      ))}
      {label && <span className="ml-2">{label}</span>}
    </span>
  );
}
