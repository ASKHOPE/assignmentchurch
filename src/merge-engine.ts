/**
 * Field-Level 3-Way Agenda Merging Engine
 * Resolves concurrent modifications from multiple ward leaders without data loss.
 */

import { AgendaRecord, ClassesStructure, ClassInfo } from "./agenda-utils";

export interface IncomingAgendaPayload extends Partial<AgendaRecord> {
  date: string;
  base_updated_at?: string;
  modified_fields?: string[]; // Optional list of fields explicitly changed by client
}

export interface MergeResult {
  merged: AgendaRecord;
  isConcurrentMerge: boolean;
  conflicts: string[];
}

export function mergeAgendas(
  current: AgendaRecord,
  incoming: IncomingAgendaPayload
): MergeResult {
  const isConcurrent = Boolean(
    incoming.base_updated_at &&
    current.updated_at &&
    incoming.base_updated_at !== current.updated_at
  );

  const conflicts: string[] = [];

  // Helper to merge class info without wiping peer edits
  function mergeClassInfo(
    currClass?: ClassInfo,
    incClass?: Partial<ClassInfo>,
    orgKey: string = ""
  ): ClassInfo {
    const base: ClassInfo = currClass || { topic: "", url: "", teacher: "", teacher_role: "Brother" };
    if (!incClass) return base;

    const classFieldPrefix = `classes_json.${orgKey}`;
    const orgAliases: Record<string, string[]> = {
      sunday_school: ["sunday_school", "ss", "classes_json.sunday_school"],
      sunday_school_youth: ["sunday_school_youth", "ssy", "classes_json.sunday_school_youth"],
      elders_quorum: ["elders_quorum", "eq", "classes_json.elders_quorum"],
      relief_society: ["relief_society", "rs", "classes_json.relief_society"],
      young_men: ["young_men", "ym", "classes_json.young_men"],
      young_women: ["young_women", "yw", "classes_json.young_women"],
      primary: ["primary", "pri", "classes_json.primary"],
    };
    const validAliases = orgAliases[orgKey] || [orgKey, classFieldPrefix];

    if (incoming.modified_fields && Array.isArray(incoming.modified_fields)) {
      const isAnyClassFieldModified = incoming.modified_fields.some((f) =>
        f === "classes_json" ||
        validAliases.some((alias) => f === alias || f.startsWith(`${alias}.`))
      );
      if (!isAnyClassFieldModified) {
        return base;
      }
    }

    function pickClassProperty(prop: keyof ClassInfo): string {
      const currVal = base[prop];
      const incVal = incClass?.[prop];

      if (incoming.modified_fields && Array.isArray(incoming.modified_fields)) {
        const isPropModified = incoming.modified_fields.some((f) =>
          f === "classes_json" ||
          validAliases.some((alias) => f === alias || f === `${alias}.${prop}`)
        );
        if (!isPropModified) {
          return currVal || "";
        }
      }

      if (incVal === undefined || incVal === null) {
        return currVal || "";
      }

      if (!isConcurrent) {
        return incVal;
      }

      if (typeof incVal === "string" && incVal.trim() !== "") {
        return incVal;
      }

      if (typeof incVal === "string" && incVal.trim() === "" && typeof currVal === "string" && currVal.trim() !== "") {
        return currVal;
      }

      return incVal;
    }

    return {
      topic: pickClassProperty("topic"),
      url: pickClassProperty("url"),
      teacher: pickClassProperty("teacher"),
      teacher_role: (pickClassProperty("teacher_role") as "Brother" | "Sister") || base.teacher_role || "Brother",
    };
  }

  // Deep merge classes_json structure
  const mergedClasses: ClassesStructure = {
    sunday_school: mergeClassInfo(current.classes_json?.sunday_school, incoming.classes_json?.sunday_school, "sunday_school"),
    sunday_school_youth: mergeClassInfo(current.classes_json?.sunday_school_youth, incoming.classes_json?.sunday_school_youth, "sunday_school_youth"),
    elders_quorum: mergeClassInfo(current.classes_json?.elders_quorum, incoming.classes_json?.elders_quorum, "elders_quorum"),
    relief_society: mergeClassInfo(current.classes_json?.relief_society, incoming.classes_json?.relief_society, "relief_society"),
    young_men: mergeClassInfo(current.classes_json?.young_men, incoming.classes_json?.young_men, "young_men"),
    young_women: mergeClassInfo(current.classes_json?.young_women, incoming.classes_json?.young_women, "young_women"),
    primary: mergeClassInfo(current.classes_json?.primary, incoming.classes_json?.primary, "primary"),
  };

  // Helper for scalar text fields
  function pickField<K extends keyof AgendaRecord>(
    field: K,
    defaultVal: any = ""
  ): any {
    const currVal = current[field];
    const incVal = incoming[field];

    if (incoming.modified_fields && Array.isArray(incoming.modified_fields)) {
      if (!incoming.modified_fields.includes(field as string)) {
        return currVal !== undefined ? currVal : defaultVal;
      }
    }

    if (incVal === undefined || incVal === null) {
      return currVal !== undefined ? currVal : defaultVal;
    }

    if (!isConcurrent) {
      return incVal;
    }

    // In a concurrent conflict situation:
    // If incoming explicitly provided a non-empty value, incoming wins
    if (typeof incVal === "string" && incVal.trim() !== "") {
      if (typeof currVal === "string" && currVal.trim() !== "" && currVal !== incVal) {
        conflicts.push(field as string);
      }
      return incVal;
    }

    // If incoming is empty but DB was populated concurrently, preserve DB value
    if (typeof incVal === "string" && incVal.trim() === "" && typeof currVal === "string" && currVal.trim() !== "") {
      return currVal;
    }

    return incVal !== undefined ? incVal : currVal;
  }

  const merged: AgendaRecord = {
    date: incoming.date || current.date,
    week_label: pickField("week_label", current.week_label),
    meeting_type: pickField("meeting_type", current.meeting_type || "standard"),
    opening_prayer_role: pickField("opening_prayer_role", current.opening_prayer_role || "Brother"),
    opening_prayer_name: pickField("opening_prayer_name", current.opening_prayer_name || ""),
    talk1_org: pickField("talk1_org", current.talk1_org || "Bishopric"),
    talk1_title: pickField("talk1_title", current.talk1_title || ""),
    talk1_speaker_role: pickField("talk1_speaker_role", current.talk1_speaker_role || "Brother"),
    talk1_speaker: pickField("talk1_speaker", current.talk1_speaker || ""),
    talk2_org: pickField("talk2_org", current.talk2_org || "Elders Quorum"),
    talk2_title: pickField("talk2_title", current.talk2_title || ""),
    talk2_url: pickField("talk2_url", current.talk2_url || ""),
    talk2_speaker_role: pickField("talk2_speaker_role", current.talk2_speaker_role || "Brother"),
    talk2_speaker: pickField("talk2_speaker", current.talk2_speaker || ""),
    talk3_org: pickField("talk3_org", current.talk3_org || "Member"),
    talk3_title: pickField("talk3_title", current.talk3_title || ""),
    talk3_url: pickField("talk3_url", current.talk3_url || ""),
    talk3_speaker_role: pickField("talk3_speaker_role", current.talk3_speaker_role || "Brother"),
    talk3_speaker: pickField("talk3_speaker", current.talk3_speaker || ""),
    closing_prayer_role: pickField("closing_prayer_role", current.closing_prayer_role || "Sister"),
    closing_prayer_name: pickField("closing_prayer_name", current.closing_prayer_name || ""),
    hymn_opening: pickField("hymn_opening", current.hymn_opening || ""),
    hymn_sacrament: pickField("hymn_sacrament", current.hymn_sacrament || ""),
    hymn_interlude: pickField("hymn_interlude", current.hymn_interlude || ""),
    hymn_closing: pickField("hymn_closing", current.hymn_closing || ""),
    classes_json: mergedClasses,
    conference_title: pickField("conference_title", current.conference_title || ""),
    conference_details: pickField("conference_details", current.conference_details || ""),
    conference_url: pickField("conference_url", current.conference_url || ""),
    notes: pickField("notes", current.notes || ""),
    updated_at: new Date().toISOString(),
  };

  return {
    merged,
    isConcurrentMerge: isConcurrent,
    conflicts,
  };
}
