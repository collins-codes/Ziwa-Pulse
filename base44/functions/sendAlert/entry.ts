import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import { DRY_RUN } from "./settings.ts";

type SendAlertInput = {
  alertEventId?: unknown;
};

function buildAlertText(
  language: unknown,
  beachName: string,
  coverLevel: string,
  mapUrl: string,
): string {
  if (language === "sw") {
    const swahiliLevel: Record<string, string> = {
      Low: "CHINI",
      Medium: "WASTANI",
      High: "JUU",
    };
    return `Ziwa Pulse: Gugu maji katika ${beachName} sasa yako ${
      swahiliLevel[coverLevel] ?? coverLevel.toUpperCase()
    }. Ramani: ${mapUrl}`;
  }

  return `Ziwa Pulse: Hyacinth cover at ${beachName} is now ${coverLevel.toUpperCase()}. Map: ${mapUrl}`;
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
    const user = await base44.auth
      .me()
      .catch((error: { status?: number }) =>
        error.status === 401 ? null : Promise.reject(error),
      );

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as SendAlertInput;
    if (
      typeof body.alertEventId !== "string" ||
      body.alertEventId.trim().length === 0
    ) {
      return Response.json(
        { error: "alertEventId is required" },
        { status: 400 },
      );
    }
    if (!DRY_RUN) {
      return Response.json(
        { error: "Live SMS sending is not configured in this dry-run build" },
        { status: 503 },
      );
    }

    const alertEvent = await base44.entities.AlertEvent
      .get(body.alertEventId)
      .catch((error: { status?: number }) =>
        error.status === 404 ? null : Promise.reject(error),
      );
    if (!alertEvent) {
      return Response.json({ error: "Alert event not found" }, { status: 404 });
    }

    const beach = await base44.entities.Beach
      .get(alertEvent.beach)
      .catch((error: { status?: number }) =>
        error.status === 404 ? null : Promise.reject(error),
      );
    if (!beach) {
      return Response.json({ error: "Beach not found" }, { status: 404 });
    }

    const subscribers = await base44.entities.Subscriber.filter(
      { beaches: beach.id },
      "-created_date",
      5000,
      0,
    );
    const existingMessages = await base44.entities.SentMessage.filter(
      { alert_event: alertEvent.id },
      "-time",
      5000,
      0,
      ["subscriber"],
    );
    const recordedSubscriberIds = new Set(
      existingMessages.map((message) => message.subscriber),
    );
    const newSubscribers = subscribers.filter(
      (subscriber) => !recordedSubscriberIds.has(subscriber.id),
    );
    const appUrl =
      req.headers.get("X-Base44-App-Url") ??
      req.headers.get("Origin") ??
      req.headers.get("Referer");

    if (!appUrl) {
      return Response.json(
        { error: "Could not determine the app link for the alert" },
        { status: 500 },
      );
    }

    const mapUrl = new URL("/", appUrl).toString();
    const createdAt = new Date().toISOString();
    const failures: string[] = [];
    let created = 0;

    for (let index = 0; index < newSubscribers.length; index += 6) {
      const batch = newSubscribers.slice(index, index + 6);
      const results = await Promise.allSettled(
        batch.map((subscriber) =>
          base44.entities.SentMessage.create({
            to: subscriber.phone,
            text: buildAlertText(
              subscriber.language,
              beach.name,
              alertEvent.new_level,
              mapUrl,
            ),
            beach: beach.id,
            status: "dry-run",
            time: createdAt,
            alert_event: alertEvent.id,
            subscriber: subscriber.id,
          }),
        ),
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          created += 1;
        } else {
          failures.push(errorMessage(result.reason));
        }
      }
    }

    if (failures.length > 0) {
      return Response.json(
        {
          error: "Some dry-run messages could not be recorded",
          created,
          failed: failures.length,
        },
        { status: 500 },
      );
    }

    return Response.json({
      dryRun: true,
      beach: beach.name,
      prepared: created,
      alreadyRecorded: subscribers.length - newSubscribers.length,
    });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
