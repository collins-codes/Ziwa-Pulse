import { useEffect } from "react";
import { useMap } from "react-leaflet";

export function MapFocus({ beach }) {
  const map = useMap();

  useEffect(() => {
    if (beach) {
      map.flyTo([beach.lat, beach.lng], Math.max(map.getZoom(), 10), {
        duration: 0.6,
      });
    }
  }, [beach, map]);

  return null;
}
