import { CoverBadge } from "@/components/CoverBadge";
import { getCoverDescription, getTranslations, formatLastUpdated } from "@/lib/i18n";

export function BeachTableRow({ beach, isSample = false, selected, onSelect, language = "en" }) {
  const t = getTranslations(language);
  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(beach.id);
    }
  };
  return (
    <tr
      aria-pressed={selected}
      className={`cursor-pointer border-b border-slate-800/80 transition-colors hover:bg-slate-800/70 focus:bg-slate-800/70 focus:outline-none ${
        selected ? "bg-cyan-400/10" : ""
      }`}
      onClick={() => onSelect(beach.id)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <th className="px-4 py-4 text-left font-medium text-white" scope="row">
        {beach.name}
        {isSample && (
          <span className="ml-2 whitespace-nowrap text-[10px] font-medium uppercase text-amber-300">
            {t.sampleObservation}
          </span>
        )}
      </th>
      <td className="px-4 py-4 text-slate-400">{beach.county}</td>
      <td className="px-4 py-4">
        <CoverBadge language={language} level={beach.cover_level} />
        <p className="mt-1 max-w-56 text-xs leading-5 text-slate-400">
          {getCoverDescription(beach.cover_level, language)}
        </p>
      </td>
      <td className="px-4 py-4 text-slate-300">{beach.cover_pct}%</td>
      <td className="whitespace-nowrap px-4 py-4 text-slate-500">
        <span className="block text-[11px] text-slate-500">{t.lastUpdated}</span>
        <time dateTime={beach.last_updated}>
          {formatLastUpdated(beach.last_updated, language)}
        </time>
      </td>
    </tr>
  );
}
