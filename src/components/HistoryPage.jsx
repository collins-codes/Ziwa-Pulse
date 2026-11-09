import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { getTranslations } from "@/lib/i18n";
import { ReadingChart } from "@/components/ReadingChart";

const pageSize = 5000;

async function loadAllReadings() {
  const allReadings = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await base44.entities.Reading.list("-recorded_at", pageSize, offset);
    allReadings.push(...page);
    if (page.length < pageSize) return allReadings;
  }
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadReadingsCsv(readings, beaches) {
  const beachDetails = new Map(beaches.map((beach) => [beach.id, beach]));
  const header = ["beach", "county", "cover_level", "cover_pct", "recorded_at", "source"];
  const rows = readings.map((reading) => {
    const beach = beachDetails.get(reading.beach);
    return [
      beach?.name ?? reading.beach,
      beach?.county ?? "",
      reading.cover_level,
      reading.cover_pct,
      reading.recorded_at,
      reading.source,
    ];
  });
  const content = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "ziwa-pulse-reading-history.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function peakReading(readings) {
  return readings.reduce((peak, reading) =>
    !peak || reading.cover_pct > peak.cover_pct ? reading : peak
  , null);
}

export function HistoryPage({ beaches, language = "en", onBack }) {
  const t = getTranslations(language);
  const [readings, setReadings] = useState([]);
  const [selectedBeachId, setSelectedBeachId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const locale = language === "sw" ? "sw-KE" : "en-KE";

  useEffect(() => {
    if (
      beaches.length > 0 &&
      !beaches.some((beach) => beach.id === selectedBeachId)
    ) {
      setSelectedBeachId(beaches[0].id);
    }
  }, [beaches, selectedBeachId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    loadAllReadings()
      .then((rows) => {
        if (active) setReadings(rows);
      })
      .catch((loadError) => {
        if (active) setError(`${t.historyLoadFailed}: ${loadError.message}`);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [t.historyLoadFailed]);

  const beachReadings = useMemo(
    () =>
      readings
        .filter((reading) => reading.beach === selectedBeachId)
        .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at)),
    [readings, selectedBeachId]
  );
  const readingsByBeach = useMemo(
    () =>
      new Map(
        beaches.map((beach) => [
          beach.id,
          readings.filter((reading) => reading.beach === beach.id),
        ])
      ),
    [beaches, readings]
  );
  const counts = useMemo(
    () => ({
      sample: readings.filter((reading) => reading.source === "sample").length,
      manual: readings.filter((reading) => reading.source === "manual").length,
      satellite: readings.filter((reading) => reading.source === "satellite").length,
    }),
    [readings]
  );
  const selectedBeach = beaches.find((beach) => beach.id === selectedBeachId);
  const selectedPeak = peakReading(beachReadings);

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">{t.historyEyebrow}</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">{t.readingHistory}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{t.historyIntro}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:text-white"
            onClick={onBack}
            type="button"
          >
            {t.backToMap}
          </button>
          <button
            className="rounded-lg bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-50"
            disabled={readings.length === 0}
            onClick={() => downloadReadingsCsv(readings, beaches)}
            type="button"
          >
            {t.exportCsv}
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
        <strong className="mr-2 uppercase tracking-wider">{t.sampleData}</strong>
        {t.historySampleNotice} · {t.readingSources(counts)}
      </div>
      {error && <p className="mt-4 break-words rounded-lg bg-red-400/10 p-3 text-sm text-red-200" role="alert">{error}</p>}

      <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6">
        <label className="block max-w-xl text-sm text-slate-300">
          {t.selectBeach}
          <select
            className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-400"
            onChange={(event) => setSelectedBeachId(event.target.value)}
            value={selectedBeachId}
          >
            <option value="">{t.chooseHistoryBeach}</option>
            {beaches.map((beach) => (
              <option key={beach.id} value={beach.id}>{beach.name}</option>
            ))}
          </select>
        </label>
        {loading ? (
          <p className="mt-6 text-sm text-slate-300">{t.loadingHistory}</p>
        ) : selectedBeach ? (
          <>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-white">{selectedBeach.name} · {t.coverOverTime}</h3>
              <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-xs text-amber-200">
                {beachReadings.every((reading) => reading.source === "sample") ? t.sampleData : t.mixedReadings}
              </span>
            </div>
            {selectedPeak && (
              <p className="mt-2 text-sm font-medium text-cyan-100">
                {t.peakSummary(formatWeek(selectedPeak.recorded_at, locale), selectedPeak.cover_pct)}
              </p>
            )}
            {beachReadings.length ? (
              <div className="mt-3">
                <ReadingChart language={language} readings={beachReadings} />
              </div>
            ) : (
              <p className="mt-5 text-sm text-slate-400">{t.noBeachReadings}</p>
            )}
          </>
        ) : (
          <p className="mt-5 text-sm text-slate-400">{t.chooseBeachToView}</p>
        )}
      </section>

      <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6">
        <h3 className="font-semibold text-white">{t.seasonPeaks}</h3>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {beaches.map((beach) => {
            const peak = peakReading(readingsByBeach.get(beach.id) ?? []);
            return (
              <li className="rounded-xl border border-slate-800 bg-slate-950/60 p-4" key={beach.id}>
                <p className="font-medium text-slate-100">{beach.name}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {peak
                    ? t.peakSummary(formatWeek(peak.recorded_at, locale), peak.cover_pct)
                    : t.noSeasonPeak}
                </p>
                {peak?.source === "sample" && (
                  <p className="mt-2 text-xs text-amber-200">{t.sampleData}</p>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </section>
  );
}

function formatWeek(value, locale) {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(
    new Date(value)
  );
}
