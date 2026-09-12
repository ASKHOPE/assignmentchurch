import { expect, test, describe } from "bun:test";
import { 
  formatFullAgendaWhatsApp, 
  formatSacramentWhatsApp, 
  formatClassesWhatsApp, 
  formatIndividualReminderWhatsApp,
  getWhatsAppShareUrl 
} from "../src/whatsapp-formatter";
import { createDefaultAgenda } from "../src/agenda-utils";

describe("WhatsApp Formatter Engine", () => {
  const sampleAgenda = {
    ...createDefaultAgenda("2026-09-13"),
    meeting_type: "standard" as const,
    week_label: "2nd Sunday",
    opening_prayer_role: "Brother",
    opening_prayer_name: "Clark",
    talk1_org: "Stake High Councilor",
    talk1_title: "Faith in Jesus Christ",
    talk1_speaker: "Brother Jensen",
    talk2_org: "Youth - Young Men",
    talk2_title: "A New Normal",
    talk2_url: "https://churchofjesuschrist.org/study/talk2",
    talk2_speaker: "Jacob",
    talk3_title: "Sacrifice (Gospel Principles)",
    talk3_speaker: "Sister Jones",
    closing_prayer_role: "Sister",
    closing_prayer_name: "Emma",
    hymn_opening: "#2 - The Spirit of God",
    hymn_sacrament: "#193 - I Stand All Amazed",
    hymn_closing: "#243 - Let Us All Press On",
    classes_json: {
      sunday_school: {
        topic: "Proverbs 1–4; Ecclesiastes 1–3",
        url: "https://churchofjesuschrist.org/study/cfm",
        teacher: "Brother Davis",
      },
      elders_quorum: {
        topic: "Watch Ye Therefore, and Pray Always",
        url: "",
        teacher: "Brother White",
      },
      relief_society: {
        topic: "Watch Ye Therefore, and Pray Always",
        url: "",
        teacher: "Sister Sahitya",
      },
      young_men: { topic: "Watch Ye Therefore, and Pray Always", url: "", teacher: "" },
      young_women: { topic: "Watch Ye Therefore, and Pray Always", url: "", teacher: "" },
      primary: { topic: "He Shall Direct Thy Paths", url: "", teacher: "Sister Rose" },
    }
  };

  test("formatFullAgendaWhatsApp produces complete formatted message with organizations and URLs", () => {
    const text = formatFullAgendaWhatsApp(sampleAgenda);
    expect(text).toContain("⛪ *WARD SUNDAY AGENDA*");
    expect(text).toContain("13 September 2026");
    expect(text).toContain("Brother Clark");
    expect(text).toContain("Stake High Councilor");
    expect(text).toContain("Youth - Young Men");
    expect(text).toContain("A New Normal");
    expect(text).toContain("https://churchofjesuschrist.org/study/talk2");
    expect(text).toContain("Sahitya");
    expect(text).toContain("Proverbs 1–4; Ecclesiastes 1–3");
  });

  test("formats Fast & Testimony meeting with testimonies and no talks", () => {
    const fastAgenda = {
      ...sampleAgenda,
      meeting_type: "fast_and_testimony" as const,
    };
    const text = formatFullAgendaWhatsApp(fastAgenda);
    expect(text).toContain("🍞 *WARD FAST & TESTIMONY MEETING*");
    expect(text).toContain("BEARING OF TESTIMONIES");
    expect(text).not.toContain("1st Talk");
    expect(text).toContain("Brother Clark"); // prayer still there
  });

  test("formats General Conference announcement", () => {
    const confAgenda = {
      ...sampleAgenda,
      meeting_type: "general_conference" as const,
      conference_url: "https://www.churchofjesuschrist.org/general-conference",
    };
    const text = formatFullAgendaWhatsApp(confAgenda);
    expect(text).toContain("📡 *GENERAL CONFERENCE*");
    expect(text).toContain("no local ward sacrament meeting");
    expect(text).toContain("https://www.churchofjesuschrist.org/general-conference");
  });

  test("formats Stake Conference announcement", () => {
    const stakeAgenda = {
      ...sampleAgenda,
      meeting_type: "stake_conference" as const,
    };
    const text = formatFullAgendaWhatsApp(stakeAgenda);
    expect(text).toContain("🏛️ *STAKE CONFERENCE*");
    expect(text).toContain("Stake Center");
  });

  test("formatIndividualReminderWhatsApp formats personal reminder message", () => {
    const reminder = formatIndividualReminderWhatsApp(
      "Relief Society Teacher",
      "Sahitya",
      "Watch Ye Therefore, and Pray Always",
      "2026-09-13"
    );
    expect(reminder).toContain("Sahitya");
    expect(reminder).toContain("Relief Society Teacher");
    expect(reminder).toContain("Watch Ye Therefore, and Pray Always");
    expect(reminder).toContain("13 September 2026");
  });

  test("formatFullAgendaWhatsApp and formatSacramentWhatsApp include 3rd talk organization when customized", () => {
    const customTalk3Agenda = {
      ...sampleAgenda,
      talk3_org: "Bishopric",
      talk3_title: "Consecration and Service",
      talk3_speaker: "Bishop Vance",
      talk3_url: "https://churchofjesuschrist.org/study/talk3",
    };

    const fullText = formatFullAgendaWhatsApp(customTalk3Agenda);
    expect(fullText).toContain("🗣️ *3rd Talk (Bishopric):* Consecration and Service - Bishop Vance");
    expect(fullText).toContain("🔗 https://churchofjesuschrist.org/study/talk3");

    const sacramentText = formatSacramentWhatsApp(customTalk3Agenda);
    expect(sacramentText).toContain("🗣️ *3rd Talk (Bishopric):* Consecration and Service - Bishop Vance");
    expect(sacramentText).toContain("🔗 https://churchofjesuschrist.org/study/talk3");
  });

  test("getWhatsAppShareUrl generates valid wa.me / api.whatsapp URL", () => {
    const url = getWhatsAppShareUrl("Hello *World*");
    expect(url).toBe("https://api.whatsapp.com/send?text=Hello%20*World*");
  });
});
