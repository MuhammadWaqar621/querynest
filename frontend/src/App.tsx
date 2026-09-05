import { useEffect, useState } from "react";

type ConfigStatus = {
  azure_ai: boolean;
  google_oauth: boolean;
  smtp: boolean;
};

function StatusPill({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-4 py-2 text-sm ${
        ok
          ? "border-green-200 bg-green-50 text-green-800"
          : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
    >
      <span className="font-medium">{label}</span>
      <span>{ok ? "configured" : "missing"}</span>
    </div>
  );
}

export default function App() {
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/config/status")
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
      })
      .then((data: ConfigStatus) => setStatus(data))
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">querynest</h1>
          <p className="mt-2 text-slate-600">
            A RAG-powered document chat assistant. Upload documents, then ask
            questions grounded in their content.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Backend configuration</h2>

          {error && (
            <p className="text-sm text-red-600">
              Could not reach the backend ({error}). Is it running?
            </p>
          )}

          {!error && !status && (
            <p className="text-sm text-slate-500">Checking configuration...</p>
          )}

          {status && (
            <div className="flex flex-col gap-2">
              <StatusPill label="Azure OpenAI" ok={status.azure_ai} />
              <StatusPill label="Google OAuth" ok={status.google_oauth} />
              <StatusPill label="SMTP (email)" ok={status.smtp} />
            </div>
          )}

          <p className="mt-4 text-xs text-slate-400">
            This is Phase 1 scaffolding — auth and document chat land in
            later phases.
          </p>
        </div>
      </div>
    </div>
  );
}
