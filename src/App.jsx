import { useCallback, useEffect, useState } from "react";
import { AdminPage } from "@/components/AdminPage";
import { BeachTable } from "@/components/BeachTable";
import { CoverLegend } from "@/components/CoverLegend";
import { FieldReportDialog } from "@/components/FieldReportDialog";
import { GetAlertsDialog } from "@/components/GetAlertsDialog";
import { HistoryPage } from "@/components/HistoryPage";
import { HarvestBoardPage } from "@/components/HarvestBoardPage";
import { SiteHeader } from "@/components/SiteHeader";
import { SummaryCards } from "@/components/SummaryCards";
import { WinamMap } from "@/components/WinamMap";
import { sampleBeaches } from "@/data/sampleBeaches";
import { loadBeaches as fetchBeaches } from "@/data/loadBeaches";
import { uniqueBeachesByName } from "@/data/uniqueBeaches";
import { formatLastUpdated, getTranslations } from "@/lib/i18n";
import { base44 } from "@/api/base44Client";

export default function App() {
  const [selectedId, setSelectedId] = useState(null);
  const [beaches, setBeaches] = useState(sampleBeaches);
  const [dataSource, setDataSource] = useState("loading");
  const [beachesAreSaved, setBeachesAreSaved] = useState(false);
  const [dataMessage, setDataMessage] = useState("");
  const [view, setView] = useState(() =>
    ["admin", "history", "harvest-board"].includes(new URLSearchParams(window.location.search).get("view"))
      ? new URLSearchParams(window.location.search).get("view")
      : "map"
  );
  const [showAlerts, setShowAlerts] = useState(false);
  const [showFieldReport, setShowFieldReport] = useState(false);
  const [communityReports, setCommunityReports] = useState([]);
  const [communityReportsError, setCommunityReportsError] = useState("");
  const [latestBriefing, setLatestBriefing] = useState(null);
  const [briefingLoadError, setBriefingLoadError] = useState("");
  const [language, setLanguage] = useState(() => {
    const savedLanguage = window.localStorage.getItem("ziwa-pulse-language");
    return savedLanguage === "sw" ? "sw" : "en";
  });
  const t = getTranslations(language);

  const changeLanguage = (nextLanguage) => {
    setLanguage(nextLanguage);
    window.localStorage.setItem("ziwa-pulse-language", nextLanguage);
  };

  const loadBeaches = useCallback(async () => {
    setDataSource("loading");
    setDataMessage("");
    try {
      const result = await fetchBeaches();
      setBeaches(uniqueBeachesByName(result.beaches));
      setDataSource(result.source);
      setBeachesAreSaved(result.persisted);
      setDataMessage(result.message);
      setSelectedId(null);
    } catch (error) {
      setBeaches(sampleBeaches);
      setDataSource("sample");
      setBeachesAreSaved(false);
      setDataMessage(
        `Beach data could not be loaded. Sample locations are shown: ${error.message}`
      );
    }
  }, []);

  const loadCommunityReports = useCallback(async () => {
    setCommunityReportsError("");
    try {
      setCommunityReports(
        await base44.entities.CommunityReport.list("-created_at", 100)
      );
    } catch (error) {
      setCommunityReports([]);
      setCommunityReportsError(`Community reports could not be loaded: ${error.message}`);
    }
  }, []);

  const loadLatestBriefing = useCallback(async () => {
    setBriefingLoadError("");
    try {
      const rows = await base44.entities.Briefing.list("-created_at", 1);
      setLatestBriefing(rows[0] ?? null);
    } catch (error) {
      setBriefingLoadError(t.briefingLoadFailed(error.message));
    }
  }, [t.briefingLoadFailed]);

  useEffect(() => {
    loadBeaches();
    loadCommunityReports();
  }, [loadBeaches, loadCommunityReports]);

  useEffect(() => {
    loadLatestBriefing();
  }, [loadLatestBriefing]);

  const openAdmin = () => {
    setView("admin");
    const url = new URL(window.location.href);
    url.searchParams.set("view", "admin");
    window.history.replaceState(null, "", url);
  };

  const returnToMap = () => {
    setView("map");
    const url = new URL(window.location.href);
    url.searchParams.delete("view");
    window.history.replaceState(null, "", url);
    loadCommunityReports();
    loadLatestBriefing();
  };

  const openHistory = () => {
    setView("history");
    const url = new URL(window.location.href);
    url.searchParams.set("view", "history");
    window.history.replaceState(null, "", url);
  };

  const openHarvestBoard = () => {
    setView("harvest-board");
    const url = new URL(window.location.href);
    url.searchParams.set("view", "harvest-board");
    window.history.replaceState(null, "", url);
  };

  const handleBeachUpdated = (updatedBeach) => {
    setBeaches((current) =>
      current.map((beach) => beach.id === updatedBeach.id ? updatedBeach : beach)
    );
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <SiteHeader
          language={language}
          onLanguageChange={changeLanguage}
          onGetAlerts={() => setShowAlerts(true)}
          onOpenAdmin={openAdmin}
          onOpenHistory={openHistory}
          onOpenHarvestBoard={openHarvestBoard}
        />
        {view === "admin" ? (
          <AdminPage
            language={language}
            onBack={returnToMap}
            onBeachUpdated={handleBeachUpdated}
            onAuthenticated={loadBeaches}
            onReportPublished={loadCommunityReports}
          />
        ) : view === "history" ? (
          <HistoryPage
            beaches={beaches}
            language={language}
            onBack={returnToMap}
          />
        ) : view === "harvest-board" ? (
          <HarvestBoardPage
            beaches={beaches}
            beachesAreSaved={beachesAreSaved}
            language={language}
            onBack={returnToMap}
          />
        ) : (
          <>
            <section
              aria-label={dataSource === "live" ? t.liveData : t.sampleData}
              className={`mt-8 rounded-xl px-4 py-3 text-sm ${
                dataSource === "live"
                  ? "border border-cyan-400/25 bg-cyan-400/10 text-cyan-100"
                  : "border border-amber-400/25 bg-amber-400/10 text-amber-100"
              }`}
            >
              <strong className="mr-2 uppercase tracking-wider">
                {dataSource === "live" ? t.liveData : t.sampleData}
              </strong>
              {dataSource === "live"
                ? t.liveBanner
                : t.sampleBanner}
            </section>
            {dataMessage && (
              <p className="mt-2 break-words text-xs text-amber-200/80" role="status">
                {dataMessage}
              </p>
            )}
            {dataSource === "loading" && (
              <p className="mt-2 text-xs text-slate-500" role="status">
                {t.loadingBeaches}
              </p>
            )}
            <p className="mt-5 max-w-4xl text-sm leading-6 text-slate-400">
              {t.about}
            </p>
            <section
              aria-labelledby="daily-briefing-title"
              className="mt-5 rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2
                  className="text-lg font-semibold text-white"
                  id="daily-briefing-title"
                >
                  {t.dailyBriefing}
                </h2>
                {latestBriefing?.created_at && (
                  <time className="text-xs text-slate-400" dateTime={latestBriefing.created_at}>
                    {formatLastUpdated(latestBriefing.created_at, language)}
                  </time>
                )}
              </div>
              {briefingLoadError ? (
                <p className="mt-3 text-sm text-amber-200" role="status">
                  {briefingLoadError}
                </p>
              ) : latestBriefing ? (
                <p className="mt-3 whitespace-pre-line break-words text-sm leading-6 text-slate-300">
                  {language === "sw" ? latestBriefing.text_sw : latestBriefing.text_en}
                </p>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {t.noBriefing}
                </p>
              )}
            </section>
            {communityReportsError && (
              <p className="mt-3 break-words text-xs text-amber-200" role="status">
                {communityReportsError}
              </p>
            )}
            <div className="mt-4">
              <button
                className="rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
                onClick={() => setShowFieldReport(true)}
                type="button"
              >
                {t.reportWhatYouSee}
              </button>
            </div>
            <SummaryCards beaches={beaches} language={language} />
            <section className="mt-7 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-2xl shadow-black/20">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 px-5 py-5 sm:px-7">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300 sm:tracking-[0.2em]">
                    {t.winamGulf}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                    {t.hyacinthWatch}
                  </h2>
                </div>
                <CoverLegend language={language} />
              </div>
              <div className="h-[360px] sm:h-[480px]">
                <WinamMap
                  beaches={beaches}
                  reports={communityReports}
                  selectedId={selectedId}
                  language={language}
                  isSample={dataSource !== "live"}
                  onSelect={setSelectedId}
                />
              </div>
              <div className="border-t border-slate-800 px-4 py-6 sm:px-7">
                <BeachTable
                  beaches={beaches}
                  isSample={dataSource !== "live"}
                  language={language}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              </div>
            </section>
            <p className="mt-5 text-center text-xs text-slate-500">
              {dataSource === "live" ? t.liveBanner : t.sampleData} · {t.mapImagery}
            </p>
          </>
        )}
        {showAlerts && (
          <GetAlertsDialog
            beaches={beaches}
            beachesAreSaved={beachesAreSaved}
            language={language}
            onClose={() => setShowAlerts(false)}
          />
        )}
        {showFieldReport && (
          <FieldReportDialog
            beaches={beaches}
            beachesAreSaved={beachesAreSaved}
            language={language}
            onClose={() => setShowFieldReport(false)}
          />
        )}
      </div>
    </main>
  );
}
