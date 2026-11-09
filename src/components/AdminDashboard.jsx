import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { AdminAlertEvents } from "@/components/AdminAlertEvents";
import { AdminBeachEditor } from "@/components/AdminBeachEditor";
import { AdminFieldReports } from "@/components/AdminFieldReports";
import { AdminSentMessages } from "@/components/AdminSentMessages";
import { AdminSubscriberList } from "@/components/AdminSubscriberList";
import { uniqueBeachesByName } from "@/data/uniqueBeaches";
import { formatLastUpdated, getTranslations } from "@/lib/i18n";

export function AdminDashboard({
  onBack,
  onBeachUpdated,
  onAuthenticated,
  onReportPublished,
  language = "en",
}) {
  const t = getTranslations(language);
  const [beaches, setBeaches] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [events, setEvents] = useState([]);
  const [messages, setMessages] = useState([]);
  const [fieldReports, setFieldReports] = useState([]);
  const [briefings, setBriefings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningBriefing, setRunningBriefing] = useState(false);
  const [initializingSamples, setInitializingSamples] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [
        beachRows,
        subscriberRows,
        eventRows,
        messageRows,
        briefingRows,
      ] = await Promise.all([
        base44.entities.Beach.list(),
        base44.entities.Subscriber.list("-created_date", 100),
        base44.entities.AlertEvent.list("-created_at", 50),
        base44.entities.SentMessage.list("-time", 100),
        base44.entities.Briefing.list("-created_at", 10),
      ]);
      const reportRows = await base44.entities.FieldReport.list("-created_at", 100);
      setBeaches(uniqueBeachesByName(beachRows));
      setSubscribers(subscriberRows);
      setEvents(eventRows);
      setMessages(messageRows);
      setFieldReports(reportRows);
      setBriefings(briefingRows);
    } catch (loadError) {
      setError(`Admin data could not be loaded: ${loadError.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const runBriefing = async () => {
    setError("");
    setNotice("");

    setRunningBriefing(true);
    try {
      const response = await base44.functions.invoke("dailyBriefing");
      const createdBriefing = response.data?.briefing;
      if (!createdBriefing?.id) {
        throw new Error("The function completed without returning a saved briefing.");
      }
      setBriefings((current) =>
        [createdBriefing, ...current.filter((item) => item.id !== createdBriefing.id)]
          .slice(0, 10)
      );
      setNotice(t.briefingRunSaved);
    } catch (runError) {
      const detail =
        runError.response?.data?.error ??
        runError.message ??
        "Unknown error";
      setError(t.briefingRunFailed(detail));
    } finally {
      setRunningBriefing(false);
    }
  };

  const reviewFieldReport = async (report, status) => {
    setError("");
    setNotice("");

    try {
      if (status === "verified") {
        const publicReport = await base44.entities.CommunityReport.create({
          beach: report.beach,
          description: report.description,
          created_at: report.created_at,
          is_sample: report.is_sample === true,
          ...(report.sample_key ? { sample_key: report.sample_key } : {}),
        });
        try {
          await base44.entities.FieldReport.update(report.id, { status });
        } catch (updateError) {
          try {
            await base44.entities.CommunityReport.delete(publicReport.id);
          } catch (rollbackError) {
            throw new Error(
              `The report could not be marked verified, and its public copy could not be removed: ${rollbackError.message}`
            );
          }
          throw updateError;
        }
        setNotice(t.reportVerified);
        await onReportPublished();
      } else {
        await base44.entities.FieldReport.update(report.id, { status });
        setNotice(t.reportRejected);
      }
      await loadData();
    } catch (reviewError) {
      setError(`The report could not be reviewed: ${reviewError.message}`);
    }
  };

  const initializeSampleData = async () => {
    setError("");
    setNotice("");
    if (!window.confirm(t.sampleDataInitConfirm)) return;

    setInitializingSamples(true);
    try {
      const response = await base44.functions.invoke("initializeSampleData");
      const result = response.data;
      if (!result?.success) {
        throw new Error(result?.error ?? "The initializer did not confirm success.");
      }
      const created = Object.entries(result.createdCounts ?? {})
        .map(([entity, count]) => `${count} ${entity}`)
        .join(", ");
      setNotice(t.sampleDataInitSaved(created));
      await Promise.all([loadData(), onAuthenticated(), onReportPublished()]);
    } catch (initError) {
      const detail =
        initError.response?.data?.error ??
        initError.message ??
        "Unknown error";
      setError(t.sampleDataInitFailed(detail));
    } finally {
      setInitializingSamples(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateCover = async (beach, newLevel) => {
    setError("");
    setNotice("");
    if (newLevel === beach.cover_level) return;

    try {
      const recordedAt = new Date().toISOString();
      const updatedBeach = await base44.entities.Beach.update(beach.id, {
        cover_level: newLevel,
        last_updated: recordedAt,
      });
      setBeaches((current) =>
        current.map((item) => item.id === updatedBeach.id ? updatedBeach : item)
      );
      onBeachUpdated(updatedBeach);

      try {
        await base44.entities.Reading.create({
          beach: beach.id,
          cover_level: newLevel,
          cover_pct: beach.cover_pct,
          recorded_at: recordedAt,
          source: "manual",
        });
      } catch (readingError) {
        setError(
          `${beach.name} was updated to ${newLevel}, but its reading history could not be recorded: ${readingError.message}`
        );
        return;
      }

      let alertEvent;
      try {
        alertEvent = await base44.entities.AlertEvent.create({
          beach: beach.id,
          old_level: beach.cover_level,
          new_level: newLevel,
          created_at: new Date().toISOString(),
        });
      } catch (eventError) {
        setError(
          `The beach level was updated, but its alert event could not be recorded: ${eventError.message}`
        );
        return;
      }

      setNotice(`${beach.name} updated to ${newLevel}; alert event recorded.`);
      try {
        const response = await base44.functions.invoke("sendAlert", {
          alertEventId: alertEvent.id,
        });
        const prepared = response.data.prepared ?? 0;
        setNotice(
          `${beach.name} updated to ${newLevel}; alert event recorded. ${prepared} dry-run message${prepared === 1 ? "" : "s"} prepared.`
        );
      } catch (senderError) {
        setError(
          `The alert event was recorded, but its dry-run messages could not be prepared: ${senderError.message}`
        );
      }
      await loadData();
    } catch (updateError) {
      setError(`The beach level could not be updated: ${updateError.message}`);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
            Restricted · Base44 admins
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-white">Admin dashboard</h2>
        </div>
        <button
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:text-white"
          onClick={onBack}
          type="button"
        >
          Back to map
        </button>
      </div>
      {loading ? (
        <p className="mt-6 text-sm text-slate-300">Loading admin data…</p>
      ) : (
        <>
          {error && <p className="mt-5 rounded-lg bg-red-400/10 p-3 text-sm text-red-200" role="alert">{error}</p>}
          {notice && <p className="mt-5 rounded-lg bg-green-400/10 p-3 text-sm text-green-200" role="status">{notice}</p>}
          <div className="mt-6 grid gap-4">
            <AdminBeachEditor beaches={beaches} onSave={updateCover} />
            <section className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5 sm:p-6">
              <h3 className="text-lg font-semibold text-white">{t.sampleDataInitTitle}</h3>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
                {t.sampleDataInitNote}
              </p>
              <button
                className="mt-4 rounded-lg border border-amber-300/40 bg-amber-300/10 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-300/20 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={initializingSamples}
                onClick={initializeSampleData}
                type="button"
              >
                {initializingSamples ? t.sampleDataInitializing : t.sampleDataInitButton}
              </button>
            </section>
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{t.dailyBriefing}</h3>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                    {t.briefingAdminNote}
                  </p>
                </div>
                <button
                  className="rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={runningBriefing}
                  onClick={runBriefing}
                  type="button"
                >
                  {runningBriefing ? t.runningBriefing : t.runBriefingNow}
                </button>
              </div>
              <h4 className="mt-6 text-sm font-semibold text-slate-200">
                {t.recentBriefingRuns}
              </h4>
              {briefings.length === 0 ? (
                <p className="mt-2 text-sm text-slate-400">{t.noBriefingRuns}</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {briefings.map((briefing) => (
                    <li
                      className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                      key={briefing.id}
                    >
                      <time
                        className="text-xs text-slate-400"
                        dateTime={briefing.created_at}
                      >
                        {formatLastUpdated(briefing.created_at, language)}
                      </time>
                      <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-slate-300">
                        {language === "sw" ? briefing.text_sw : briefing.text_en}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <AdminFieldReports
              beaches={beaches}
              language={language}
              onReview={reviewFieldReport}
              reports={fieldReports}
            />
            <AdminSubscriberList beaches={beaches} subscribers={subscribers} />
            <AdminAlertEvents beaches={beaches} events={events} />
            <AdminSentMessages beaches={beaches} messages={messages} />
          </div>
        </>
      )}
    </div>
  );
}
