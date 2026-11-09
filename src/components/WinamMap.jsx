import { MapContainer, TileLayer } from "react-leaflet";
import { BeachMarker } from "@/components/BeachMarker";
import { MapFocus } from "@/components/MapFocus";

const imageryUrl =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

export function WinamMap({ beaches, reports = [], selectedId, onSelect, language = "en", isSample }) {
  const selectedBeach = beaches.find((beach) => beach.id === selectedId);

  return (
    <MapContainer
      center={[-0.29, 34.46]}
      className="z-0"
      scrollWheelZoom={false}
      zoom={9}
    >
      <TileLayer attribution="Tiles © Esri" url={imageryUrl} />
      <MapFocus beach={selectedBeach} />
      {beaches.map((beach) => (
        <BeachMarker
          beach={beach}
          reports={reports.filter((report) => report.beach === beach.id)}
          isSample={isSample || beach.is_sample === true}
          key={beach.id}
          language={language}
          onSelect={onSelect}
          selected={selectedId === beach.id}
        />
      ))}
    </MapContainer>
  );
}
