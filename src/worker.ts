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
  searchHymnsD1,
  searchConferenceTalksD1,
  getComeFollowMeD1,
  searchGospelPrinciplesD1,
  getFsyLessonsD1,
  getConferenceMetaD1,
  getFsyMetaD1,
  seedChurchDataD1,
  seedGospelPrinciplesD1,
  seedFsyLessonsD1,
} from "./d1-db";
import {
  formatFullAgendaWhatsApp,
  formatSacramentWhatsApp,
  formatClassesWhatsApp,
  formatAssignmentsWhatsApp,
  formatIndividualReminderWhatsApp,
  getWhatsAppShareUrl,
} from "./whatsapp-formatter";
import { getHolidaysForYear } from "./holidays";
import { createDefaultAgenda } from "./agenda-utils";
import { mergeAgendas } from "./merge-engine";
import { defaultRateLimiter } from "./rate-limiter";
import { defaultWriteQueue } from "./write-queue";

import hymnsFallback from "../data/hymns.json";
import talksFallback from "../data/conference-talks.json";
import cfmFallback from "../data/come-follow-me.json";
import gpFallback from "../data/gospel-principles.json";
import fsyFallback from "../data/fsy-lessons.json";

export interface Env {
  ASSETS: Fetcher;
  DB?: D1Database;
}

// In-memory fallback if D1 database binding is not configured
const memoryStore: Record<string, any> = {};

