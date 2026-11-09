import { getCoverLabel, getTranslations } from "@/lib/i18n";

const levels = [
  ["Low", "bg-green-400"],
  ["Medium", "bg-orange-400"],
  ["High", "bg-red-500"],
];

export function CoverLegend({ language = "en" }) {
  const t = getTranslations(language);

  return (
    <div aria-label={t.coverLevelLegend} className="flex flex-wrap gap-3 sm:gap-4">
      {levels.map(([level, color]) => (
        <span className="inline-flex items-center gap-2 text-sm text-slate-300" key={level}>
          <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
          {getCoverLabel(level, language)}
        </span>
      ))}
    </div>
  );
}
