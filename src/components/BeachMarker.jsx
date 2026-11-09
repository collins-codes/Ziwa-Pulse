import { CircleMarker, Popup } from "react-leaflet";

import {
  formatLastUpdated,
  getCoverDescription,
  getCoverLabel,
  getTranslations,
} from "@/lib/i18n";

const markerColors = {
  Low: "#22c55e",
  Medium: "#f97316",
  High: "#ef4444",
};

export function BeachMarker({ beach, reports = [], selected, onSelect, language = "en", isSample }) {
  const color = markerColors[beach.cover_level];
  const t = getTranslations(language);

  return (
    <CircleMarker
      center={[beach.lat, beach.lng]}
      eventHandlers={{ click: () => onSelect(beach.id) }}
      pathOptions={{
        color: selected ? "#ffffff" : color,
        fillColor: color,
        fillOpacity: 0.95,
        weight: selected ? 4 : 2,
      }}
      radius={selected ? 11 : 8}
    >
      <Popup>
        <strong>{beach.name}</strong>
        <br />
        {t.cover}: {getCoverLabel(beach.cover_level, language)} · {beach.cover_pct}%
        <br />
        {getCoverDescription(beach.cover_level, language)}
        <br />
        {t.lastUpdated}: {formatLastUpdated(beach.last_updated, language)}
        {isSample && (
          <>
            <br />
            {t.sampleObservation}
          </>
        )}
        {reports.map((report) => (
          <div className="mt-2 max-w-64 border-t border-slate-200 pt-2" key={report.id}>
            <strong>{t.reportPopup}</strong>
            <br />
            {t.reportedOn}: {formatLastUpdated(report.created_at, language)}
            {report.is_sample && (
              <>
                <br />
                {t.sampleReport}
              </>
            )}
            <p className="mt-1 whitespace-pre-wrap">{report.description}</p>
          </div>
        ))}
      </Popup>
    </CircleMarker>
  );
}
