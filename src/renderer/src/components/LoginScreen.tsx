import React, { useState } from "react";
import { Lock, ShieldCheck, KeyRound, Sparkles, Minus, Square, X } from "lucide-react";
import { useVideoStore } from "../store/videoStore";

export const LoginScreen: React.FC = () => {
  const { isPasswordSet, login, setupPassword } = useVideoStore();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleMinimize = () => window.api?.windowControls?.minimize();
  const handleMaximize = () => window.api?.windowControls?.maximize();
  const handleClose = () => window.api?.windowControls?.close();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password) {
      setError("Please enter a password");
      return;
    }

    setLoading(true);

    if (!isPasswordSet) {
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }
      const success = await setupPassword(password);
      if (!success) {
        setError("Failed to setup password");
      }
    } else {
      const success = await login(password);
      if (!success) {
        setError("Incorrect password");
      }
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-xl p-4 transition-colors duration-200">
      {/* Window Controls Bar */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-end p-3 z-20"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <div
          className="flex items-center gap-1"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <button
            onClick={handleMinimize}
            title="Minimize Window"
            className="cursor-pointer rounded-lg p-1.5 text-muted transition hover:bg-surface-hover hover:text-foreground"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={handleMaximize}
            title="Maximize / Restore Window"
            className="cursor-pointer rounded-lg p-1.5 text-muted transition hover:bg-surface-hover hover:text-foreground"
          >
            <Square className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleClose}
            title="Close Application"
            className="cursor-pointer rounded-lg p-1.5 text-muted transition hover:bg-rose-600 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="glass-modal w-full max-w-md rounded-2xl p-8 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center text-center mb-8 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary-border/30 flex items-center justify-center text-primary-text mb-4 shadow-lg shadow-primary/10 animate-pulse backdrop-blur-sm">
            {isPasswordSet ? (
              <Lock className="w-8 h-8" />
            ) : (
              <ShieldCheck className="w-8 h-8" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            MediaHub Studio
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary-text border border-primary-border/30">
              ADAUMC
            </span>
          </h1>
          <p className="text-sm text-muted mt-2">
            {isPasswordSet
              ? "Enter your master password to unlock application"
              : "Create a master password to secure your unified media store"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Master Password
            </label>
            <div className="relative">
              <KeyRound className="w-5 h-5 absolute left-3.5 top-3 text-muted" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="glass-input w-full pl-11 pr-4 py-2.5 rounded-xl text-foreground placeholder-muted/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                autoFocus
              />
            </div>
          </div>

          {!isPasswordSet && (
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <KeyRound className="w-5 h-5 absolute left-3.5 top-3 text-muted" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="glass-input w-full pl-11 pr-4 py-2.5 rounded-xl text-foreground placeholder-muted/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-primary hover:bg-primary-hover active:scale-[0.98] text-white font-medium rounded-xl shadow-lg shadow-primary/30 transition flex items-center justify-center gap-2 group cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-white/90 group-hover:rotate-12 transition" />
            {loading
              ? "Authenticating..."
              : isPasswordSet
                ? "Unlock MediaHub"
                : "Create Master Key & Unlock"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-muted relative z-10">
          Protected by AES-128 Stream Cipher & Encrypted `.adaumc` Storage
        </div>
      </div>
    </div>
  );
};
