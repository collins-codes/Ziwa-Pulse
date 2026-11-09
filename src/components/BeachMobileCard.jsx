import { CoverBadge } from "@/components/CoverBadge";
import {
  formatLastUpdated,
  getCoverDescription,
  getTranslations,
} from "@/lib/i18n";

export function BeachMobileCard({ beach, isSample = false, selected, onSelect, language }) {
  const t = getTranslations(language);

  return (
    <button
      aria-pressed={selected}
      className={`w-full min-w-0 rounded-xl border p-3 text-left transition-colors ${
        selected
          ? "border-cyan-400/40 bg-cyan-400/10"
          : "border-slate-800 bg-slate-950/40 hover:bg-slate-800/70"
      }`}
      onClick={() => onSelect(beach.id)}
      type="button"
    >
      <span className="block break-words font-medium text-white">{beach.name}</span>
      {isSample && (
        <span className="mt-1 block text-[10px] font-medium uppercase text-amber-300">
          {t.sampleObservation}
        </span>
      )}
      <span className="mt-1 block text-xs text-slate-500">{beach.county}</span>
      <span className="mt-3 block">
        <CoverBadge language={language} level={beach.cover_level} />
      </span>
      <span className="mt-1 block text-xs leading-5 text-slate-400">
        {getCoverDescription(beach.cover_level, language)}
      </span>
      <span className="mt-2 block text-sm text-slate-300">
        {t.estimatedArea}: {beach.cover_pct}%
      </span>
      <span className="mt-1 block text-xs leading-5 text-slate-500">
        {t.lastUpdated}: {formatLastUpdated(beach.last_updated, language)}
      </span>
    </button>
  );
}
