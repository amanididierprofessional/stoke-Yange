import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  completePasswordRecovery,
  isLoggedIn,
  isRecoveryHash,
  MIN_PASSWORD,
  recoverPassword,
  requestEmailOtp,
  signIn,
  signUp,
  verifyEmailOtpAndSetPassword,
} from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup" | "recover";
type Step = 1 | 2;
/** recover sub-steps for email OTP */
type RecoverPhase = "identify" | "otp" | "link_password";

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
  const [busy, setBusy] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const [welcomeKind, setWelcomeKind] = useState<"login" | "signup" | "recover">("login");
  const [recoveryMode, setRecoveryMode] = useState<"email" | "local" | "otp_sent">("email");
  const [recoverPhase, setRecoverPhase] = useState<RecoverPhase>("identify");
  const [otpCode, setOtpCode] = useState("");
  const [localRecoveryNeedsPassword, setLocalRecoveryNeedsPassword] = useState(false);
  const [recoverFailed, setRecoverFailed] = useState(false);

  useEffect(() => {
    if (isRecoveryHash()) {
      setMode("recover");
      setStep(2);
      setRecoverPhase("link_password");
      setOpen(true);
    }

    const { data: sub } = supabase?.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("recover");
        setStep(2);
        setRecoverPhase("link_password");
        setOpen(true);
        setWelcome(false);
      }
    }) ?? { data: { subscription: { unsubscribe: () => {} } } };

    let cancelled = false;
    (async () => {
      if (isRecoveryHash()) return;
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
      sub.subscription.unsubscribe();
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
    setRecoverPhase("identify");
    setOtpCode("");
    setWelcome(false);
  };
  const goSignup = () => {
    setMode("signup");
    setStep(1);
    setShowConfirm(false);
    setRecoverFailed(false);
  };
  const goRecover = () => {
    setMode("recover");
    setStep(2);
    setPassword("");
    setFullName("");
    setBusiness("");
    setOtpCode("");
    setRecoverFailed(false);
    setRecoverPhase("identify");
    setLocalRecoveryNeedsPassword(false);
    setWelcome(false);
  };

  const continueStep1 = async () => {
    if (mode === "signup" && step === 1) {
      if (!business.trim() || !fullName.trim()) {
        toast.error(t("profileRequired"));
        return;
      }
      setStep(2);
      return;
    }
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
        toast.error(lang === "rw" ? "Kwinjira byanze. Reba internet." : "Could not sign in. Check connection.");
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
          toast.error(
            lang === "rw"
              ? "Konti irasaba kwemeza email. Muri Supabase Auth: zima Confirm email."
              : "Email confirmation is required. Disable Confirm email in Supabase Auth.",
          );
          return;
        }
        if (res.error === "cloud_unavailable") {
          toast.error(lang === "rw" ? "Serivisi ntiboneka." : "Sign-in service unavailable.");
          return;
        }
        toast.error(t("badLogin"));
        return;
      }
      setWelcomeKind("login");
      setWelcome(true);
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
    if (!identifier.trim()) {
      toast.error(tab === "phone" ? t("phone") : t("email"));
      return;
    }
    if (password.length < MIN_PASSWORD) {
      toast.error(t("passwordMin"));
      return;
    }
    if (showConfirm && confirm !== password) {
      toast.error(t("passwordMismatch"));
      return;
    }
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
        age: "",
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
          toast.error(lang === "rw" ? "Ukeneye internet." : "Internet required.");
          return;
        }
        if (res.error === "cloud_unavailable") {
          toast.error(lang === "rw" ? "Konti ntishobora gufungurwa." : "Could not create account.");
          return;
        }
        if (res.error === "confirmation_required") {
          toast.error(
            lang === "rw"
              ? "Zima email confirmation muri Supabase Auth."
              : "Disable email confirmation in Supabase Auth.",
          );
          return;
        }
        toast.error(t("signupFailed"));
        return;
      }
      setWelcomeKind("signup");
      setWelcome(true);
    } catch (error) {
      console.error("[auth-ui] sign up failed", error);
      toast.error(lang === "rw" ? "Konti ntishobora gufungurwa." : "Couldn't create the account.");
    } finally {
      setBusy(false);
    }
  };

  const submitRecover = async () => {
    // Recovery link from email → set new password
    if (recoverPhase === "link_password") {
      if (password.length < MIN_PASSWORD) {
        toast.error(t("passwordMin"));
        return;
      }
      setBusy(true);
      const result = await completePasswordRecovery(password);
      setBusy(false);
      if (!result.ok) {
        toast.error(lang === "rw" ? "Ijambo ntiryahinduwe." : "Password could not be changed.");
        setRecoverFailed(true);
        return;
      }
      try {
        history.replaceState(null, "", window.location.pathname);
      } catch {
        /* */
      }
      setWelcomeKind("recover");
      setRecoveryMode("local");
      setWelcome(true);
      return;
    }

    // Email OTP: user entered code + new password
    if (recoverPhase === "otp" && tab === "email") {
      if (otpCode.trim().length < 4) {
        toast.error(lang === "rw" ? "Andika kode yo muri email." : "Enter the code from your email.");
        return;
      }
      if (password.length < MIN_PASSWORD) {
        toast.error(t("passwordMin"));
        return;
      }
      setBusy(true);
      const res = await verifyEmailOtpAndSetPassword({
        email: identifier,
        token: otpCode,
        newPassword: password,
      });
      setBusy(false);
      if (!res.ok) {
        if (res.error === "bad_code") {
          toast.error(lang === "rw" ? "Kode ntabwo ariyo cyangwa yararenze." : "Wrong or expired code.");
        } else if (res.error === "password_short") {
          toast.error(t("passwordMin"));
        } else {
          toast.error(lang === "rw" ? "Byanze. Ongera ugerageze." : "Could not reset password.");
        }
        setRecoverFailed(true);
        return;
      }
      setWelcomeKind("recover");
      setRecoveryMode("local");
      setWelcome(true);
      return;
    }

    // Identify phase
    if (!identifier.trim()) {
      toast.error(tab === "phone" ? t("phone") : t("email"));
      return;
    }

    if (tab === "email") {
      setBusy(true);
      const sent = await requestEmailOtp(identifier);
      setBusy(false);
      if (!sent.ok) {
        toast.error(
          sent.error === "internet_required"
            ? lang === "rw"
              ? "Ukeneye internet."
              : "Connect to the internet."
            : lang === "rw"
              ? "Ntidushoboye kohereza kode. Reba email cyangwa twandikire."
              : "Could not send a code. Check the email or contact support.",
        );
        setRecoverFailed(true);
        return;
      }
      setRecoverPhase("otp");
      setRecoveryMode("otp_sent");
      toast.success(
        lang === "rw"
          ? "Reba email yawe — twakohereje kode cyangwa link."
          : "Check your email — we sent a code or recovery link.",
      );
      return;
    }

    // Phone recovery
    if (!fullName.trim() || !business.trim()) {
      toast.error(
        lang === "rw"
          ? "Andika amazina n'izina ry'iduka."
          : "Enter your full name and business name.",
      );
      return;
    }
    if (localRecoveryNeedsPassword && password.length < MIN_PASSWORD) {
      toast.error(t("passwordMin"));
      return;
    }
    setBusy(true);
    const res = await recoverPassword({
      loginType: "phone",
      identifier,
      fullName,
      businessName: business,
      newPassword: password || undefined,
    });
    setBusy(false);
    if (!res.ok) {
      if (res.error === "password_short") {
        setLocalRecoveryNeedsPassword(true);
        toast.message(lang === "rw" ? "Andika ijambo ry'ibanga rishya." : "Enter a new password.");
        return;
      }
      if (res.error === "phone_support") {
        toast.error(
          lang === "rw"
            ? "Kugarura konti ya telefone bisaba ubufasha. Twandikire kuri WhatsApp."
            : "Phone account recovery needs support. Contact us on WhatsApp.",
        );
        setRecoverFailed(true);
        return;
      }
      toast.error(t("verifyFail"));
      setRecoverFailed(true);
      return;
    }
    setRecoveryMode(res.mode === "otp_sent" ? "otp_sent" : res.mode);
    setWelcomeKind("recover");
    setWelcome(true);
  };

  const finishWelcome = () => {
    if (welcomeKind === "recover") {
      setWelcome(false);
      goLogin();
      setPassword("");
      return;
    }
    setOpen(false);
    onAuthed?.();
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
              {welcome
                ? welcomeKind === "signup"
                  ? lang === "rw"
                    ? "Kwiyandikisha byakunze"
                    : "Registration successful"
                  : welcomeKind === "recover"
                    ? lang === "rw"
                      ? "Byakunze"
                      : "Recovery done"
                    : lang === "rw"
                      ? "Kwinjira byakunze"
                      : "Sign-in successful"
                : mode === "recover"
                  ? t("recoverTitle")
                  : mode === "login"
                    ? t("signIn")
                    : mode === "signup" && step === 1
                      ? lang === "rw"
                        ? "Murakaza neza"
                        : "Welcome"
                      : t("signUp")}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {welcome
                ? welcomeKind === "recover"
                  ? recoveryMode === "otp_sent"
                    ? lang === "rw"
                      ? "Reba email."
                      : "Check your email."
                    : lang === "rw"
                      ? "Ijambo ry'ibanga ryavuguruwe. Injira ukoresheje irishya."
                      : "Password updated. Sign in with the new password."
                  : welcomeKind === "signup"
                    ? lang === "rw"
                      ? "Konti yawe yakozwe neza."
                      : "Your account has been created."
                    : lang === "rw"
                      ? "Wakiriye neza."
                      : "You are signed in."
                : mode === "login"
                  ? t("loginHint")
                  : mode === "signup"
                    ? t("signupHint")
                    : recoverPhase === "otp"
                      ? lang === "rw"
                        ? "Andika kode yo muri email n'ijambo rishya."
                        : "Enter the email code and your new password."
                      : recoverPhase === "link_password"
                        ? lang === "rw"
                          ? "Hitamo ijambo ry'ibanga rishya."
                          : "Choose a new password."
                        : t("recoverHint")}
            </p>
          </div>

          {welcome && (
            <button type="button" onClick={finishWelcome} className="h-12 w-full rounded-full bg-primary font-semibold text-primary-foreground">
              {welcomeKind === "recover" ? t("signIn") : lang === "rw" ? "Komeza" : "Continue"}
            </button>
          )}

          {!welcome && mode !== "recover" && (
            <div className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
              <button type="button" onClick={goLogin} className={cn("h-11 rounded-full text-sm font-bold", mode === "login" ? "bg-primary text-primary-foreground shadow-card" : "text-muted-foreground")}>
                {t("signIn")}
              </button>
              <button type="button" onClick={goSignup} className={cn("h-11 rounded-full text-sm font-bold", mode === "signup" ? "bg-primary text-primary-foreground shadow-card" : "text-muted-foreground")}>
                {t("signUp")}
              </button>
            </div>
          )}

          {!welcome && ((mode === "login" && step === 1) || (mode === "signup" && step === 2)) && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
                {(["phone", "email"] as const).map((k) => (
                  <button key={k} type="button" onClick={() => setTab(k)} className={cn("h-10 rounded-full text-sm font-semibold", tab === k ? "bg-card text-primary shadow-card" : "text-muted-foreground")}>
                    {k === "phone" ? t("phone") : t("email")}
                  </button>
                ))}
              </div>
              <Input type={tab === "email" ? "email" : "tel"} inputMode={tab === "email" ? "email" : "tel"} placeholder={tab === "phone" ? t("phone") : t("email")} value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="h-12 rounded-xl" />
              <Input type="password" placeholder={`${t("password")} (min ${MIN_PASSWORD})`} value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl" />
              {mode === "signup" && showConfirm && (
                <Input type="password" placeholder={t("reenterPassword")} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-12 rounded-xl" autoFocus />
              )}
              <button type="button" disabled={busy} onClick={mode === "signup" ? submitProfile : continueStep1} className="h-12 w-full rounded-full bg-primary font-semibold text-primary-foreground">
                {busy ? t("pleaseWait") : mode === "login" ? t("signIn") : lang === "rw" ? "Fungura konti" : "Create account"}
              </button>
              {mode === "login" && !busy && (
                <button type="button" className="w-full text-center text-xs font-medium text-primary" onClick={goRecover}>
                  {t("forgotPassword")}
                </button>
              )}
            </div>
          )}

          {mode === "signup" && step === 1 && !welcome && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {lang === "rw" ? "Kuva uyu munsi, ububiko bw'iduka ryawe uzajya ubufata kuri telefone yawe." : "From today, your stock will be right on your phone."}
              </p>
              <Input placeholder={t("businessName")} value={business} onChange={(e) => setBusiness(e.target.value)} className="h-12 rounded-xl" />
              <Input placeholder={t("fullName")} value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-12 rounded-xl" />
              <button type="button" disabled={busy} onClick={continueStep1} className="h-12 w-full rounded-full bg-primary font-semibold text-primary-foreground">
                {t("continue")}
              </button>
            </div>
          )}

          {mode === "recover" && !welcome && (
            <div className="space-y-3">
              {recoverPhase === "link_password" && (
                <Input type="password" placeholder={t("newPassword")} value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl" />
              )}

              {recoverPhase === "otp" && (
                <>
                  <Input inputMode="numeric" placeholder={lang === "rw" ? "Kode (OTP)" : "Code (OTP)"} value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 8))} className="h-12 rounded-xl tracking-widest" />
                  <Input type="password" placeholder={t("newPassword")} value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl" />
                  <button type="button" className="text-xs font-medium text-primary" onClick={() => void requestEmailOtp(identifier).then((r) => r.ok && toast.success(lang === "rw" ? "Kode yongera koherezwa." : "Code resent."))}>
                    {lang === "rw" ? "Ongera wohereze kode" : "Resend code"}
                  </button>
                </>
              )}

              {recoverPhase === "identify" && (
                <>
                  <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
                    {(["phone", "email"] as const).map((k) => (
                      <button key={k} type="button" onClick={() => setTab(k)} className={cn("h-10 rounded-full text-sm font-semibold", tab === k ? "bg-card text-primary shadow-card" : "text-muted-foreground")}>
                        {k === "phone" ? t("phone") : t("email")}
                      </button>
                    ))}
                  </div>
                  <Input type={tab === "email" ? "email" : "tel"} inputMode={tab === "email" ? "email" : "tel"} placeholder={tab === "phone" ? t("phone") : t("email")} value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="h-12 rounded-xl" />
                  {tab === "phone" && (
                    <>
                      <Input placeholder={t("fullName")} value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-12 rounded-xl" />
                      <Input placeholder={t("businessName")} value={business} onChange={(e) => setBusiness(e.target.value)} className="h-12 rounded-xl" />
                      {localRecoveryNeedsPassword && (
                        <Input type="password" placeholder={t("newPassword")} value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl" />
                      )}
                    </>
                  )}
                  {tab === "email" && (
                    <p className="text-[11px] text-muted-foreground">
                      {lang === "rw"
                        ? "Tuzakohereza kode cyangwa link kuri email yawe."
                        : "We will email you a one-time code or a recovery link."}
                    </p>
                  )}
                </>
              )}

              <button type="button" disabled={busy} onClick={submitRecover} className="h-12 w-full rounded-full bg-primary font-semibold text-primary-foreground">
                {busy
                  ? t("pleaseWait")
                  : recoverPhase === "otp" || recoverPhase === "link_password"
                    ? lang === "rw"
                      ? "Bika ijambo rishya"
                      : "Save new password"
                    : tab === "email"
                      ? lang === "rw"
                        ? "Ohereza kode"
                        : "Send code"
                      : t("submit")}
              </button>

              {recoverFailed && tab === "phone" && (
                <a href="https://wa.me/250796919900?text=Password%20recovery%20help" target="_blank" rel="noreferrer" className="block text-center text-xs font-semibold text-[#128C7E]">
                  WhatsApp support
                </a>
              )}

              <button type="button" className="w-full text-center text-xs text-muted-foreground" onClick={goLogin}>
                {t("needLogin")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
