import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { createServer } from "../src/server";

describe("Bun REST API Server", () => {
  let serverInstance: any;
  let baseUrl: string;

  beforeAll(() => {
    // In-memory db with test port
    serverInstance = createServer(":memory:", 0);
    baseUrl = `http://localhost:${serverInstance.port}`;
  });

  afterAll(() => {
    serverInstance.stop();
  });

  test("GET /api/agenda/:date returns seeded or default agenda", async () => {
    const res = await fetch(`${baseUrl}/api/agenda/2026-09-13`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.date).toBe("2026-09-13");
    expect(json.data.talk2_title).toBe("A New Normal");
  });

  test("PUT /api/agenda/:date updates agenda atomically", async () => {
    const updateRes = await fetch(`${baseUrl}/api/agenda/2026-09-13`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        opening_prayer_name: "Brother Brigham",
      }),
    });
    expect(updateRes.status).toBe(200);
    const updateJson = await updateRes.json();
    expect(updateJson.success).toBe(true);
    expect(updateJson.data.opening_prayer_name).toBe("Brother Brigham");

    // Fetch again to verify persistence
    const fetchRes = await fetch(`${baseUrl}/api/agenda/2026-09-13`);
    const fetchJson = await fetchRes.json();
    expect(fetchJson.data.opening_prayer_name).toBe("Brother Brigham");
  });

  test("GET /api/sundays returns saved list", async () => {
    const res = await fetch(`${baseUrl}/api/sundays`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.saved)).toBe(true);
    expect(json.saved).toContain("2026-09-13");
  });

  test("GET /api/autocomplete returns suggestions", async () => {
    const res = await fetch(`${baseUrl}/api/autocomplete?category=name&q=Sah`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.suggestions).toContain("Sahitya");
  });

  test("POST /api/share/whatsapp returns formatted text and wa.me URL", async () => {
    const res = await fetch(`${baseUrl}/api/share/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: "2026-09-13",
        preset: "full",
      }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.text).toContain("⛪ *WARD SUNDAY AGENDA*");
    expect(json.url).toContain("https://api.whatsapp.com/send?text=");
  });

  test("GET /api/export and POST /api/import handles full backup", async () => {
    const exportRes = await fetch(`${baseUrl}/api/export`);
    expect(exportRes.status).toBe(200);
    const backup = await exportRes.json();
    expect(backup.agendas.length).toBeGreaterThanOrEqual(1);

    const importRes = await fetch(`${baseUrl}/api/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(backup),
    });
    expect(importRes.status).toBe(200);
    const importJson = await importRes.json();
    expect(importJson.success).toBe(true);
  });
});
