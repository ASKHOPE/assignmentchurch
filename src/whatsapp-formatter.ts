import { AgendaRecord, formatDisplayDate } from "./agenda-utils";

function formatPersonName(role: string, name?: string): string {
  if (!name || !name.trim()) return role;
  const trimmed = name.trim();
  if (trimmed.toLowerCase().startsWith("brother ") || trimmed.toLowerCase().startsWith("sister ")) {
    return trimmed;
  }
  return `${role} ${trimmed}`;
}

/**
 * Builds the comprehensive WhatsApp message containing the Sunday schedule.
 * Automatically adapts based on Meeting Type (Standard, Fast & Testimony, General Conference, Stake Conference).
 */
export function formatFullAgendaWhatsApp(agenda: AgendaRecord): string {
  const displayDate = formatDisplayDate(agenda.date);

  // 1. Handle General Conference
  if (agenda.meeting_type === "general_conference") {
    return [
      `📡 *GENERAL CONFERENCE*`,
      `📅 *${displayDate}*`,
      ``,
      `Brothers and Sisters,`,
      `This Sunday is General Conference broadcast from Salt Lake City.`,
      `There will be *no local ward sacrament meeting or Sunday School/Quorum classes*.`,
      ``,
      `📺 *Watch Live / Broadcast Links:*`,
      `🔗 ${agenda.conference_url || "https://www.churchofjesuschrist.org/general-conference"}`,
      agenda.conference_details ? `\n📝 *Details:* ${agenda.conference_details}` : "",
      ``,
      `We invite all members and families to tune in and listen to the words of the living prophets and apostles! 📖✨`
    ].filter(Boolean).join("\n");
  }

  // 2. Handle Stake Conference
  if (agenda.meeting_type === "stake_conference") {
    return [
      `🏛️ *STAKE CONFERENCE*`,
      `📅 *${displayDate}*`,
      ``,
      `Brothers and Sisters,`,
      `This Sunday our ward will be attending *Stake Conference*.`,
      `There will be *no meetings held at our local ward building*.`,
      ``,
      agenda.conference_title ? `📍 *Meeting:* ${agenda.conference_title}` : `📍 *Location:* Stake Center`,
      agenda.conference_details ? `⏰ *Schedule & Details:*\n${agenda.conference_details}` : `⏰ General Session begins at 10:00 AM.`,
      agenda.conference_url ? `🔗 ${agenda.conference_url}` : "",
      ``,
      `We look forward to gathering together as a stake! 🙏`
    ].filter(Boolean).join("\n");
  }

  // 3. Handle Fast & Testimony Meeting or Standard Meeting
  const isFastAndTestimony = agenda.meeting_type === "fast_and_testimony";
  const title = isFastAndTestimony ? `🍞 *WARD FAST & TESTIMONY MEETING*` : `⛪ *WARD SUNDAY AGENDA*`;

  const lines: string[] = [
    title,
    `📅 *${displayDate}* (${agenda.week_label || "Sunday"})`,
    ``,
    `*SACRAMENT MEETING*`,
  ];

  const openingPrayer = formatPersonName(agenda.opening_prayer_role, agenda.opening_prayer_name);
  lines.push(`🙏 *Opening Prayer:* ${openingPrayer}`);

  if (agenda.hymn_opening) lines.push(`🎵 *Opening Hymn:* ${agenda.hymn_opening}`);
  if (agenda.hymn_sacrament) lines.push(`🎵 *Sacrament Hymn:* ${agenda.hymn_sacrament}`);

  if (isFastAndTestimony) {
    lines.push(``);
    lines.push(`🗣️ *BEARING OF TESTIMONIES*`);
    lines.push(`   Time will be devoted for congregation members to bear their testimonies.`);
    lines.push(``);
  } else {
    // 1st Talk
    if (agenda.talk1_title || agenda.talk1_speaker) {
      const org = agenda.talk1_org ? ` (${agenda.talk1_org})` : "";
      const speaker = agenda.talk1_speaker ? ` - ${agenda.talk1_speaker}` : "";
      lines.push(`🗣️ *1st Talk${org}:* ${agenda.talk1_title || "Talk"}${speaker}`);
      if (agenda.talk1_url) {
        lines.push(`🔗 ${agenda.talk1_url}`);
      }
    }

    // 2nd Talk
    if (agenda.talk2_title || agenda.talk2_speaker) {
      const org = agenda.talk2_org ? ` (${agenda.talk2_org})` : "";
      const speaker = agenda.talk2_speaker ? ` - ${agenda.talk2_speaker}` : "";
      lines.push(`🗣️ *2nd Talk${org}:* ${agenda.talk2_title || "Talk"}${speaker}`);
      if (agenda.talk2_url) {
        lines.push(`🔗 ${agenda.talk2_url}`);
      }
    }

    // Interlude hymn if any
    if (agenda.hymn_interlude) {
      lines.push(`🎵 *Interlude Hymn:* ${agenda.hymn_interlude}`);
    }

    // 3rd Talk
    if (agenda.talk3_title || agenda.talk3_speaker) {
      const org = agenda.talk3_org && agenda.talk3_org !== "Member" ? ` (${agenda.talk3_org})` : "";
      const speaker = agenda.talk3_speaker ? ` - ${agenda.talk3_speaker}` : "";
      lines.push(`🗣️ *3rd Talk${org}:* ${agenda.talk3_title || "Talk"}${speaker}`);
      if (agenda.talk3_url) {
        lines.push(`🔗 ${agenda.talk3_url}`);
      }
    }
  }

  if (agenda.hymn_closing) lines.push(`🎵 *Closing Hymn:* ${agenda.hymn_closing}`);

  const closingPrayer = formatPersonName(agenda.closing_prayer_role, agenda.closing_prayer_name);
  lines.push(`🙏 *Closing Prayer:* ${closingPrayer}`);

  lines.push(``);
  lines.push(`*SECOND HOUR CLASSES (25 Min)*`);

  // Sunday School
  const ss = agenda.classes_json?.sunday_school;
  if (ss) {
    lines.push(`📖 *Sunday School (1st Class):*`);
    if (ss.topic) lines.push(`   Topic: ${ss.topic}`);
    if (ss.url) lines.push(`   🔗 ${ss.url}`);
    if (ss.teacher) lines.push(`   👨‍🏫 Teacher: ${ss.teacher}`);
  }

  // Quorums
  lines.push(``);
  lines.push(`👥 *Quorums & Organizations (2nd Class):*`);

  const orgLabels: Array<{ key: keyof typeof agenda.classes_json; label: string }> = [
    { key: "elders_quorum", label: "Elders Quorum" },
    { key: "relief_society", label: "Relief Society" },
    { key: "young_men", label: "Young Men" },
    { key: "young_women", label: "Young Women" },
    { key: "primary", label: "Primary" },
  ];

  for (const org of orgLabels) {
    const info = agenda.classes_json?.[org.key];
    if (info && (info.topic || info.teacher)) {
      const teacherStr = info.teacher ? ` (Teacher: ${info.teacher})` : "";
      lines.push(`• *${org.label}:* ${info.topic || "Lesson"}${teacherStr}`);
      if (info.url) lines.push(`  🔗 ${info.url}`);
    }
  }

  return lines.join("\n");
}

