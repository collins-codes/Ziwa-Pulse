import { getTranslations } from "@/lib/i18n";

const levels = [
  ["Low", "lowCover", "text-green-300", "border-green-400/20 bg-green-400/5"],
  ["Medium", "mediumCover", "text-orange-300", "border-orange-400/20 bg-orange-400/5"],
  ["High", "highCover", "text-red-300", "border-red-400/20 bg-red-400/5"],
];

export function SummaryCards({ beaches, language = "en" }) {
  const t = getTranslations(language);

  return (
    <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
      {levels.map(([level, label, textColor, cardColor]) => (
        <div
          className={`min-w-0 rounded-xl border p-2.5 sm:p-4 ${cardColor}`}
          key={level}
        >
          <p className="text-[11px] leading-4 text-slate-400 sm:text-sm">{t[label]}</p>
          <p className={`mt-1 text-2xl font-semibold ${textColor}`}>
            {beaches.filter((beach) => beach.cover_level === level).length}
          </p>
        </div>
      ))}
    </div>
  );
}
