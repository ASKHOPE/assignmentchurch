import { Database } from "bun:sqlite";
import { 
  initDb, 
  getAgendaByDate, 
  saveAgenda, 
  getAllSavedSundays, 
  getAutocompleteSuggestions, 
  exportAllData, 
  importAllData 
} from "./db";
import { 
  formatFullAgendaWhatsApp, 
  formatSacramentWhatsApp, 
  formatClassesWhatsApp, 
  formatIndividualReminderWhatsApp, 
  getWhatsAppShareUrl 
} from "./whatsapp-formatter";
import { getNextSunday, getPrevSunday } from "./agenda-utils";
import { join } from "path";

export function createServer(dbPath: string = "agenda.db", port: number = 3000) {
  const db = initDb(dbPath);

  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);
      const path = url.pathname;

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
              headers: { "Access-Control-Allow-Origin": "*" }
            });
          }

          // PUT /api/agenda/:date
          if (req.method === "PUT" && path.startsWith("/api/agenda/")) {
            const date = path.replace("/api/agenda/", "").trim();
            if (!date) {
              return Response.json({ success: false, error: "Date parameter required" }, { status: 400 });
            }
            const body = await req.json();
            const saved = saveAgenda(db, { ...body, date });
            return Response.json({ success: true, data: saved }, {
              headers: { "Access-Control-Allow-Origin": "*" }
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

          // POST /api/share/whatsapp
          if (req.method === "POST" && path === "/api/share/whatsapp") {
            const body = await req.json();
            const date = body.date;
            const preset = body.preset || "full";
            const agenda = getAgendaByDate(db, date);

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
        return new Response(staticFile);
      }

      // Fallback to index.html for client SPA routing
      const indexFallback = Bun.file(join(import.meta.dir, "..", "public", "index.html"));
      if (await indexFallback.exists()) {
        return new Response(indexFallback);
      }

      return new Response("Not Found", { status: 404 });
    },
  });

  return server;
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
