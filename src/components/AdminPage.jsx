import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { AdminDashboard } from "@/components/AdminDashboard";
import { isLocalBase44Backend } from "@/lib/backendMode";

export function AdminPage({
  onBack,
  onBeachUpdated,
  onAuthenticated,
  onReportPublished,
  language = "en",
}) {
  const [access, setAccess] = useState("checking");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  const checkAccess = async () => {
    setAccess("checking");
    setMessage("");
    try {
      const user = await base44.auth.me();
      if (!user) {
        setAccess("unverified");
      } else if (user.role !== "admin") {
        setAccess("denied");
      } else {
        setAccess("admin");
      }
    } catch (error) {
      setAccess("unverified");
      setMessage(
        error.response?.status === 401
          ? ""
          : `Account could not be checked: ${error.message}`
      );
    }
  };

  useEffect(() => {
    checkAccess();
  }, []);

  const signIn = async (event) => {
    event.preventDefault();
    setSigningIn(true);
    setMessage("");
    try {
      await base44.auth.loginViaEmailPassword(email.trim(), password);
      const user = await base44.auth.me();
      if (user.role !== "admin") {
        setAccess("denied");
        return;
      }
      await onAuthenticated();
      setAccess("admin");
    } catch (error) {
      setMessage(`Sign-in failed: ${error.message}`);
    } finally {
      setSigningIn(false);
    }
  };

  const signInWithBase44 = () => {
    setMessage("");
    try {
      base44.auth.loginWithProvider(
        "google",
        new URL("/?view=admin", window.location.origin).toString()
      );
    } catch (error) {
      setMessage(`Could not start Base44 sign-in: ${error.message}`);
    }
  };

  return (
    <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-7">
      {access === "checking" ? (
        <p className="text-sm text-slate-300">Checking Base44 account…</p>
      ) : access === "denied" ? (
        <div>
          <h2 className="text-xl font-semibold text-white">Admin access only</h2>
          <p className="mt-2 text-sm text-slate-400">
            This account does not have the Base44 admin role.
          </p>
        </div>
      ) : access === "unverified" ? (
        <div>
          <h2 className="text-xl font-semibold text-white">Sign in as an admin</h2>
          <p className="mt-2 text-sm text-slate-400">
            Sign in with your Base44 account. You must have the admin role to
            access this dashboard.
          </p>
          {isLocalBase44Backend() ? (
            <form className="mt-5 max-w-md space-y-4" onSubmit={signIn}>
              <label className="block text-sm text-slate-300">
                Base44 account email
                <input
                  autoComplete="username"
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-400"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </label>
              <label className="block text-sm text-slate-300">
                Password (any value in local dev)
                <input
                  autoComplete="current-password"
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-400"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </label>
              {message && (
                <p className="break-words text-sm text-red-200" role="alert">
                  {message}
                </p>
              )}
              <button
                className="rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60"
                disabled={signingIn}
                type="submit"
              >
                {signingIn ? "Signing in…" : "Sign in"}
              </button>
            </form>
          ) : (
            <div className="mt-5">
              <button
                className="rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950"
                onClick={signInWithBase44}
                type="button"
              >
                Sign in with Base44
              </button>
              {message && (
                <p className="mt-4 break-words text-sm text-red-200" role="alert">
                  {message}
                </p>
              )}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300"
              onClick={checkAccess}
              type="button"
            >
              Retry
            </button>
          </div>
        </div>
      ) : (
        <AdminDashboard
          language={language}
          onBack={onBack}
          onBeachUpdated={onBeachUpdated}
          onAuthenticated={onAuthenticated}
          onReportPublished={onReportPublished}
        />
      )}
    </section>
  );
}
