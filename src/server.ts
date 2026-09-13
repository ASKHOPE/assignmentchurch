import { Database } from "bun:sqlite";
import { 
  initDb, 
  getAgendaByDate, 
  saveAgenda, 
  getAllSavedSundays, 
  getAutocompleteSuggestions, 
  exportAllData, 
  importAllData,
  searchHymns,
  searchConferenceTalks,
  getComeFollowMe,
  searchGospelPrinciples,
  getFsyLessons,
  getConferenceMeta,
  getFsyMeta,
  authenticateUser,
  getAllAuthUsers,
  saveAuthUser,
  deleteAuthUser,
  runDatabaseSpeedtest
} from "./db";
import { 
  formatFullAgendaWhatsApp, 
  formatSacramentWhatsApp, 
  formatClassesWhatsApp, 
  formatAssignmentsWhatsApp,
  formatIndividualReminderWhatsApp, 
  getWhatsAppShareUrl 
} from "./whatsapp-formatter";
import { getNextSunday, getPrevSunday } from "./agenda-utils";
import { getHolidaysForYear } from "./holidays";
import { defaultRateLimiter } from "./rate-limiter";
import { defaultWriteQueue } from "./write-queue";
import { join } from "path";

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

export function createServer(dbPath: string = "agenda.db", port: number = 3000) {
  const db = initDb(dbPath);

  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);
      const path = url.pathname;
      const { editorId, isNew, cookieHeader } = getOrSetEditorId(req);

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

      // Handle CORS for local network development
      if (req.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }

      // Rate Limiter Enforcement
      const isWrite = req.method === "PUT" || req.method === "POST" || req.method === "DELETE";
      const clientKey = `${editorId}:${req.headers.get("x-forwarded-for") || "local"}`;
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

      // REST API Routes
      if (path.startsWith("/api/")) {
        try {
          // GET /api/agenda/:date
          if (req.method === "GET" && path.startsWith("/api/agenda/")) {
            const date = path.replace("/api/agenda/", "").trim();
            if (!date) {
              return Response.json({ success: false, error: "Date parameter required" }, { status: 400 });
            }
            const data = getAgendaByDate(db, date);
            return Response.json({ success: true, data }, {
              headers: withHeaders()
            });
          }

          // PUT /api/agenda/:date (Serialized through per-date write queue)
          if (req.method === "PUT" && path.startsWith("/api/agenda/")) {
            const date = path.replace("/api/agenda/", "").trim();
            if (!date) {
              return Response.json({ success: false, error: "Date parameter required" }, { status: 400 });
            }
            const body = (await req.json()) as any;

            const saved = await defaultWriteQueue.run(date, async () => {
              return saveAgenda(db, { ...body, date });
            });

            return Response.json({ 
              success: true, 
              data: saved,
              merged: Boolean(saved._isConcurrentMerge),
              conflicts: saved._conflicts || [],
            }, {
              headers: withHeaders()
            });
          }

          // GET /api/sundays
          if (req.method === "GET" && path === "/api/sundays") {
            const saved = getAllSavedSundays(db);
            const today = new Date().toISOString().split("T")[0];
            return Response.json({ 
              success: true, 
              saved,
              next: getNextSunday(today),
              prev: getPrevSunday(today)
            }, {
              headers: { "Access-Control-Allow-Origin": "*" }
            });
          }

          // GET /api/autocomplete
          if (req.method === "GET" && path === "/api/autocomplete") {
            const category = url.searchParams.get("category") || undefined;
            const q = url.searchParams.get("q") || undefined;
            const suggestions = getAutocompleteSuggestions(db, category, q);
            return Response.json({ success: true, suggestions }, {
              headers: { "Access-Control-Allow-Origin": "*" }
            });
          }

          // GET /api/holidays
          if (req.method === "GET" && path === "/api/holidays") {
            const yearStr = url.searchParams.get("year");
            const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();
            const includeIndian = url.searchParams.get("include_indian") !== "false";
            const holidays = await getHolidaysForYear(year, includeIndian);
            return Response.json({ success: true, year, count: holidays.length, holidays }, {
              headers: { "Access-Control-Allow-Origin": "*" }
            });
          }

          // GET /api/hymns
          if (req.method === "GET" && path === "/api/hymns") {
            const q = url.searchParams.get("q") || undefined;
            const book = url.searchParams.get("book") || undefined;
            const limit = parseInt(url.searchParams.get("limit") || "700", 10);
            const hymns = searchHymns(db, q, book, limit);
            return Response.json({ success: true, count: hymns.length, hymns }, {
              headers: { "Access-Control-Allow-Origin": "*" }
            });
          }

          // GET /api/talks
          if (req.method === "GET" && path === "/api/talks") {
            const q = url.searchParams.get("q") || undefined;
            const speaker = url.searchParams.get("speaker") || undefined;
            const yearStr = url.searchParams.get("year");
            const year = yearStr ? parseInt(yearStr, 10) : undefined;
            const limit = parseInt(url.searchParams.get("limit") || "600", 10);
            const talks = searchConferenceTalks(db, q, speaker, year, limit);
            return Response.json({ success: true, count: talks.length, talks }, {
              headers: { "Access-Control-Allow-Origin": "*" }
            });
          }

          // GET /api/talks/meta
          if (req.method === "GET" && path === "/api/talks/meta") {
            const meta = getConferenceMeta(db);
            return Response.json({ success: true, ...meta }, {
              headers: { "Access-Control-Allow-Origin": "*" }
            });
          }

          // GET /api/fsy-lessons/meta
          if (req.method === "GET" && path === "/api/fsy-lessons/meta") {
            const meta = getFsyMeta(db);
            return Response.json({ success: true, ...meta }, {
              headers: { "Access-Control-Allow-Origin": "*" }
            });
          }

          // POST /api/auth/login (Format: "[Name] dowleswaram")
          if (req.method === "POST" && path === "/api/auth/login") {
            const body = (await req.json().catch(() => ({}))) as any;
            const input = body.login_string || body.passkey || "";
            const result = authenticateUser(db, input);
            if (!result.success) {
              return Response.json({ success: false, error: result.error }, { status: 401 });
            }
            return Response.json({ success: true, user: result.user }, {
              headers: { "Access-Control-Allow-Origin": "*" }
            });
          }

          // GET /api/auth/users (List users for settings)
          if (req.method === "GET" && path === "/api/auth/users") {
            const users = getAllAuthUsers(db);
            return Response.json({ success: true, users }, {
              headers: { "Access-Control-Allow-Origin": "*" }
            });
          }

          // POST /api/auth/users (Add or update user login)
          if (req.method === "POST" && path === "/api/auth/users") {
            const body = (await req.json()) as any;
            const result = saveAuthUser(db, body);
            if (!result.success) {
              return Response.json({ success: false, error: result.error }, { status: 400 });
            }
            return Response.json({ success: true, user: result.user }, {
              headers: { "Access-Control-Allow-Origin": "*" }
            });
          }

          // DELETE /api/auth/users/:id
          if (req.method === "DELETE" && path.startsWith("/api/auth/users/")) {
            const id = parseInt(path.replace("/api/auth/users/", ""), 10);
            deleteAuthUser(db, id);
            return Response.json({ success: true }, {
              headers: { "Access-Control-Allow-Origin": "*" }
            });
          }

          // GET /api/speedtest (Database speed test & benchmarks)
          if (req.method === "GET" && path === "/api/speedtest") {
            const testResult = runDatabaseSpeedtest(db);
            return Response.json({ success: true, ...testResult }, {
              headers: { "Access-Control-Allow-Origin": "*" }
            });
          }

          // POST /api/content/sync (Check for new conference talks and FSY content)
          if (req.method === "POST" && path === "/api/content/sync") {
            try {
              const { updateAllContent } = await import("../scripts/update-content");
              const result = await updateAllContent(dbPath);
              return Response.json(result, {
                headers: { "Access-Control-Allow-Origin": "*" }
              });
            } catch (err: any) {
              return Response.json({ success: false, error: err.message }, { status: 500 });
            }
          }

          // GET /api/come-follow-me
          if (req.method === "GET" && path === "/api/come-follow-me") {
            const yearStr = url.searchParams.get("year");
            const year = yearStr ? parseInt(yearStr, 10) : undefined;
            const q = url.searchParams.get("q") || undefined;
            const lessons = getComeFollowMe(db, year, q);
            return Response.json({ success: true, count: lessons.length, lessons }, {
              headers: { "Access-Control-Allow-Origin": "*" }
            });
          }

          // GET /api/gospel-principles
          if (req.method === "GET" && path === "/api/gospel-principles") {
            const q = url.searchParams.get("q") || undefined;
            const limit = parseInt(url.searchParams.get("limit") || "60", 10);
            const chapters = searchGospelPrinciples(db, q, limit);
            return Response.json({ success: true, count: chapters.length, chapters }, {
              headers: { "Access-Control-Allow-Origin": "*" }
            });
          }

          // GET /api/fsy-lessons
          if (req.method === "GET" && path === "/api/fsy-lessons") {
            const yearStr = url.searchParams.get("year");
            const year = yearStr ? parseInt(yearStr, 10) : undefined;
            const monthStr = url.searchParams.get("month");
            const month = monthStr ? parseInt(monthStr, 10) : undefined;
            const sundayStr = url.searchParams.get("sunday");
            const sundayNumber = sundayStr ? parseInt(sundayStr, 10) : undefined;
            const org = url.searchParams.get("org") || undefined;
            const lessons = getFsyLessons(db, year, month, sundayNumber, org);
            return Response.json({ success: true, count: lessons.length, lessons }, {
              headers: { "Access-Control-Allow-Origin": "*" }
            });
          }

          // POST /api/share/whatsapp
          if (req.method === "POST" && path === "/api/share/whatsapp") {
            const body = (await req.json()) as any;
            const date = body.date;
            const preset = body.preset || "full";
            const agenda = getAgendaByDate(db, date);

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
              headers: { "Access-Control-Allow-Origin": "*" }
            });
          }

          // GET /api/export
          if (req.method === "GET" && path === "/api/export") {
            const backup = exportAllData(db);
            return new Response(JSON.stringify(backup, null, 2), {
              headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="agenda-backup-${Date.now()}.json"`,
                "Access-Control-Allow-Origin": "*"
              },
            });
          }

          // POST /api/import
          if (req.method === "POST" && path === "/api/import") {
            const body = await req.json();
            importAllData(db, body);
            return Response.json({ success: true }, {
              headers: { "Access-Control-Allow-Origin": "*" }
            });
          }

          return Response.json({ error: "Endpoint not found" }, { status: 404 });
        } catch (err: any) {
          return Response.json({ error: err.message || "Internal server error" }, { status: 500 });
        }
      }

      // Static File Serving
      let filePath = path === "/" ? "/index.html" : path;
      const staticFile = Bun.file(join(import.meta.dir, "..", "public", filePath));

      if (await staticFile.exists()) {
        return new Response(staticFile, {
          headers: isNew && cookieHeader ? { "Set-Cookie": cookieHeader } : undefined,
        });
      }

      // Fallback to index.html for client SPA routing
      const indexFallback = Bun.file(join(import.meta.dir, "..", "public", "index.html"));
      if (await indexFallback.exists()) {
        return new Response(indexFallback, {
          headers: isNew && cookieHeader ? { "Set-Cookie": cookieHeader } : undefined,
        });
      }

      return new Response("Not Found", { status: 404 });
    },
  });

  return Object.assign(server, {
    db,
    close: () => {
      server.stop(true);
      try {
        db.close();
      } catch {
        // ignore if already closed
      }
    },
  });
}

// Start server if run directly
if (import.meta.main) {
  const port = Number(process.env.PORT || 3000);
  const server = createServer("agenda.db", port);
  console.log(`\n=================================================`);
  console.log(`⚡ Ward Agenda App is running ultra-fast with Bun!`);
  console.log(`👉 Local:   http://localhost:${server.port}`);
  console.log(`👉 Network: Access from your phone via your Wi-Fi IP`);
  console.log(`=================================================\n`);
}
