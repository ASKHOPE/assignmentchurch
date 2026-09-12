/**
 * Cloudflare Workers Entrypoint
 * High-performance edge deployment serving static assets and REST API endpoints backed by Cloudflare D1.
 */

import {
  getAgendaByDateD1,
  saveAgendaD1,
  getAllSavedSundaysD1,
  getAutocompleteSuggestionsD1,
  exportAllDataD1,
  importAllDataD1,
} from "./d1-db";
import {
  formatFullAgendaWhatsApp,
  formatSacramentWhatsApp,
  formatClassesWhatsApp,
  formatIndividualReminderWhatsApp,
  getWhatsAppShareUrl,
} from "./whatsapp-formatter";
import { getHolidaysForYear } from "./holidays";
import { createDefaultAgenda } from "./agenda-utils";

export interface Env {
  ASSETS: Fetcher;
  DB?: D1Database;
}

// In-memory fallback if D1 database binding is not configured
const memoryStore: Record<string, any> = {};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // Route API requests
    if (path.startsWith("/api/")) {
      try {
        // GET /api/agenda/:date
        const agendaMatch = path.match(/^\/api\/agenda\/(\d{4}-\d{2}-\d{2})$/);
        if (request.method === "GET" && agendaMatch) {
          const date = agendaMatch[1];
          let agenda;
          if (env.DB) {
            agenda = await getAgendaByDateD1(env.DB, date);
          } else {
            agenda = memoryStore[date] || createDefaultAgenda(date);
          }
          return Response.json({ success: true, data: agenda }, {
            headers: { "Access-Control-Allow-Origin": "*" },
          });
        }

        // PUT /api/agenda/:date
        if (request.method === "PUT" && agendaMatch) {
          const date = agendaMatch[1];
          const body = await request.json();
          let saved;
          if (env.DB) {
            saved = await saveAgendaD1(env.DB, { ...body, date });
          } else {
            const current = memoryStore[date] || createDefaultAgenda(date);
            saved = { ...current, ...body, date, updated_at: new Date().toISOString() };
            memoryStore[date] = saved;
          }
          return Response.json({ success: true, data: saved }, {
            headers: { "Access-Control-Allow-Origin": "*" },
          });
        }

        // GET /api/sundays
        if (request.method === "GET" && path === "/api/sundays") {
          let sundays: string[] = [];
          if (env.DB) {
            sundays = await getAllSavedSundaysD1(env.DB);
          } else {
            sundays = Object.keys(memoryStore).sort();
          }
          return Response.json({ success: true, sundays }, {
            headers: { "Access-Control-Allow-Origin": "*" },
          });
        }

        // GET /api/autocomplete
        if (request.method === "GET" && path === "/api/autocomplete") {
          const category = url.searchParams.get("category") || undefined;
          const q = url.searchParams.get("q") || undefined;
          let suggestions: string[] = [];
          if (env.DB) {
            suggestions = await getAutocompleteSuggestionsD1(env.DB, category, q);
          } else {
            suggestions = ["Brother", "Sister", "Bishopric", "Sahitya", "Elders Quorum", "Relief Society"];
          }
          return Response.json({ success: true, suggestions }, {
            headers: { "Access-Control-Allow-Origin": "*" },
          });
        }

        // POST /api/share/whatsapp
        if (request.method === "POST" && path === "/api/share/whatsapp") {
          const body = (await request.json()) as any;
          const date = body.date;
          const preset = body.preset || "full";
          let agenda;
          if (env.DB) {
            agenda = await getAgendaByDateD1(env.DB, date);
          } else {
            agenda = memoryStore[date] || createDefaultAgenda(date);
          }

          let text = "";
          if (preset === "sacrament") {
            text = formatSacramentWhatsApp(agenda);
          } else if (preset === "classes") {
            text = formatClassesWhatsApp(agenda);
          } else if (preset === "reminder") {
            text = formatIndividualReminderWhatsApp(
              body.roleOrClass || "Speaker/Teacher",
              body.name || "",
              body.topic || "",
              date,
              body.url
            );
          } else {
            text = formatFullAgendaWhatsApp(agenda);
          }

          const shareUrl = getWhatsAppShareUrl(text);
          return Response.json({ success: true, text, url: shareUrl }, {
            headers: { "Access-Control-Allow-Origin": "*" },
          });
        }

        // GET /api/holidays
        if (request.method === "GET" && path === "/api/holidays") {
          const yearStr = url.searchParams.get("year");
          const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();
          const includeIndian = url.searchParams.get("include_indian") !== "false";
          const holidays = await getHolidaysForYear(year, includeIndian);
          return Response.json({ success: true, year, count: holidays.length, holidays }, {
            headers: { "Access-Control-Allow-Origin": "*" },
          });
        }

        // GET /api/export
        if (request.method === "GET" && path === "/api/export") {
          let backup;
          if (env.DB) {
            backup = await exportAllDataD1(env.DB);
          } else {
            backup = { version: 1, timestamp: new Date().toISOString(), agendas: Object.values(memoryStore), autocomplete_history: [] };
          }
          return new Response(JSON.stringify(backup, null, 2), {
            headers: {
              "Content-Type": "application/json",
              "Content-Disposition": `attachment; filename="agenda-backup-${Date.now()}.json"`,
              "Access-Control-Allow-Origin": "*",
            },
          });
        }

        // POST /api/import
        if (request.method === "POST" && path === "/api/import") {
          const body = (await request.json()) as any;
          if (env.DB) {
            await importAllDataD1(env.DB, body);
          } else if (body?.agendas) {
            for (const a of body.agendas) {
              memoryStore[a.date] = a;
            }
          }
          return Response.json({ success: true }, {
            headers: { "Access-Control-Allow-Origin": "*" },
          });
        }

        return Response.json({ error: "Endpoint not found" }, { status: 404 });
      } catch (err: any) {
        return Response.json({ error: err.message || "Internal server error" }, { status: 500 });
      }
    }

    // Static Assets from /public (HTML, CSS, JS, etc.)
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  },
};