function getOrSetEditorId(req: Request): { editorId: string; isNew: boolean; cookieHeader?: string } {
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/ward_editor_id=([^;]+)/);
  if (match && match[1]) {
    return { editorId: match[1].trim(), isNew: false };
  }
  const editorId = `editor_${crypto.randomUUID()}`;
  const newCookie = `ward_editor_id=${editorId}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly`;
  return { editorId, isNew: true, cookieHeader: newCookie };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const { editorId, isNew, cookieHeader } = getOrSetEditorId(request);

    const withHeaders = (headers: Record<string, string> = {}): Record<string, string> => {
      const resHeaders: Record<string, string> = {
        "Access-Control-Allow-Origin": "*",
        ...headers,
      };
      if (isNew && cookieHeader) {
        resHeaders["Set-Cookie"] = cookieHeader;
      }
      return resHeaders;
    };

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

    // Rate Limiting Enforcement
    const isWrite = request.method === "PUT" || request.method === "POST" || request.method === "DELETE";
    const clientKey = `${editorId}:${request.headers.get("cf-connecting-ip") || "edge"}`;
    const rateResult = defaultRateLimiter.check(clientKey, isWrite);

    if (!rateResult.allowed) {
      return Response.json(
        {
          success: false,
          error: "Too many modifications. Please wait a moment before saving again.",
          resetInSec: rateResult.resetInSec,
        },
        {
          status: 429,
          headers: withHeaders({
            "Retry-After": String(rateResult.resetInSec),
          }),
        }
      );
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
            headers: withHeaders(),
          });
        }

        // PUT /api/agenda/:date (Serialized per-date write queue)
        if (request.method === "PUT" && agendaMatch) {
          const date = agendaMatch[1];
          const body = (await request.json()) as any;
          
          const saved = await defaultWriteQueue.run(date, async () => {
            if (env.DB) {
              return await saveAgendaD1(env.DB, { ...body, date });
            } else {
              const current = memoryStore[date] || createDefaultAgenda(date);
              const { merged, isConcurrentMerge, conflicts } = mergeAgendas(current, { ...body, date });
              memoryStore[date] = merged;
              return { ...merged, _isConcurrentMerge: isConcurrentMerge, _conflicts: conflicts };
            }
          });

          return Response.json({ 
            success: true, 
            data: saved,
            merged: Boolean(saved._isConcurrentMerge),
            conflicts: saved._conflicts || [],
          }, {
            headers: withHeaders(),
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

        // GET /api/hymns
        if (request.method === "GET" && path === "/api/hymns") {
          const q = (url.searchParams.get("q") || "").toLowerCase().trim();
          const book = url.searchParams.get("book") || undefined;
          const limit = parseInt(url.searchParams.get("limit") || "700", 10);
          let hymns = [];
          if (env.DB) {
            hymns = await searchHymnsD1(env.DB, q, book, limit);
          } else {
            hymns = (hymnsFallback as any[]).filter(h => {
              if (book && book !== "all" && h.book !== book) return false;
              if (q) {
                if (String(h.number).includes(q) || h.title.toLowerCase().includes(q)) return true;
                return false;
              }
              return true;
            }).slice(0, limit);
          }
          return Response.json({ success: true, count: hymns.length, hymns }, {
            headers: { "Access-Control-Allow-Origin": "*" },
          });
        }

        // GET /api/talks
        if (request.method === "GET" && path === "/api/talks") {
          const q = (url.searchParams.get("q") || "").toLowerCase().trim();
          const speaker = (url.searchParams.get("speaker") || "").toLowerCase().trim();
          const yearStr = url.searchParams.get("year");
          const year = yearStr ? parseInt(yearStr, 10) : undefined;
          const limit = parseInt(url.searchParams.get("limit") || "600", 10);
          let talks = [];
          if (env.DB) {
            talks = await searchConferenceTalksD1(env.DB, q, speaker, year, limit);
          } else {
            talks = (talksFallback as any[]).filter(t => {
              if (year && t.year !== year) return false;
              if (speaker && !t.speaker.toLowerCase().includes(speaker)) return false;
              if (q && !t.title.toLowerCase().includes(q) && !t.speaker.toLowerCase().includes(q)) return false;
              return true;
            }).slice(0, limit);
          }
          return Response.json({ success: true, count: talks.length, talks }, {
            headers: { "Access-Control-Allow-Origin": "*" },
          });
        }

        // GET /api/talks/meta
        if (request.method === "GET" && path === "/api/talks/meta") {
          let meta = { years: [] as number[], speakers: [] as string[] };
          if (env.DB) {
            meta = await getConferenceMetaD1(env.DB);
          } else {
            const years = [...new Set((talksFallback as any[]).map(t => t.year))].sort((a,b) => b - a);
            const speakerCounts: Record<string, number> = {};
            (talksFallback as any[]).forEach(t => {
              if (!t.speaker.includes("Session") && !t.speaker.includes("Auditor")) {
                speakerCounts[t.speaker] = (speakerCounts[t.speaker] || 0) + 1;
              }
            });
            const speakers = Object.keys(speakerCounts).sort((a,b) => speakerCounts[b] - speakerCounts[a] || a.localeCompare(b));
            meta = { years, speakers };
          }
          return Response.json({ success: true, ...meta }, {
            headers: { "Access-Control-Allow-Origin": "*" },
          });
        }

        // GET /api/fsy-lessons/meta
        if (request.method === "GET" && path === "/api/fsy-lessons/meta") {
          let months: { month: number; year: number }[] = [];
          if (env.DB) {
            const meta = await getFsyMetaD1(env.DB);
            months = meta.months;
          } else {
            const seen = new Set<string>();
            (fsyFallback as any[]).forEach(f => {
              const k = `${f.year}-${f.month}`;
              if (!seen.has(k)) {
                seen.add(k);
                months.push({ year: f.year, month: f.month });
              }
            });
          }
          return Response.json({ success: true, months }, {
            headers: { "Access-Control-Allow-Origin": "*" },
          });
        }

        // GET /api/come-follow-me
        if (request.method === "GET" && path === "/api/come-follow-me") {
          const yearStr = url.searchParams.get("year");
          const year = yearStr ? parseInt(yearStr, 10) : undefined;
          const q = (url.searchParams.get("q") || "").toLowerCase().trim();
          let lessons = [];
          if (env.DB) {
            lessons = await getComeFollowMeD1(env.DB, year, q);
          } else {
            lessons = (cfmFallback as any[]).filter(c => {
              if (year && c.year !== year) return false;
              if (q && !c.title.toLowerCase().includes(q) && !c.scriptures.toLowerCase().includes(q)) return false;
              return true;
            });
          }
          return Response.json({ success: true, count: lessons.length, lessons }, {
            headers: { "Access-Control-Allow-Origin": "*" },
          });
        }

        // GET /api/gospel-principles
        if (request.method === "GET" && path === "/api/gospel-principles") {
          const q = (url.searchParams.get("q") || "").toLowerCase().trim();
          const limit = parseInt(url.searchParams.get("limit") || "60", 10);
          let chapters = [];
          if (env.DB) {
            chapters = await searchGospelPrinciplesD1(env.DB, q, limit);
          } else {
            chapters = (gpFallback as any[]).filter(c => {
              if (q && !c.title.toLowerCase().includes(q) && !String(c.chapter_number).includes(q)) return false;
              return true;
            }).slice(0, limit);
          }
          return Response.json({ success: true, count: chapters.length, chapters }, {
            headers: { "Access-Control-Allow-Origin": "*" },
          });
        }

        // GET /api/fsy-lessons
        if (request.method === "GET" && path === "/api/fsy-lessons") {
          const yearStr = url.searchParams.get("year");
          const year = yearStr ? parseInt(yearStr, 10) : undefined;
          const monthStr = url.searchParams.get("month");
          const month = monthStr ? parseInt(monthStr, 10) : undefined;
          const sundayStr = url.searchParams.get("sunday");
          const sundayNumber = sundayStr ? parseInt(sundayStr, 10) : undefined;
          const org = url.searchParams.get("org") || undefined;
          let lessons = [];
          if (env.DB) {
            lessons = await getFsyLessonsD1(env.DB, year, month, sundayNumber, org);
          } else {
            lessons = (fsyFallback as any[]).filter(l => {
              if (year && l.year !== year) return false;
              if (month && l.month !== month) return false;
              if (sundayNumber && l.sunday_number !== sundayNumber) return false;
              if (org && org !== "all" && l.organization !== "both" && l.organization !== org) return false;
              return true;
            });
          }
          return Response.json({ success: true, count: lessons.length, lessons }, {
            headers: { "Access-Control-Allow-Origin": "*" },
          });
        }

        // GET /api/admin/seed-d1 (One-click seed of remote Cloudflare D1)
        if (request.method === "GET" && path === "/api/admin/seed-d1") {
          if (!env.DB) {
            return Response.json({ error: "No DB binding found" }, { status: 400 });
          }
          const result = await seedChurchDataD1(env.DB, hymnsFallback, talksFallback, cfmFallback, gpFallback, fsyFallback);
          return Response.json({ 
            success: true, 
            message: "Cloudflare D1 seeded successfully with all 5 church datasets!", 
            ...result
          }, {
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
          } else if (preset === "assignments") {
            text = formatAssignmentsWhatsApp(agenda);
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
