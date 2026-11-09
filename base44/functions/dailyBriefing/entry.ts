import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";

type Beach = {
  id: string;
  name: string;
  cover_level: string;
  cover_pct: number;
  last_updated: string;
  is_sample?: boolean;
};

type Reading = {
  beach: string;
  cover_level: string;
  cover_pct: number;
  recorded_at: string;
  source: string;
};

type SuggestionSet = {
  fisher_en: string;
  boat_operator_en: string;
  harvester_en: string;
  fisher_sw: string;
  boat_operator_sw: string;
  harvester_sw: string;
};

type Observation = {
  level: string;
  recordedAt: string | null;
  source: string | null;
  coverPct: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 5000;
const SUGGESTIONS: SuggestionSet = {
  fisher_en:
    "Check local landing-site conditions and coordinate with your BMU before setting out.",
  boat_operator_en:
    "Confirm the route and landing point with local operators before departure.",
  harvester_en:
    "Coordinate with local leaders before harvesting and keep access routes clear.",
  fisher_sw:
    "Thibitisha hali ya sehemu ya kutua na uratibu na BMU kabla ya kuondoka.",
  boat_operator_sw:
    "Thibitisha njia na sehemu ya kutua na waendeshaji wa eneo kabla ya safari.",
  harvester_sw:
    "Shirikiana na viongozi wa eneo kabla ya uvunaji na uache njia za kupita wazi.",
};

function getTimestamp(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function latest<T extends { recorded_at: string }>(rows: T[]): T | null {
  return rows.reduce<T | null>((current, row) => {
    if (!current) return row;
    return Date.parse(row.recorded_at) > Date.parse(current.recorded_at)
      ? row
      : current;
  }, null);
}

async function loadRelevantReadings(
  base44: ReturnType<typeof createClientFromRequest>,
  fourteenDaysAgo: number,
): Promise<Reading[]> {
  const readings: Reading[] = [];

  for (let skip = 0; ; skip += PAGE_SIZE) {
    const page = await base44.asServiceRole.entities.Reading.list(
      "-recorded_at",
      PAGE_SIZE,
      skip,
    ) as Reading[];
    readings.push(
      ...page.filter((reading) => {
        const recordedAt = getTimestamp(reading.recorded_at);
        return recordedAt !== null && recordedAt >= fourteenDaysAgo;
      }),
    );

    if (page.length < PAGE_SIZE) break;
    const oldestTimestamp = page.reduce<number>(
      (oldest, reading) =>
        Math.min(oldest, getTimestamp(reading.recorded_at) ?? oldest),
      Number.POSITIVE_INFINITY,
    );
    if (oldestTimestamp < fourteenDaysAgo) break;
  }

  return readings;
}

function formatDate(value: string | null, language: "en" | "sw"): string {
  if (!value) return language === "sw" ? "tarehe haijulikani" : "date unavailable";
  return new Intl.DateTimeFormat(language === "sw" ? "sw-KE" : "en-KE", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function buildBriefing(
  beaches: Beach[],
  readings: Reading[],
  hasSampleData: boolean,
  suggestions: SuggestionSet,
  now: number,
  language: "en" | "sw",
): string {
  const cutoff = now - 7 * DAY_MS;
  const previousWindowStart = now - 14 * DAY_MS;
  const highBeaches: string[] = [];
  const staleBeaches: string[] = [];
  const unknownDateBeaches: string[] = [];
  const changes: string[] = [];
  let comparableBeachCount = 0;

  for (const beach of beaches) {
    const beachReadings = readings.filter((reading) => reading.beach === beach.id);
    const recent = latest(
      beachReadings.filter((reading) => {
        const timestamp = getTimestamp(reading.recorded_at);
        return timestamp !== null && timestamp >= cutoff;
      }),
    );
    const previous = latest(
      beachReadings.filter((reading) => {
        const timestamp = getTimestamp(reading.recorded_at);
        return timestamp !== null &&
          timestamp >= previousWindowStart &&
          timestamp < cutoff;
      }),
    );
    const mostRecentReading = latest(beachReadings);
    const beachTimestamp = getTimestamp(beach.last_updated);
    const readingTimestamp = recent ? getTimestamp(recent.recorded_at) : null;
    const mostRecentReadingTimestamp = mostRecentReading
      ? getTimestamp(mostRecentReading.recorded_at)
      : null;
    const useBeach = beachTimestamp !== null &&
      (readingTimestamp === null || beachTimestamp >= readingTimestamp);
    const useStaleReading = !recent &&
      mostRecentReading !== null &&
      (
        beachTimestamp === null ||
        (mostRecentReadingTimestamp !== null &&
          mostRecentReadingTimestamp > beachTimestamp)
      );
    const observation: Observation = useBeach
      ? {
          level: beach.cover_level,
          recordedAt: beach.last_updated,
          source: null,
          coverPct: typeof beach.cover_pct === "number" ? beach.cover_pct : null,
        }
      : recent
        ? {
            level: recent.cover_level,
            recordedAt: recent.recorded_at,
            source: recent.source,
            coverPct: recent.cover_pct,
          }
        : useStaleReading && mostRecentReading
          ? {
              level: mostRecentReading.cover_level,
              recordedAt: mostRecentReading.recorded_at,
              source: mostRecentReading.source,
              coverPct: mostRecentReading.cover_pct,
            }
        : {
            level: beach.cover_level,
            recordedAt: beach.last_updated || null,
            source: null,
            coverPct: typeof beach.cover_pct === "number" ? beach.cover_pct : null,
          };
    const observationTimestamp = getTimestamp(observation.recordedAt);
    const isRecent = observationTimestamp !== null && observationTimestamp >= cutoff;

    if (!isRecent) {
      if (observationTimestamp === null) {
        unknownDateBeaches.push(beach.name);
      } else {
        staleBeaches.push(
          `${beach.name} (${formatDate(observation.recordedAt, language)})`,
        );
      }
      continue;
    }

    if (observation.level === "High") highBeaches.push(beach.name);

    if (recent && previous) {
      comparableBeachCount += 1;
      if (
        recent.cover_level !== previous.cover_level ||
        recent.cover_pct !== previous.cover_pct
      ) {
        changes.push(
          recent.cover_level !== previous.cover_level
            ? `${beach.name}: ${previous.cover_level} → ${recent.cover_level}`
            : `${beach.name}: the recorded cover estimate changed`,
        );
      }
    }
  }

  if (language === "sw") {
    const highLine = highBeaches.length
      ? `Fukwe zenye kiwango cha juu katika data ya siku saba zilizopita: ${highBeaches.join(", ")}.`
      : "Hakuna ufukwe uliothibitishwa kuwa na kiwango cha juu katika data ya siku saba zilizopita.";
    const changeLine = comparableBeachCount === 0
      ? "Mabadiliko tangu wiki iliyopita hayawezi kuthibitishwa: hakuna vipimo vya sasa na vya kulinganisha vya kutosha."
      : changes.length
        ? `Mabadiliko yaliyorekodiwa tangu wiki iliyopita: ${changes.join("; ")}.`
        : "Hakuna mabadiliko yaliyorekodiwa katika vipimo vinavyoweza kulinganishwa tangu wiki iliyopita.";
    const freshnessLine = [
      staleBeaches.length
        ? `Data ya ${staleBeaches.join(", ")} ni ya zamani zaidi ya siku saba; hali yake ya sasa haiwezi kuthibitishwa.`
        : "",
      unknownDateBeaches.length
        ? `Tarehe ya taarifa haipatikani kwa ${unknownDateBeaches.join(", ")}; hali yake ya sasa haiwezi kuthibitishwa.`
        : "",
      staleBeaches.length === 0 && unknownDateBeaches.length === 0
        ? beaches.length === 0
          ? "Hakuna taarifa za ufukwe zilizohifadhiwa; hali ya sasa haiwezi kuthibitishwa."
          : "Taarifa za ufukwe zilizotumika zimesasishwa ndani ya siku saba zilizopita."
        : "",
    ].filter(Boolean).join(" ");
    const sampleLine = hasSampleData
      ? "Data ya mfano: muhtasari huu unajumuisha vipimo vya mfano; si taarifa rasmi za ziwa."
      : "Dokezo la data: hakuna vipimo vya mfano vilivyopatikana katika data iliyotumika.";

    return [
      `Muhtasari wa kila siku wa ziwa · ${formatDate(new Date(now).toISOString(), "sw")}`,
      highLine,
      changeLine,
      freshnessLine,
      sampleLine,
      "Mapendekezo:",
      `Wavuvi: ${suggestions.fisher_sw}`,
      `Waendeshaji wa boti: ${suggestions.boat_operator_sw}`,
      `Wavunaji: ${suggestions.harvester_sw}`,
    ].join("\n");
  }

  const highLine = highBeaches.length
    ? `High beaches in readings from the last seven days: ${highBeaches.join(", ")}.`
    : "No beach is confirmed High in readings from the last seven days.";
  const changeLine = comparableBeachCount === 0
    ? "Changes since last week cannot be confirmed: there are not enough recent and comparison readings."
    : changes.length
      ? `Recorded changes since last week: ${changes.join("; ")}.`
      : "No change was recorded in the comparable readings since last week.";
  const freshnessLine = [
    staleBeaches.length
      ? `Data for ${staleBeaches.join(", ")} is older than seven days; current conditions there cannot be confirmed.`
      : "",
    unknownDateBeaches.length
      ? `The last-updated date is unavailable for ${unknownDateBeaches.join(", ")}; current conditions there cannot be confirmed.`
      : "",
    staleBeaches.length === 0 && unknownDateBeaches.length === 0
      ? beaches.length === 0
        ? "No saved Beach records were available; current conditions cannot be confirmed."
        : "The beach observations used here were updated within the last seven days."
      : "",
  ].filter(Boolean).join(" ");
  const sampleLine = hasSampleData
    ? "Sample data: this briefing includes illustrative sample readings, not official lake observations."
    : "Data note: no sample readings were found in the records used.";

  return [
    `Daily lake briefing · ${formatDate(new Date(now).toISOString(), "en")}`,
    highLine,
    changeLine,
    freshnessLine,
    sampleLine,
    "Suggested actions:",
    `Fishers: ${suggestions.fisher_en}`,
    `Boat operators: ${suggestions.boat_operator_en}`,
    `Harvesters: ${suggestions.harvester_en}`,
  ].join("\n");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export default async function (req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((error: { status?: number }) =>
      error.status === 401 ? null : Promise.reject(error),
    );
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = Date.now();
    const fourteenDaysAgo = now - 14 * DAY_MS;
    const [beaches, readings, sampleReadings] = await Promise.all([
      base44.asServiceRole.entities.Beach.list() as Promise<Beach[]>,
      loadRelevantReadings(base44, fourteenDaysAgo),
      base44.asServiceRole.entities.Reading.filter(
        { source: "sample" },
        "-recorded_at",
        1,
        0,
      ) as Promise<Reading[]>,
    ]);

    const hasSampleData =
      beaches.some((beach) => beach.is_sample === true) ||
      sampleReadings.length > 0;
    const createdAt = new Date(now).toISOString();
    const briefing = await base44.asServiceRole.entities.Briefing.create({
      text_en: buildBriefing(
        beaches,
        readings,
        hasSampleData,
        SUGGESTIONS,
        now,
        "en",
      ),
      text_sw: buildBriefing(
        beaches,
        readings,
        hasSampleData,
        SUGGESTIONS,
        now,
        "sw",
      ),
      created_at: createdAt,
    });

    return Response.json({ success: true, briefing });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
