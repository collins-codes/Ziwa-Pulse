import { base44 } from "@/api/base44Client";
import { sampleBeaches } from "@/data/sampleBeaches";

export async function loadBeaches() {
  const beaches = await base44.entities.Beach.list();
  if (beaches.length > 0) {
    return {
      beaches,
      source: beaches.every((beach) => beach.is_sample === true) ? "sample" : "live",
      persisted: true,
      message: "",
    };
  }

  return {
    beaches: sampleBeaches,
    source: "sample",
    persisted: false,
    message: "No saved Beach records were found. Sample locations are shown; no data was seeded.",
  };
}
