import { BeachTableRow } from "@/components/BeachTableRow";
import { BeachMobileCard } from "@/components/BeachMobileCard";
import { getTranslations } from "@/lib/i18n";

export function BeachTable({ beaches, isSample, selectedId, onSelect, language = "en" }) {
  const t = getTranslations(language);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold text-white">{t.beachObservations}</h3>
        <span className={`text-xs font-medium uppercase tracking-[0.1em] sm:tracking-[0.15em] ${isSample ? "text-amber-300" : "text-cyan-300"}`}>
          {isSample ? t.sampleData : t.liveData} · {beaches.length} {t.sites}
        </span>
      </div>
      <div className="grid gap-3 md:hidden">
        {beaches.map((beach) => (
          <BeachMobileCard
            beach={beach}
            isSample={isSample || beach.is_sample === true}
            key={beach.id}
            language={language}
            onSelect={onSelect}
            selected={selectedId === beach.id}
          />
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-xs uppercase tracking-wider text-slate-500">
              <th className="px-3 py-3 text-left font-medium lg:px-4" scope="col">{t.beach}</th>
              <th className="px-3 py-3 text-left font-medium lg:px-4" scope="col">{t.county}</th>
              <th className="px-3 py-3 text-left font-medium lg:px-4" scope="col">{t.cover}</th>
              <th className="px-3 py-3 text-left font-medium lg:px-4" scope="col">{t.estimatedArea}</th>
              <th className="px-3 py-3 text-left font-medium lg:px-4" scope="col">{t.lastUpdated}</th>
            </tr>
          </thead>
          <tbody>
            {beaches.map((beach) => (
              <BeachTableRow
                beach={beach}
                isSample={isSample || beach.is_sample === true}
                key={beach.id}
                language={language}
                onSelect={onSelect}
                selected={selectedId === beach.id}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
