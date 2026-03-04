"use client";

import { useState } from "react";
import { Lock, AlertTriangle, CheckCircle } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function SettingsPage() {

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChanging, setIsChanging] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const supabase = createSupabaseBrowserClient();

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({
        type: "error",
        text: "New password must be at least 8 characters.",
      });
      return;
    }

    setIsChanging(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setMessage({ type: "success", text: "Password updated successfully!" });
        setNewPassword("");
        setConfirmPassword("");
      }
    } finally {
      setIsChanging(false);
    }
  }

  async function handleSignOutAll() {
    await supabase.auth.signOut({ scope: "global" });
    window.location.href = "/x-admin/login";
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-heading font-bold text-white">Settings</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Manage your admin account settings
        </p>
      </div>

      {/* Change Password */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-emerald-500/15 rounded-xl flex items-center justify-center">
            <Lock className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-sm">Change Password</h2>
            <p className="text-zinc-500 text-xs">
              Update your admin account password
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`flex items-start gap-3 rounded-xl p-3 mb-4 ${
              message.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/20"
                : "bg-red-500/10 border border-red-500/20"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            )}
            <p
              className={`text-sm ${message.type === "success" ? "text-emerald-400" : "text-red-400"}`}
            >
              {message.text}
            </p>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-zinc-300 text-sm font-medium mb-1.5">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              placeholder="••••••••"
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div>
            <label className="block text-zinc-300 text-sm font-medium mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <button
            type="submit"
            disabled={isChanging}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition-colors flex items-center gap-2"
          >
            {isChanging ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Updating…
              </>
            ) : (
              "Update Password"
            )}
          </button>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="bg-zinc-900 border border-red-500/20 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-red-500/15 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-sm">Danger Zone</h2>
            <p className="text-zinc-500 text-xs">
              Irreversible actions — proceed with care
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between bg-zinc-800 rounded-xl p-4">
            <div>
              <p className="text-zinc-200 text-sm font-medium">
                Sign out all sessions
              </p>
              <p className="text-zinc-500 text-xs mt-0.5">
                Log out from all devices and browsers
              </p>
            </div>
            <button
              onClick={handleSignOutAll}
              className="bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20 text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              Sign Out All
            </button>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-white font-semibold text-sm mb-4">System Info</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Admin Panel Version", value: "1.0.0" },
            { label: "Framework", value: "Next.js 14" },
            { label: "Database", value: "Supabase (PostgreSQL)" },
            { label: "Auth Provider", value: "Supabase Auth" },
          ].map((item) => (
            <div key={item.label} className="bg-zinc-800 rounded-xl p-3">
              <p className="text-zinc-500 text-xs mb-1">{item.label}</p>
              <p className="text-zinc-300 text-sm font-medium">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
