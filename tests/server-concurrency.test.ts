import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { createServer } from "../src/server";
import { unlinkSync, existsSync } from "fs";
import { defaultRateLimiter } from "../src/rate-limiter";

describe("Server Concurrency, Cookies & Rate Limiting Integration", () => {
  const testDbPath = "test-concurrency.db";
  let server: any;
  let baseUrl: string;

  beforeAll(() => {
    if (existsSync(testDbPath)) unlinkSync(testDbPath);
    server = createServer(testDbPath, 3456);
    baseUrl = `http://localhost:${server.port}`;
    defaultRateLimiter.reset();
  });

  afterAll(() => {
    if (server.close) {
      server.close();
    } else {
      server.stop(true);
    }
    if (existsSync(testDbPath)) {
      try {
        unlinkSync(testDbPath);
      } catch {
        // Ignored if file lock takes a moment on Windows
      }
    }
  });

  it("issues a ward_editor_id session cookie on first request", async () => {
    const res = await fetch(`${baseUrl}/api/agenda/2026-09-13`);
    expect(res.status).toBe(200);

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).not.toBeNull();
    expect(setCookie).toContain("ward_editor_id=editor_");
    expect(setCookie).toContain("HttpOnly");
  });

  it("reuses existing ward_editor_id cookie when provided by client", async () => {
    const clientCookie = "ward_editor_id=editor_custom-leader-123";
    const res = await fetch(`${baseUrl}/api/agenda/2026-09-13`, {
      headers: { Cookie: clientCookie },
    });
    expect(res.status).toBe(200);

    // Should NOT issue a new Set-Cookie when a valid one is already provided
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeNull();
  });

  it("handles concurrent simultaneous PUT requests without crashing and merges updates", async () => {
    // 1. Initial read
    const initRes = await fetch(`${baseUrl}/api/agenda/2026-09-13`);
    const initJson = (await initRes.json()) as any;
    const initData = initJson.data;
    const baseTime = initData.updated_at;

    // 2. Simulate Leader A updating Talk 1 and Leader B updating Sunday School at the exact same moment
    const putA = fetch(`${baseUrl}/api/agenda/2026-09-13`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: "ward_editor_id=editor_bishopric_a",
      },
      body: JSON.stringify({
        ...initData,
        base_updated_at: baseTime,
        modified_fields: ["talk1_speaker"],
        talk1_speaker: "Brother Concurrent A",
      }),
    });

    const putB = fetch(`${baseUrl}/api/agenda/2026-09-13`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: "ward_editor_id=editor_reliefsociety_b",
      },
      body: JSON.stringify({
        ...initData,
        base_updated_at: baseTime,
        modified_fields: ["classes_json.sunday_school"],
        classes_json: {
          ...initData.classes_json,
          sunday_school: {
            topic: "Merged Lesson B",
            url: "https://churchofjesuschrist.org/study/ss-b",
            teacher: "Sister Concurrent B",
            teacher_role: "Sister",
          },
        },
      }),
    });

    const [resA, resB] = await Promise.all([putA, putB]);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    // 3. Final verification: fetch final state and verify both A and B survived
    const finalRes = await fetch(`${baseUrl}/api/agenda/2026-09-13`);
    const finalData = ((await finalRes.json()) as any).data;

    expect(finalData.talk1_speaker).toBe("Brother Concurrent A");
    expect(finalData.classes_json.sunday_school.topic).toBe("Merged Lesson B");
    expect(finalData.classes_json.sunday_school.teacher).toBe("Sister Concurrent B");
  });

  it("enforces rate limits on rapid write bursts", async () => {
    const editorCookie = "ward_editor_id=editor_burst_test";

    // Exhaust 60 write allowance for this test client
    const promises: Promise<Response>[] = [];
    for (let i = 0; i < 62; i++) {
      promises.push(
        fetch(`${baseUrl}/api/agenda/2026-09-20`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Cookie: editorCookie,
          },
          body: JSON.stringify({
            date: "2026-09-20",
            talk1_title: `Burst ${i}`,
          }),
        })
      );
    }

    const responses = await Promise.all(promises);
    const statuses = responses.map((r) => r.status);

    // At least one request should be throttled with HTTP 429
    expect(statuses).toContain(429);

    const throttled = responses.find((r) => r.status === 429);
    expect(throttled).toBeDefined();
    expect(throttled?.headers.get("retry-after")).not.toBeNull();
    const body = (await throttled?.json()) as any;
    expect(body.success).toBe(false);
    expect(body.error).toContain("Too many modifications");
  });
});