/**
 * Formats the Sacrament Meeting program bulletin for WhatsApp.
 */
export function formatSacramentWhatsApp(agenda: AgendaRecord): string {
  const displayDate = formatDisplayDate(agenda.date);

  if (agenda.meeting_type === "general_conference") {
    return `📡 *GENERAL CONFERENCE SUNDAY*\n📅 *${displayDate}*\n\nNo ward sacrament meeting will be held. Tune in to the worldwide broadcast:\n🔗 ${agenda.conference_url || "https://www.churchofjesuschrist.org/general-conference"}`;
  }

  if (agenda.meeting_type === "stake_conference") {
    return `🏛️ *STAKE CONFERENCE SUNDAY*\n📅 *${displayDate}*\n\nNo ward sacrament meeting. All members are invited to attend Stake Conference at the Stake Center.`;
  }

  const isFastAndTestimony = agenda.meeting_type === "fast_and_testimony";
  const lines: string[] = [
    isFastAndTestimony ? `🍞 *FAST & TESTIMONY SACRAMENT PROGRAM*` : `⛪ *SACRAMENT MEETING PROGRAM*`,
    `📅 *${displayDate}* (${agenda.week_label || "Sunday"})`,
    ``,
  ];

  if (agenda.hymn_opening) lines.push(`🎵 *Opening Hymn:* ${agenda.hymn_opening}`);
  lines.push(`🙏 *Opening Prayer:* ${formatPersonName(agenda.opening_prayer_role, agenda.opening_prayer_name)}`);
  if (agenda.hymn_sacrament) lines.push(`🎵 *Sacrament Hymn:* ${agenda.hymn_sacrament}`);

  if (isFastAndTestimony) {
    lines.push(``);
    lines.push(`🗣️ *BEARING OF TESTIMONIES BY MEMBERS*`);
    lines.push(``);
  } else {
    if (agenda.talk1_title || agenda.talk1_speaker) {
      const org = agenda.talk1_org ? ` (${agenda.talk1_org})` : "";
      lines.push(`🗣️ *1st Talk${org}:* ${agenda.talk1_title} (${agenda.talk1_speaker})`);
      if (agenda.talk1_url) lines.push(`🔗 ${agenda.talk1_url}`);
    }

    if (agenda.talk2_title || agenda.talk2_speaker) {
      const org = agenda.talk2_org ? ` (${agenda.talk2_org})` : "";
      lines.push(`🗣️ *2nd Talk${org}:* ${agenda.talk2_title} - ${agenda.talk2_speaker}`);
      if (agenda.talk2_url) lines.push(`🔗 ${agenda.talk2_url}`);
    }

    if (agenda.hymn_interlude) lines.push(`🎵 *Interlude Hymn:* ${agenda.hymn_interlude}`);

    if (agenda.talk3_title || agenda.talk3_speaker) {
      const org = agenda.talk3_org && agenda.talk3_org !== "Member" ? ` (${agenda.talk3_org})` : "";
      lines.push(`🗣️ *3rd Talk${org}:* ${agenda.talk3_title} - ${agenda.talk3_speaker}`);
      if (agenda.talk3_url) lines.push(`🔗 ${agenda.talk3_url}`);
    }
  }

  if (agenda.hymn_closing) lines.push(`🎵 *Closing Hymn:* ${agenda.hymn_closing}`);
  lines.push(`🙏 *Closing Prayer:* ${formatPersonName(agenda.closing_prayer_role, agenda.closing_prayer_name)}`);

  return lines.join("\n");
}

