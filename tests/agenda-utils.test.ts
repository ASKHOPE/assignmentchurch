import { expect, test, describe } from "bun:test";
import { 
  getSundayOfMonth, 
  getNextSunday, 
  getPrevSunday, 
  createDefaultAgenda,
  formatDisplayDate 
} from "../src/agenda-utils";

describe("Agenda Utilities", () => {
  test("getSundayOfMonth calculates 1st through 5th Sundays and talk order accurately", () => {
    // September 2026 Sundays: 6 (1st), 13 (2nd), 20 (3rd), 27 (4th)
    const first = getSundayOfMonth("2026-09-06");
    expect(first.weekNumber).toBe(1);
    expect(first.label).toBe("1st Sunday");
    expect(first.talkOrder).toBe("1st Sunday: Fast & Testimony");
    expect(first.defaultMeetingType).toBe("fast_and_testimony");

    const second = getSundayOfMonth("2026-09-13");
    expect(second.weekNumber).toBe(2);
    expect(second.label).toBe("2nd Sunday");
    expect(second.talkOrder).toBe("2nd Sunday: Elders Quorum");
    expect(second.defaultMeetingType).toBe("standard");

    const third = getSundayOfMonth("2026-09-20");
    expect(third.weekNumber).toBe(3);
    expect(third.label).toBe("3rd Sunday");
    expect(third.talkOrder).toBe("3rd Sunday: Relief Society");

    const fourth = getSundayOfMonth("2026-09-27");
    expect(fourth.weekNumber).toBe(4);
    expect(fourth.label).toBe("4th Sunday");
    expect(fourth.talkOrder).toBe("4th Sunday: Elders Quorum");

    // May 2026 has a 5th Sunday: May 31
    const fifth = getSundayOfMonth("2026-05-31");
    expect(fifth.weekNumber).toBe(5);
    expect(fifth.label).toBe("5th Sunday");
    expect(fifth.talkOrder).toBe("5th Sunday: Bishopric");

    // April 1st week suggests General Conference
    const aprilConf = getSundayOfMonth("2026-04-05");
    expect(aprilConf.defaultMeetingType).toBe("general_conference");
  });

  test("getNextSunday and getPrevSunday navigate properly", () => {
    expect(getNextSunday("2026-09-13")).toBe("2026-09-20");
    expect(getPrevSunday("2026-09-13")).toBe("2026-09-06");
    expect(getNextSunday("2026-09-27")).toBe("2026-10-04");
  });

  test("formatDisplayDate formats nicely", () => {
    expect(formatDisplayDate("2026-09-13")).toBe("13 September 2026");
  });

  test("createDefaultAgenda produces valid structure matching spreadsheet", () => {
    const agenda = createDefaultAgenda("2026-09-13");
    expect(agenda.date).toBe("2026-09-13");
    expect(agenda.week_label).toBe("2nd Sunday");
    expect(agenda.talk2_org).toBe("Elders Quorum");
    expect(agenda.opening_prayer_role).toBe("Brother");
    expect(agenda.closing_prayer_role).toBe("Sister");
    expect(agenda.classes_json).toBeDefined();
    expect(agenda.classes_json.sunday_school).toBeDefined();
    expect(agenda.classes_json.elders_quorum).toBeDefined();
    expect(agenda.classes_json.relief_society).toBeDefined();
    expect(agenda.classes_json.young_men).toBeDefined();
    expect(agenda.classes_json.young_women).toBeDefined();
    expect(agenda.classes_json.primary).toBeDefined();
  });

  test("createDefaultAgenda for 1st Sunday sets fast_and_testimony", () => {
    const fastAgenda = createDefaultAgenda("2026-09-06");
    expect(fastAgenda.meeting_type).toBe("fast_and_testimony");
    expect(fastAgenda.week_label).toContain("Fast & Testimony");
  });
});
