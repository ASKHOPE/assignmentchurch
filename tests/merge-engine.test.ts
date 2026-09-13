import { describe, it, expect } from "bun:test";
import { mergeAgendas } from "../src/merge-engine";
import { createDefaultAgenda } from "../src/agenda-utils";

describe("Agenda 3-Way Merge Engine", () => {
  it("applies normal non-concurrent edits directly", () => {
    const base = createDefaultAgenda("2026-09-13");
    base.updated_at = "2026-09-13T10:00:00.000Z";

    const incoming = {
      date: "2026-09-13",
      base_updated_at: "2026-09-13T10:00:00.000Z", // matches current DB
      talk1_speaker: "Brother Vance",
      talk1_title: "Faith in Christ",
    };

    const result = mergeAgendas(base, incoming);

    expect(result.isConcurrentMerge).toBe(false);
    expect(result.conflicts).toHaveLength(0);
    expect(result.merged.talk1_speaker).toBe("Brother Vance");
    expect(result.merged.talk1_title).toBe("Faith in Christ");
  });

  it("merges concurrent edits from two different leaders across distinct fields without data loss", () => {
    const base = createDefaultAgenda("2026-09-13");
    const t0 = "2026-09-13T10:00:00.000Z";
    base.updated_at = t0;

    // Leader A updated Talk 1 and saved at T1
    const t1 = "2026-09-13T10:01:00.000Z";
    const currentDb = {
      ...base,
      talk1_speaker: "Brother Smith",
      talk1_title: "The Living Christ",
      updated_at: t1,
    };

    // Leader B was editing Relief Society, starting from T0 (before Leader A saved)
    const leaderBIncoming = {
      date: "2026-09-13",
      base_updated_at: t0, // Leader B loaded at T0, before Leader A's edit
      classes_json: {
        ...base.classes_json,
        relief_society: {
          topic: "Charity Never Faileth",
          url: "https://churchofjesuschrist.org/study/rs-topic",
          teacher: "Sister Nelson",
          teacher_role: "Sister",
        },
      },
    };

    const result = mergeAgendas(currentDb, leaderBIncoming);

    expect(result.isConcurrentMerge).toBe(true);
    // 1. Leader A's talk update is preserved!
    expect(result.merged.talk1_speaker).toBe("Brother Smith");
    expect(result.merged.talk1_title).toBe("The Living Christ");

    // 2. Leader B's Relief Society class update is preserved!
    expect(result.merged.classes_json.relief_society.topic).toBe("Charity Never Faileth");
    expect(result.merged.classes_json.relief_society.teacher).toBe("Sister Nelson");
    expect(result.merged.classes_json.relief_society.teacher_role).toBe("Sister");
  });

  it("detects field conflicts when two leaders concurrently edit the exact same field", () => {
    const base = createDefaultAgenda("2026-09-13");
    base.updated_at = "2026-09-13T10:01:00.000Z";
    base.talk2_title = "Title by Leader A";

    const incoming = {
      date: "2026-09-13",
      base_updated_at: "2026-09-13T10:00:00.000Z", // Outdated
      talk2_title: "Conflicting Title by Leader B",
    };

    const result = mergeAgendas(base, incoming);

    expect(result.isConcurrentMerge).toBe(true);
    expect(result.conflicts).toContain("talk2_title");
    // Incoming takes precedence for active resolution
    expect(result.merged.talk2_title).toBe("Conflicting Title by Leader B");
  });

  it("preserves untouched fields when incoming provides modified_fields even if payload spreads stale values", () => {
    const base = createDefaultAgenda("2026-09-13");
    const t0 = "2026-09-13T10:00:00.000Z";
    base.updated_at = t0;

    // Leader A saved Talk 1
    const currentDb = {
      ...base,
      talk1_speaker: "Brother Updated By Leader A",
      updated_at: "2026-09-13T10:01:00.000Z",
    };

    // Leader B sends full base spread (which has stale talk1_speaker), but only modified Sunday School
    const leaderBIncoming = {
      ...base, // has stale talk1_speaker: "Bishopric"
      base_updated_at: t0,
      modified_fields: ["classes_json.sunday_school"],
      classes_json: {
        ...base.classes_json,
        sunday_school: {
          topic: "Lesson by Leader B",
          url: "https://churchofjesuschrist.org/study/ss",
          teacher: "Sister Sunday School Teacher",
          teacher_role: "Sister" as const,
        },
      },
    };

    const result = mergeAgendas(currentDb, leaderBIncoming);

    expect(result.isConcurrentMerge).toBe(true);
    // Leader A's talk update is NOT overwritten because it was not in modified_fields!
    expect(result.merged.talk1_speaker).toBe("Brother Updated By Leader A");
    // Leader B's modified field IS applied
    expect(result.merged.classes_json.sunday_school.topic).toBe("Lesson by Leader B");
    expect(result.merged.classes_json.sunday_school.teacher).toBe("Sister Sunday School Teacher");
  });
});
