import { useState } from "react";
import { getTranslations } from "@/lib/i18n";

export function AdminFieldReports({ beaches, language = "en", onReview, reports }) {
  const t = getTranslations(language);
  const dateFormatter = new Intl.DateTimeFormat(language === "sw" ? "sw-KE" : "en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const [busyId, setBusyId] = useState("");
  const beachNames = new Map(beaches.map((beach) => [beach.id, beach.name]));
  const pendingReports = reports.filter((report) => report.status === "pending");

  const review = async (report, status) => {
    setBusyId(report.id);
    try {
      await onReview(report, status);
    } finally {
      setBusyId("");
    }
  };

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:p-5">
      <h3 className="font-semibold text-white">{t.adminFieldReports}</h3>
      {pendingReports.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">{t.noPendingReports}</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-800">
          {pendingReports.map((report) => (
            <li className="py-4 first:pt-0 last:pb-0" key={report.id}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-slate-200">
                  {beachNames.get(report.beach) ?? t.beach}
                </p>
                {report.is_sample && (
                  <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-200">
                    {t.sampleReport}
                  </span>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
                {report.description}
              </p>
              {report.reporter_name && (
                <p className="mt-1 break-words text-xs text-slate-500">
                  {t.reportedBy}: {report.reporter_name}
                </p>
              )}
              <time className="mt-1 block text-xs text-slate-500" dateTime={report.created_at}>
                {dateFormatter.format(new Date(report.created_at))}
              </time>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="rounded-lg bg-green-400/15 px-3 py-2 text-sm font-medium text-green-200 hover:bg-green-400/25 disabled:opacity-60"
                  disabled={busyId === report.id}
                  onClick={() => review(report, "verified")}
                  type="button"
                >
                  {t.verifyReport}
                </button>
                <button
                  className="rounded-lg bg-red-400/10 px-3 py-2 text-sm font-medium text-red-200 hover:bg-red-400/20 disabled:opacity-60"
                  disabled={busyId === report.id}
                  onClick={() => review(report, "rejected")}
                  type="button"
                >
                  {t.rejectReport}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
