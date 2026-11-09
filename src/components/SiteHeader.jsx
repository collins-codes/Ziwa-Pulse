import { Waves } from "lucide-react";
import { getTranslations } from "@/lib/i18n";

export function SiteHeader({
  language,
  onLanguageChange,
  onGetAlerts,
  onOpenAdmin,
  onOpenHistory,
  onOpenHarvestBoard,
}) {
  const t = getTranslations(language);

  return (
    <header>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 text-cyan-300 sm:gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 sm:h-20 sm:w-20">
              <Waves aria-hidden="true" size={34} className="sm:hidden" />
              <Waves aria-hidden="true" size={38} className="hidden sm:block" />
            </span>
            <span className="text-xl font-bold uppercase tracking-[0.13em] sm:text-3xl sm:tracking-[0.18em]">
              Ziwa Pulse
            </span>
          </div>
          <h1 className="mt-3 text-xl font-semibold leading-tight tracking-tight text-white sm:text-2xl">
            {t.tagline}
          </h1>
          <p className="mt-1.5 max-w-xl text-xs leading-5 text-slate-400 sm:text-sm">
            {t.intro}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end">
          <div aria-label={t.language} className="inline-flex rounded-lg border border-slate-700 p-1" role="group">
            <button
              aria-pressed={language === "en"}
              className={`rounded-md px-2.5 py-2 text-xs font-medium transition sm:px-3 ${
                language === "en" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
              }`}
              onClick={() => onLanguageChange("en")}
              type="button"
            >
              {t.english}
            </button>
            <button
              aria-pressed={language === "sw"}
              className={`rounded-md px-2.5 py-2 text-xs font-medium transition sm:px-3 ${
                language === "sw" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
              }`}
              onClick={() => onLanguageChange("sw")}
              type="button"
            >
              {t.kiswahili}
            </button>
          </div>
          <nav aria-label={t.navigation} className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-lg border border-slate-700 px-3 py-2.5 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
            onClick={onOpenHistory}
            type="button"
          >
            {t.history}
          </button>
          <button
            className="rounded-lg border border-slate-700 px-3 py-2.5 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
            onClick={onOpenHarvestBoard}
            type="button"
          >
            {t.harvestBoard.nav}
          </button>
          <button
            className="rounded-lg bg-cyan-300 px-3 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 sm:px-4"
            onClick={onGetAlerts}
            type="button"
          >
            {t.getAlerts}
          </button>
          <button
            className="rounded-lg border border-slate-700 px-3 py-2.5 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
            onClick={onOpenAdmin}
            type="button"
          >
            {t.admin}
          </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
