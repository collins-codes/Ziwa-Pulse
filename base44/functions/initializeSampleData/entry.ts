import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";

type Beach = {
  id: string;
  name: string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export default async function (req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const createdCounts: Record<string, number> = {};
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((error: { status?: number }) =>
      error.status === 401 ? null : Promise.reject(error),
    );
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const [
      existingBeaches,
      existingReadings,
      existingFieldReports,
      existingCommunityReports,
      existingHarvestPosts,
      existingBuyers,
    ] = await Promise.all([
      base44.asServiceRole.entities.Beach.filter({}, null, 1, 0),
      base44.asServiceRole.entities.Reading.filter({}, null, 1, 0),
      base44.asServiceRole.entities.FieldReport.filter({}, null, 1, 0),
      base44.asServiceRole.entities.CommunityReport.filter({}, null, 1, 0),
      base44.asServiceRole.entities.HarvestPost.filter({}, null, 1, 0),
      base44.asServiceRole.entities.Buyer.filter({}, null, 1, 0),
    ]);

    const tableRows: Array<[string, unknown[]]> = [
      ["Beach", existingBeaches],
      ["Reading", existingReadings],
      ["FieldReport", existingFieldReports],
      ["CommunityReport", existingCommunityReports],
      ["HarvestPost", existingHarvestPosts],
      ["Buyer", existingBuyers],
    ];
    const occupiedTables = tableRows
      .filter(([, rows]) => rows.length > 0)
      .map(([name]) => name);

    if (occupiedTables.length > 0) {
      return Response.json(
        {
          error: `Sample data was not initialized because these tables are not empty: ${occupiedTables.join(", ")}.`,
        },
        { status: 409 },
      );
    }

    const now = new Date();
    const createdAt = now.toISOString();
    const beachRows = [
      {
        name: "Kendu Bay",
        county: "Homa Bay",
        lat: -0.355,
        lng: 34.65,
        cover_level: "Medium",
        cover_pct: 38,
      },
      {
        name: "Kisumu (Dunga)",
        county: "Kisumu",
        lat: -0.144622,
        lng: 34.7366801,
        cover_level: "Low",
        cover_pct: 18,
      },
      {
        name: "Asembo Bay",
        county: "Siaya",
        lat: -0.183341,
        lng: 34.3857105,
        cover_level: "High",
        cover_pct: 72,
      },
      {
        name: "Luanda Kotieno",
        county: "Siaya",
        lat: -0.3856916,
        lng: 34.2832107,
        cover_level: "Medium",
        cover_pct: 46,
      },
      {
        name: "Homa Bay",
        county: "Homa Bay",
        lat: -0.5223708,
        lng: 34.4545856,
        cover_level: "Low",
        cover_pct: 22,
      },
    ].map((beach) => ({
      ...beach,
      last_updated: createdAt,
      is_sample: true,
    }));

    const beaches = await base44.asServiceRole.entities.Beach.bulkCreate(
      beachRows,
    ) as Beach[];
    createdCounts.Beach = beaches.length;
    const beachByName = new Map(beaches.map((beach) => [beach.name, beach]));
    const requiredBeach = (name: string) => {
      const beach = beachByName.get(name);
      if (!beach) throw new Error(`Created beach is missing: ${name}.`);
      return beach;
    };

    const dates = [
      "2025-09-08T09:00:00+03:00",
      "2025-09-22T09:00:00+03:00",
      "2025-10-06T09:00:00+03:00",
      "2025-10-20T09:00:00+03:00",
      "2025-11-03T09:00:00+03:00",
      "2025-11-17T09:00:00+03:00",
      "2025-12-01T09:00:00+03:00",
      "2025-12-15T09:00:00+03:00",
    ];
    const levelsByBeach: Record<string, number[]> = {
      "Kendu Bay": [12, 16, 20, 27, 35, 44, 53, 61],
      "Kisumu (Dunga)": [6, 9, 12, 16, 21, 27, 34, 41],
      "Asembo Bay": [15, 22, 30, 39, 49, 59, 68, 76],
      "Luanda Kotieno": [10, 15, 20, 26, 34, 42, 50, 57],
      "Homa Bay": [8, 12, 16, 21, 27, 34, 41, 48],
    };
    const readings = beaches.flatMap((beach) => {
      const levels = levelsByBeach[beach.name];
      if (!levels) throw new Error(`Sample readings are missing for ${beach.name}.`);
      return dates.map((recordedAt, index) => {
        const coverPct = levels[index];
        if (typeof coverPct !== "number") {
          throw new Error(`Sample reading ${index + 1} is missing for ${beach.name}.`);
        }
        return {
          beach: beach.id,
          cover_level: coverPct < 30 ? "Low" : coverPct < 60 ? "Medium" : "High",
          cover_pct: coverPct,
          recorded_at: recordedAt,
          source: "sample",
        };
      });
    });
    await base44.asServiceRole.entities.Reading.bulkCreate(readings);
    createdCounts.Reading = readings.length;

    const sampleReports = [
      {
        sample_key: "sample-dunga-verified",
        beach: requiredBeach("Kisumu (Dunga)").id,
        description: "Sample report: a small patch of hyacinth is visible near the landing area.",
        reporter_name: "Ziwa Pulse demo",
        status: "verified",
        is_sample: true,
        created_at: createdAt,
      },
      {
        sample_key: "sample-kendu-pending",
        beach: requiredBeach("Kendu Bay").id,
        description: "Sample report: community members noticed hyacinth drifting along the shore.",
        reporter_name: "Ziwa Pulse demo",
        status: "pending",
        is_sample: true,
        created_at: createdAt,
      },
    ];
    await base44.asServiceRole.entities.FieldReport.bulkCreate(sampleReports);
    createdCounts.FieldReport = sampleReports.length;
    const verifiedReport = sampleReports[0];
    await base44.asServiceRole.entities.CommunityReport.create({
      sample_key: verifiedReport.sample_key,
      beach: verifiedReport.beach,
      description: verifiedReport.description,
      created_at: verifiedReport.created_at,
      is_sample: true,
    });
    createdCounts.CommunityReport = 1;

    const buyers = [
      {
        sample_key: "buyer-briquettes-demo",
        group_name: "Lake Circular Group",
        phone: "+254700000001",
        type: "briquettes",
        beaches: [requiredBeach("Kendu Bay").id, requiredBeach("Kisumu (Dunga)").id],
        max_tonnes: 5,
        is_sample: true,
      },
      {
        sample_key: "buyer-biogas-demo",
        group_name: "Green Flame Collective",
        phone: "+254700000002",
        type: "biogas",
        beaches: [requiredBeach("Asembo Bay").id, requiredBeach("Luanda Kotieno").id],
        max_tonnes: 3,
        is_sample: true,
      },
      {
        sample_key: "buyer-crafts-demo",
        group_name: "Shoreline Craft Makers",
        phone: "+254700000003",
        type: "crafts",
        beaches: [requiredBeach("Kendu Bay").id, requiredBeach("Homa Bay").id],
        max_tonnes: 1.5,
        is_sample: true,
      },
    ];
    await base44.asServiceRole.entities.Buyer.bulkCreate(buyers);
    createdCounts.Buyer = buyers.length;

    const availability = new Date(now);
    availability.setDate(availability.getDate() + 1);
    const nextAvailability = new Date(availability);
    nextAvailability.setDate(nextAvailability.getDate() + 1);
    const posts = [
      {
        sample_key: "harvest-post-kendu-demo",
        harvester_name: "Kendu Bay Community Harvesters",
        phone: "+254711000001",
        beach: requiredBeach("Kendu Bay").id,
        estimated_tonnes: 2.4,
        condition: "fresh",
        available_from: availability.toISOString(),
        status: "open",
        created_at: createdAt,
        is_sample: true,
      },
      {
        sample_key: "harvest-post-asembo-demo",
        harvester_name: "Asembo Shore Group",
        phone: "+254711000002",
        beach: requiredBeach("Asembo Bay").id,
        estimated_tonnes: 1.2,
        condition: "dried",
        available_from: nextAvailability.toISOString(),
        status: "open",
        created_at: createdAt,
        is_sample: true,
      },
    ];
    await base44.asServiceRole.entities.HarvestPost.bulkCreate(posts);
    createdCounts.HarvestPost = posts.length;

    return Response.json({ success: true, createdCounts });
  } catch (error) {
    const detail = Object.keys(createdCounts).length > 0
      ? ` Initialization stopped after creating ${Object.entries(createdCounts)
        .map(([entity, count]) => `${count} ${entity}`)
        .join(", ")}. No records were deleted.`
      : "";
    return Response.json(
      { error: `${errorMessage(error)}${detail}`, createdCounts },
      { status: 500 },
    );
  }
}
