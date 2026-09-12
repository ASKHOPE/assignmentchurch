export type MeetingType = "standard" | "fast_and_testimony" | "general_conference" | "stake_conference";

export interface ClassInfo {
  topic: string;
  url?: string;
  teacher: string;
}

export interface ClassesStructure {
  sunday_school: ClassInfo; // Combined Adults (Sunday School)
  sunday_school_youth?: ClassInfo; // Combined Youth (Sunday School)
  elders_quorum: ClassInfo;
  relief_society: ClassInfo;
  young_men: ClassInfo;
  young_women: ClassInfo;
  primary: ClassInfo;
}

export interface AgendaRecord {
  date: string; // YYYY-MM-DD
  week_label: string; // e.g. "1st Sunday", "2nd Sunday"
  meeting_type: MeetingType; // "standard" | "fast_and_testimony" | "general_conference" | "stake_conference"
  opening_prayer_role: string; // "Brother" | "Sister"
  opening_prayer_name: string;
  talk1_org: string; // "Bishopric" | "Stake High Councilor" | "Youth - Young Men" | "Youth - Young Women" | "Custom"
  talk1_title: string;
  talk1_url?: string;
  talk1_speaker: string;
  talk2_org: string; // "Elders Quorum" | "Relief Society" | "Youth - Young Men" | "Youth - Young Women" | "Stake High Councilor" | "Custom"
  talk2_title: string;
  talk2_url?: string;
  talk2_speaker: string;
  talk3_org?: string;
  talk3_title: string;
  talk3_url?: string;
  talk3_speaker: string;
  closing_prayer_role: string; // "Brother" | "Sister"
  closing_prayer_name: string;
  hymn_opening: string;
  hymn_opening_url?: string;
  hymn_sacrament: string;
  hymn_sacrament_url?: string;
  hymn_interlude: string;
  hymn_interlude_url?: string;
  hymn_closing: string;
  hymn_closing_url?: string;
  cfm_week?: number;
  cfm_title?: string;
  cfm_scriptures?: string;
  cfm_url?: string;
  classes_json: ClassesStructure;
  conference_title?: string;
  conference_details?: string;
  conference_url?: string;
  notes?: string;
  updated_at?: string;
}

export const TALK_ORDER_RULES: Record<number, { org: string; label: string }> = {
  1: { org: "Fast & Testimony", label: "1st Sunday: Fast & Testimony" },
  2: { org: "Elders Quorum", label: "2nd Sunday: Elders Quorum" },
  3: { org: "Relief Society", label: "3rd Sunday: Relief Society" },
  4: { org: "Elders Quorum", label: "4th Sunday: Elders Quorum" },
  5: { org: "Bishopric", label: "5th Sunday: Bishopric" },
};

/**
 * Calculates which Sunday of the month a given date is (1st to 5th).
 */
export function getSundayOfMonth(dateInput: string | Date): {
  weekNumber: number;
  label: string;
  talkOrder: string;
  org: string;
  defaultMeetingType: MeetingType;
} {
  const d = typeof dateInput === "string" ? parseISODate(dateInput) : new Date(dateInput);
  const dayOfMonth = d.getDate();
  const month = d.getMonth() + 1; // 1-12
  const weekNumber = Math.min(5, Math.ceil(dayOfMonth / 7));
  const rule = TALK_ORDER_RULES[weekNumber] || TALK_ORDER_RULES[1];

  const ordinals: Record<number, string> = {
    1: "1st Sunday",
    2: "2nd Sunday",
    3: "3rd Sunday",
    4: "4th Sunday",
    5: "5th Sunday",
  };

  // Check if this falls on April 1st week or October 1st week (typical General Conference)
  let defaultMeetingType: MeetingType = "standard";
  if (weekNumber === 1) {
    defaultMeetingType = "fast_and_testimony";
  }

  // If first week of April or October, flag as potential General Conference
  if ((month === 4 || month === 10) && dayOfMonth <= 7) {
    // Note: Can still be overridden by user
    defaultMeetingType = "general_conference";
  }

  return {
    weekNumber,
    label: ordinals[weekNumber] || `${weekNumber}th Sunday`,
    talkOrder: rule.label,
    org: rule.org,
    defaultMeetingType,
  };
}

/**
 * Parses YYYY-MM-DD reliably without local timezone offsets.
 */
export function parseISODate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

/**
 * Formats date into YYYY-MM-DD.
 */
export function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Formats date nicely e.g. "13 September 2026".
 */
export function formatDisplayDate(dateInput: string | Date): string {
  const d = typeof dateInput === "string" ? parseISODate(dateInput) : dateInput;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Returns the date string 7 days after the provided date.
 */
export function getNextSunday(dateStr: string): string {
  const d = parseISODate(dateStr);
  d.setDate(d.getDate() + 7);
  return formatISODate(d);
}

/**
 * Returns the date string 7 days before the provided date.
 */
export function getPrevSunday(dateStr: string): string {
  const d = parseISODate(dateStr);
  d.setDate(d.getDate() - 7);
  return formatISODate(d);
}

/**
 * Creates a blank default agenda populated with default roles and calculated week label.
 */
export function createDefaultAgenda(dateStr: string): AgendaRecord {
  const { label, org, defaultMeetingType } = getSundayOfMonth(dateStr);

  return {
    date: dateStr,
    week_label: defaultMeetingType === "fast_and_testimony" ? `${label} - Fast & Testimony` : label,
    meeting_type: defaultMeetingType,
    opening_prayer_role: "Brother",
    opening_prayer_name: "",
    talk1_org: "Bishopric",
    talk1_title: "",
    talk1_speaker: "Bishopric",
    talk2_org: org === "Fast & Testimony" ? "Youth - Young Men" : org,
    talk2_title: "",
    talk2_url: "",
    talk2_speaker: "",
    talk3_org: "Member",
    talk3_title: "",
    talk3_url: "",
    talk3_speaker: "",
    closing_prayer_role: "Sister",
    closing_prayer_name: "",
    hymn_opening: "",
    hymn_sacrament: "",
    hymn_interlude: "",
    hymn_closing: "",
    classes_json: {
      sunday_school: { topic: "", url: "", teacher: "" },
      sunday_school_youth: { topic: "", url: "", teacher: "" },
      elders_quorum: { topic: "", url: "", teacher: "" },
      relief_society: { topic: "", url: "", teacher: "" },
      young_men: { topic: "", url: "", teacher: "" },
      young_women: { topic: "", url: "", teacher: "" },
      primary: { topic: "", url: "", teacher: "" },
    },
    conference_title: defaultMeetingType === "general_conference" ? "General Conference Broadcast" : "",
    conference_details: defaultMeetingType === "general_conference" 
      ? "Broadcast from Salt Lake City. No local ward sacrament meeting or classes." 
      : "",
    conference_url: defaultMeetingType === "general_conference" 
      ? "https://www.churchofjesuschrist.org/general-conference" 
      : "",
    notes: "",
    updated_at: new Date().toISOString(),
  };
}
