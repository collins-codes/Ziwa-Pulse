import { useState } from "react";
import { X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getTranslations } from "@/lib/i18n";

export function FieldReportDialog({ beaches, beachesAreSaved, language = "en", onClose }) {
  const t = getTranslations(language);
  const [beach, setBeach] = useState("");
  const [description, setDescription] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!beachesAreSaved || !beaches.some((item) => item.id === beach)) {
      setError(t.reportChooseBeach);
      return;
    }
    if (!description.trim()) {
      setError(t.reportDescriptionRequired);
      return;
    }

    setSaving(true);
    try {
      await base44.entities.FieldReport.create({
        beach,
        description: description.trim(),
        ...(reporterName.trim() ? { reporter_name: reporterName.trim() } : {}),
        status: "pending",
        created_at: new Date().toISOString(),
        is_sample: false,
      });
      setSaved(true);
    } catch (saveError) {
      setError(t.reportSaveFailed(saveError.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="field-report-title"
        aria-modal="true"
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl sm:p-7"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
              {t.communityReports}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-white" id="field-report-title">
              {saved ? t.reportThanksTitle : t.reportWhatYouSee}
            </h2>
          </div>
          <button
            aria-label={t.closeReportForm}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>
        {saved ? (
          <div className="mt-6 rounded-xl border border-green-400/20 bg-green-400/10 p-4 text-sm leading-6 text-green-200">
            {t.reportThanks}
          </div>
        ) : (
          <form className="mt-6 min-w-0 space-y-5" onSubmit={handleSubmit}>
            {!beachesAreSaved && (
              <p className="break-words rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-200">
                {t.sampleLocationsNotice}
              </p>
            )}
            <label className="block text-sm text-slate-300">
              {t.beach}
              <select
                className="mt-2 block w-full min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-400"
                disabled={!beachesAreSaved}
                onChange={(event) => setBeach(event.target.value)}
                required
                value={beach}
              >
                <option disabled value="">{t.reportChooseBeachOption}</option>
                {beaches.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-slate-300">
              {t.reportDescription}
              <textarea
                className="mt-2 block min-h-32 w-full min-w-0 resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-400"
                maxLength={1000}
                onChange={(event) => setDescription(event.target.value)}
                required
                value={description}
              />
            </label>
            <label className="block text-sm text-slate-300">
              {t.reporterNameOptional}
              <input
                autoComplete="name"
                className="mt-2 block w-full min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-400"
                maxLength={120}
                onChange={(event) => setReporterName(event.target.value)}
                value={reporterName}
              />
            </label>
            <p className="text-xs leading-5 text-slate-400">{t.reportReviewNote}</p>
            {error && (
              <p className="break-words rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200" role="alert">
                {error}
              </p>
            )}
            <button
              className="w-full rounded-lg bg-cyan-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving || !beachesAreSaved}
              type="submit"
            >
              {saving ? t.reportSubmitting : t.submitReport}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