/**
 * Formats 2nd Hour classes and teacher assignments for WhatsApp.
 */
export function formatClassesWhatsApp(agenda: AgendaRecord): string {
  const displayDate = formatDisplayDate(agenda.date);

  if (agenda.meeting_type === "general_conference" || agenda.meeting_type === "stake_conference") {
    return `📅 *${displayDate}*\n\nNo Sunday School or Quorum classes will be held today due to Conference.`;
  }

  const lines: string[] = [
    `📖 *SECOND HOUR CLASSES (25 Min)*`,
    `📅 *${displayDate}*`,
    ``,
  ];

  const ss = agenda.classes_json?.sunday_school;
  if (ss) {
    lines.push(`📚 *Sunday School:* ${ss.topic || "Come Follow Me"}`);
    if (ss.teacher) lines.push(`👨‍🏫 Teacher: ${ss.teacher}`);
    if (ss.url) lines.push(`🔗 ${ss.url}`);
    lines.push(``);
  }

  lines.push(`👥 *Quorums & Organizations:*`);
  const orgLabels: Array<{ key: keyof typeof agenda.classes_json; label: string }> = [
    { key: "elders_quorum", label: "Elders Quorum" },
    { key: "relief_society", label: "Relief Society" },
    { key: "young_men", label: "Young Men" },
    { key: "young_women", label: "Young Women" },
    { key: "primary", label: "Primary" },
  ];

  for (const org of orgLabels) {
    const info = agenda.classes_json?.[org.key];
    if (info && (info.topic || info.teacher)) {
      lines.push(`• *${org.label}:* ${info.topic || "Lesson"}`);
      if (info.teacher) lines.push(`  Teacher: ${info.teacher}`);
      if (info.url) lines.push(`  🔗 ${info.url}`);
    }
  }

  return lines.join("\n");
}

/**
 * Formats a tailored personal assignment reminder.
 */
export function formatIndividualReminderWhatsApp(
  roleOrClass: string,
  name: string,
  topic: string,
  dateStr: string,
  url?: string
): string {
  const displayDate = formatDisplayDate(dateStr);
  const topicSnippet = topic ? ` on "*${topic}*"` : "";
  const urlSnippet = url ? `\n\nStudy link: ${url}` : "";

  return `Hi ${name || "there"},\n\nFriendly reminder of your assignment this Sunday (*${displayDate}*) as *${roleOrClass}*${topicSnippet}.${urlSnippet}\n\nThank you for your service! 🙏`;
}

/**
 * Constructs a ready-to-open WhatsApp Web / deep link.
 */
export function getWhatsAppShareUrl(text: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}
