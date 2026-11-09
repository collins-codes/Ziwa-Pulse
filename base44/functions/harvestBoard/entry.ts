import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";

type ActionInput = {
  action?: unknown;
  postId?: unknown;
  harvester_name?: unknown;
  phone?: unknown;
  beach?: unknown;
  estimated_tonnes?: unknown;
  condition?: unknown;
  available_from?: unknown;
  group_name?: unknown;
  type?: unknown;
  beaches?: unknown;
  max_tonnes?: unknown;
};

type Beach = {
  id: string;
  name: string;
};

type HarvestPost = {
  id: string;
  harvester_name: string;
  phone: string;
  beach: string;
  estimated_tonnes: number;
  condition: "fresh" | "dried";
  available_from: string;
  created_at?: string;
  status: "open" | "claimed" | "closed";
  claimed_by?: string;
  is_sample?: boolean;
};

type Buyer = {
  id: string;
  group_name: string;
  phone: string;
  type: "briquettes" | "biogas" | "crafts";
  beaches: string[];
  max_tonnes: number;
  is_sample?: boolean;
};

const localClaimQueues = new Map<string, Promise<void>>();

async function withLocalClaimLock<T>(
  postId: string,
  operation: () => Promise<T>,
): Promise<T> {
  const previous = localClaimQueues.get(postId) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  localClaimQueues.set(postId, current);
  await previous;

  try {
    return await operation();
  } finally {
    release();
    if (localClaimQueues.get(postId) === current) {
      localClaimQueues.delete(postId);
    }
  }
}

function isBuyerType(value: unknown): value is Buyer["type"] {
  return value === "briquettes" || value === "biogas" || value === "crafts";
}

function normalizeKenyanPhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const compact = value.trim().replace(/[\s()-]/g, "");
  if (!/^(?:0[17]\d{8}|\+?254[17]\d{8})$/.test(compact)) return null;
  const digits = compact.replace(/\D/g, "");
  return digits.startsWith("0") ? `+254${digits.slice(1)}` : `+${digits}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function isNonEmptyString(value: unknown, maximum: number): value is string {
  return typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= maximum;
}

function positiveTonnes(value: unknown): value is number {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= 10000;
}

function formatTonnes(value: number): string {
  return new Intl.NumberFormat("en-KE", { maximumFractionDigits: 2 }).format(value);
}

function buildHarvestMessage(post: HarvestPost, beachName: string): string {
  const tonnes = formatTonnes(post.estimated_tonnes);
  const englishCondition = post.condition === "fresh" ? "fresh" : "dried";
  const swahiliCondition = post.condition === "fresh" ? "mbichi" : "iliyokaushwa";
  const contact = post.phone;

  return [
    `Ziwa Pulse (EN): ${tonnes} tonnes of ${englishCondition} hyacinth material at ${beachName} is available from ${post.available_from}. Contact the harvester: ${contact}.`,
    `Ziwa Pulse (SW): Tani ${tonnes} za gugu maji ${swahiliCondition} zinapatikana ${beachName} kuanzia ${post.available_from}. Wasiliana na mvunaji: ${contact}.`,
  ].join(" ");
}

function validateBeachIds(value: unknown, knownIds: Set<string>): string[] | null {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > 20 ||
    value.some((id) => typeof id !== "string" || !knownIds.has(id))
  ) {
    return null;
  }
  const unique = [...new Set(value as string[])];
  return unique.length === value.length ? unique : null;
}

async function notifyMatchingBuyers(
  base44: ReturnType<typeof createClientFromRequest>,
  post: HarvestPost,
  beachName: string,
) {
  const buyers = await base44.asServiceRole.entities.Buyer.filter(
    { beaches: post.beach },
    null,
    5000,
    0,
  ) as Buyer[];
  const matchingBuyers = buyers.filter(
    (buyer) => buyer.beaches.includes(post.beach) &&
      buyer.max_tonnes >= post.estimated_tonnes,
  );
  const existing = await base44.asServiceRole.entities.SentMessage.filter(
    { harvest_post: post.id },
    null,
    5000,
    0,
    ["buyer"],
  );
  const alreadyNotified = new Set(existing.map((message) => message.buyer));
  const recipients = matchingBuyers.filter((buyer) => !alreadyNotified.has(buyer.id));
  const timestamp = new Date().toISOString();
  const results = await Promise.allSettled(
    recipients.map((buyer) =>
      base44.asServiceRole.entities.SentMessage.create({
        to: buyer.phone,
        text: buildHarvestMessage(post, beachName),
        beach: post.beach,
        status: "dry-run",
        time: timestamp,
        message_kind: "harvest",
        harvest_post: post.id,
        buyer: buyer.id,
        is_sample: post.is_sample === true,
      }),
    ),
  );
  const failed = results.filter((result) => result.status === "rejected").length;
  const created = results.length - failed;
  return {
    notified: created,
    failed,
    alreadyRecorded: matchingBuyers.length - recipients.length,
  };
}

function publicPost(post: HarvestPost, beachName: string) {
  return {
    id: post.id,
    harvester_name: post.harvester_name,
    beach: post.beach,
    beach_name: beachName,
    estimated_tonnes: post.estimated_tonnes,
    condition: post.condition,
    available_from: post.available_from,
    created_at: post.created_at,
    status: post.status,
    is_sample: post.is_sample === true,
  };
}

export default async function (req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => null) as ActionInput | null;
    if (!body || typeof body.action !== "string") {
      return Response.json({ error: "An action is required" }, { status: 400 });
    }

    if (body.action === "list") {
      const currentUser = await base44.auth.me().catch((error: { status?: number }) =>
        error.status === 401 ? null : Promise.reject(error),
      );
      const [openPosts, claimedPosts, buyers, beaches] = await Promise.all([
        base44.asServiceRole.entities.HarvestPost.filter(
          { status: "open" },
          "-created_at",
          100,
          0,
        ) as Promise<HarvestPost[]>,
        currentUser
          ? base44.asServiceRole.entities.HarvestPost.filter(
              { claimed_by: currentUser.id },
              "-created_at",
              100,
              0,
            ) as Promise<HarvestPost[]>
          : Promise.resolve([] as HarvestPost[]),
        base44.asServiceRole.entities.Buyer.filter(
          { is_sample: true },
          null,
          100,
          0,
        ) as Promise<Buyer[]>,
        base44.asServiceRole.entities.Beach.list() as Promise<Beach[]>,
      ]);
      const beachNames = new Map(beaches.map((beach) => [beach.id, beach.name]));
      const visiblePosts = [
        ...openPosts,
        ...claimedPosts.filter((post) => post.status === "claimed"),
      ];
      return Response.json({
        posts: visiblePosts
          .filter((post) => beachNames.has(post.beach))
          .map((post) => ({
            ...publicPost(post, beachNames.get(post.beach)!),
            claimed_by_me:
              currentUser !== null && post.claimed_by === currentUser.id,
          })),
        sampleBuyers: buyers.map((buyer) => ({
          group_name: buyer.group_name,
          type: buyer.type,
          beaches: buyer.beaches
            .map((beachId) => beachNames.get(beachId))
            .filter((name): name is string => Boolean(name)),
          max_tonnes: buyer.max_tonnes,
          is_sample: true,
        })),
      });
    }

    if (body.action === "createPost") {
      if (!isNonEmptyString(body.harvester_name, 120)) {
        return Response.json({ error: "Enter a harvester name or group." }, { status: 400 });
      }
      const phone = normalizeKenyanPhone(body.phone);
      if (!phone) {
        return Response.json({ error: "Enter a valid Kenyan mobile number." }, { status: 400 });
      }
      if (!isNonEmptyString(body.beach, 200)) {
        return Response.json({ error: "Choose a saved beach." }, { status: 400 });
      }
      if (!positiveTonnes(body.estimated_tonnes)) {
        return Response.json({ error: "Enter an amount above zero and no more than 10,000 tonnes." }, { status: 400 });
      }
      if (body.condition !== "fresh" && body.condition !== "dried") {
        return Response.json({ error: "Choose fresh or dried material." }, { status: 400 });
      }
      if (typeof body.available_from !== "string" || !Number.isFinite(Date.parse(body.available_from))) {
        return Response.json({ error: "Choose a valid availability date and time." }, { status: 400 });
      }

      const beaches = await base44.asServiceRole.entities.Beach.list() as Beach[];
      const beach = beaches.find((item) => item.id === body.beach);
      if (!beach) return Response.json({ error: "The selected beach was not found." }, { status: 400 });

      const createdAt = new Date().toISOString();
      const post = await base44.asServiceRole.entities.HarvestPost.create({
        harvester_name: body.harvester_name.trim(),
        phone,
        beach: beach.id,
        estimated_tonnes: body.estimated_tonnes,
        condition: body.condition,
        available_from: new Date(body.available_from).toISOString(),
        status: "open",
        created_at: createdAt,
        is_sample: false,
      }) as HarvestPost;

      let notification: {
        notified: number;
        failed: number;
        alreadyRecorded: number;
        error?: string;
      };
      try {
        notification = await notifyMatchingBuyers(base44, post, beach.name);
      } catch (notificationError) {
        notification = {
          notified: 0,
          failed: 0,
          alreadyRecorded: 0,
          error: errorMessage(notificationError),
        };
      }
      return Response.json({
        success: true,
        post: publicPost(post, beach.name),
        notification,
      });
    }

    if (body.action === "joinBuyer") {
      if (!isNonEmptyString(body.group_name, 120)) {
        return Response.json({ error: "Enter a group name." }, { status: 400 });
      }
      const phone = normalizeKenyanPhone(body.phone);
      if (!phone) {
        return Response.json({ error: "Enter a valid Kenyan mobile number." }, { status: 400 });
      }
      if (!isBuyerType(body.type)) {
        return Response.json({ error: "Choose briquettes, biogas, or crafts." }, { status: 400 });
      }
      if (!positiveTonnes(body.max_tonnes)) {
        return Response.json({ error: "Enter a maximum amount above zero and no more than 10,000 tonnes." }, { status: 400 });
      }
      const beaches = await base44.asServiceRole.entities.Beach.list() as Beach[];
      const beachIds = validateBeachIds(
        body.beaches,
        new Set(beaches.map((beach) => beach.id)),
      );
      if (!beachIds) {
        return Response.json({ error: "Choose one or more valid collection beaches." }, { status: 400 });
      }

      await base44.asServiceRole.entities.Buyer.create({
        group_name: body.group_name.trim(),
        phone,
        type: body.type,
        beaches: beachIds,
        max_tonnes: body.max_tonnes,
        is_sample: false,
      });
      return Response.json({ success: true });
    }

    if (body.action === "claim") {
      if (typeof body.postId !== "string" || body.postId.trim().length === 0) {
        return Response.json({ error: "A post ID is required." }, { status: 400 });
      }
      const user = await base44.auth.me().catch((error: { status?: number }) =>
        error.status === 401 ? null : Promise.reject(error),
      );
      if (!user) {
        return Response.json({ error: "Sign in before claiming a harvest post." }, { status: 401 });
      }

      const apiUrl = req.headers.get("Base44-Api-Url");
      const apiHostname = apiUrl ? new URL(apiUrl).hostname : null;
      const isLocalBackend =
        apiHostname === "localhost" ||
        apiHostname === "127.0.0.1" ||
        apiHostname === "::1";

      const claim = async () => {
        const post = await base44.asServiceRole.entities.HarvestPost.get(body.postId)
          .catch((error: { status?: number }) =>
            error.status === 404 ? null : Promise.reject(error),
          ) as HarvestPost | null;
        if (!post) return Response.json({ error: "Harvest post not found." }, { status: 404 });

        if (post.status === "claimed" && post.claimed_by === user.id) {
          return Response.json({
            success: true,
            phone: post.phone,
            alreadyClaimedByYou: true,
          });
        }
        if (post.status !== "open") {
          return Response.json({ error: "This harvest post is no longer open." }, { status: 409 });
        }

        if (isLocalBackend) {
          await base44.asServiceRole.entities.HarvestPost.update(post.id, {
            status: "claimed",
            claimed_by: user.id,
          });
        } else {
          const claimResult = await base44.asServiceRole.entities.HarvestPost.updateMany(
            { id: post.id, status: "open" },
            { $set: { status: "claimed", claimed_by: user.id } },
          );
          if (claimResult.updated === 0) {
            return Response.json({ error: "Another buyer has already claimed this post." }, { status: 409 });
          }
        }

        return Response.json({ success: true, phone: post.phone });
      };

      return isLocalBackend
        ? await withLocalClaimLock(body.postId, claim)
        : await claim();
    }

    return Response.json({ error: "Unsupported harvest board action." }, { status: 400 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
