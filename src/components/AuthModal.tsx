import React, { useState } from "react";
import { AlertCircle, BrainCircuit, CheckCircle2, Cloud, Loader2, Lock, Mail, User, X } from "lucide-react";
import { signInWithGoogle } from "../lib/firebase.js";

interface AuthModalProps {
  isOpen: boolean;
  initialMode: "login" | "register";
  onClose: () => void;
  onLogin: (email: string, pass: string) => Promise<void>;
  onRegister: (name: string, email: string, pass: string) => Promise<void>;
  onFirebaseLogin?: (uid: string, email: string, name?: string) => Promise<void>;
  guestAnalysisId: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode,
  onClose,
  onLogin,
  onRegister,
  onFirebaseLogin,
  guestAnalysisId,
}) => {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  React.useEffect(() => {
    setMode(initialMode);
    setError(null);
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "register") {
        if (!name.trim()) {
          setError("Name is required.");
          setLoading(false);
          return;
        }
        await onRegister(name, email, password);
      } else {
        await onLogin(email, password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const firebaseUser = await signInWithGoogle();
      if (!firebaseUser || !firebaseUser.email) {
        throw new Error("Could not retrieve Google account information.");
      }
      if (onFirebaseLogin) {
        await onFirebaseLogin(
          firebaseUser.uid,
          firebaseUser.email,
          firebaseUser.displayName || undefined
        );
      }
      onClose();
    } catch (err: any) {
      const code = String(err?.code || err?.message || "");
      if (
        code.includes("auth/popup-closed-by-user") ||
        code.includes("auth/cancelled-popup-request")
      ) {
        setError(
          "Google sign-in window was closed before completing. You can try again, sign in with email/password above, or use Instant Demo Sign-In below."
        );
      } else if (code.includes("auth/popup-blocked")) {
        setError(
          "Your browser blocked the Google sign-in popup. Please allow popups for this site or use Email/Password or Instant Demo Sign-In below."
        );
      } else if (code.includes("auth/unauthorized-domain")) {
        setError(
          "This preview domain is not yet listed in Firebase Authorized Domains. Please use Email/Password or Instant Demo Sign-In below."
        );
      } else {
        setError(err?.message || "Google authentication could not be completed.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleInstantDemoLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      if (onFirebaseLogin) {
        await onFirebaseLogin(
          "demo-candidate-uid",
          "demo.candidate@resumate.ai",
          "Alex Rivera"
        );
      } else {
        await onRegister("Alex Rivera", "demo.candidate@resumate.ai", "DemoPass123!");
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || "Demo sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {mode === "login" ? "Sign in to ResuMate AI" : "Create your Account"}
            </h2>
            <p className="text-xs text-slate-500">
              {guestAnalysisId
                ? "Your pending analysis will be saved to your profile."
                : "Continuous career intelligence & ATS resumes"}
            </p>
          </div>
        </div>

        {guestAnalysisId && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
            <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>Guest Analysis Active:</strong> Authenticating now will
              instantly migrate and preserve your readiness results.
            </span>
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : mode === "login" ? (
              <span>Sign In with Password</span>
            ) : (
              <span>Create Account & Save Analysis</span>
            )}
          </button>
        </form>

        <div className="relative my-4 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <span className="relative bg-white px-2 text-[11px] font-semibold text-slate-400 uppercase">
            Or continue with
          </span>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-xs transition-all disabled:opacity-50"
        >
          {googleLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              <span>Connecting to Cloud Account...</span>
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.97 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google Cloud</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleInstantDemoLogin}
          disabled={googleLoading || loading}
          className="mt-2.5 w-full flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/70 py-2.5 text-xs font-bold text-indigo-900 hover:bg-indigo-100 transition-all disabled:opacity-50 cursor-pointer"
        >
          <CheckCircle2 className="h-4 w-4 text-indigo-600" />
          <span>Instant 1-Click Demo Account</span>
        </button>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <Cloud className="h-3.5 w-3.5 text-emerald-600" />
          <span>Synced with Cloud Database for multi-device access</span>
        </div>

        <div className="mt-5 text-center text-xs text-slate-500">
          {mode === "login" ? (
            <p>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("register")}
                className="font-bold text-indigo-600 hover:underline"
              >
                Register free
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
                className="font-bold text-indigo-600 hover:underline"
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
