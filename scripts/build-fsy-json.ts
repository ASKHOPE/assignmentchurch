import * as fs from "fs";
import * as path from "path";

// Structured FSY Lessons from church website for 2026
const fsyLessons = [
  // September 2026
  {
    year: 2026,
    month: 9,
    sunday_number: 1,
    organization: "both",
    title: "Fast Sunday: 1. Study the chapter from the FSY guide",
    description: "Study helps for the fast Sunday in September.",
    url: "https://www.churchofjesuschrist.org/study/ftsoy/2026/09/fsy-lessons/01-fast-sunday?lang=eng"
  },
  {
    year: 2026,
    month: 9,
    sunday_number: 2,
    organization: "both",
    title: "Second Sunday: 2. Learn more about the restoration of the priesthood",
    description: "Study helps for the second Sunday in September.",
    url: "https://www.churchofjesuschrist.org/study/ftsoy/2026/09/fsy-lessons/02-second-sunday?lang=eng"
  },
  {
    year: 2026,
    month: 9,
    sunday_number: 3,
    organization: "both",
    title: "Third Sunday: 3. Learn more about priesthood keys",
    description: "Study helps for the third Sunday in September.",
    url: "https://www.churchofjesuschrist.org/study/ftsoy/2026/09/fsy-lessons/03-third-sunday?lang=eng"
  },
  {
    year: 2026,
    month: 9,
    sunday_number: 4,
    organization: "young_women",
    title: "Last Sunday (Young Women): 4. Becoming a covenant daughter of God",
    description: "Study helps for Young Women classes on the fourth Sunday in September.",
    url: "https://www.churchofjesuschrist.org/study/ftsoy/2026/09/fsy-lessons/04a-fourth-sunday?lang=eng"
  },
  {
    year: 2026,
    month: 9,
    sunday_number: 4,
    organization: "young_men",
    title: "Last Sunday (Aaronic Priesthood): 4. Becoming a covenant son of God",
    description: "Study helps for Aaronic Priesthood quorums on the last Sunday in September.",
    url: "https://www.churchofjesuschrist.org/study/ftsoy/2026/09/fsy-lessons/04b-fourth-sunday?lang=eng"
  },
  {
    year: 2026,
    month: 9,
    sunday_number: 5,
    organization: "both",
    title: "5th Sunday: Youth Activity & Priesthood Power Challenge",
    description: "Combined Aaronic Priesthood and Young Women fifth Sunday discussion and activity.",
    url: "https://www.churchofjesuschrist.org/study/ftsoy/2026/09/fsy-lessons/05b-activity-idea?lang=eng"
  },

  // October 2026
  {
    year: 2026,
    month: 10,
    sunday_number: 1,
    organization: "both",
    title: "Fast Sunday: 1. Study the chapter from the FSY guide",
    description: "Study helps for the first Sunday in October: Your Body Is Sacred.",
    url: "https://www.churchofjesuschrist.org/study/ftsoy/2026/10/fsy-lessons/01-fast-sunday?lang=eng"
  },
  {
    year: 2026,
    month: 10,
    sunday_number: 2,
    organization: "both",
    title: "Second Sunday: 2. Learn more about the Word of Wisdom",
    description: "Study helps for the second Sunday in October.",
    url: "https://www.churchofjesuschrist.org/study/ftsoy/2026/10/fsy-lessons/02-second-sunday?lang=eng"
  },
  {
    year: 2026,
    month: 10,
    sunday_number: 3,
    organization: "both",
    title: "Third Sunday: 3. Learn more about the law of chastity",
    description: "Study helps for the third Sunday in October.",
    url: "https://www.churchofjesuschrist.org/study/ftsoy/2026/10/fsy-lessons/03-third-sunday?lang=eng"
  },
  {
    year: 2026,
    month: 10,
    sunday_number: 4,
    organization: "young_women",
    title: "Last Sunday (Young Women): 4. Becoming a covenant daughter of God",
    description: "Study helps for Young Women classes on the fourth Sunday in October.",
    url: "https://www.churchofjesuschrist.org/study/ftsoy/2026/10/fsy-lessons/04a-fourth-sunday?lang=eng"
  },
  {
    year: 2026,
    month: 10,
    sunday_number: 4,
    organization: "young_men",
    title: "Last Sunday (Aaronic Priesthood): 4. Becoming a covenant son of God",
    description: "Study helps for Aaronic Priesthood quorums on the fourth Sunday in October.",
    url: "https://www.churchofjesuschrist.org/study/ftsoy/2026/10/fsy-lessons/04b-fourth-sunday?lang=eng"
  },
  {
    year: 2026,
    month: 10,
    sunday_number: 5,
    organization: "both",
    title: "5th Sunday: Youth Cookoff for a Healthy Body",
    description: "Combined youth activity and discussion on temple bodies.",
    url: "https://www.churchofjesuschrist.org/study/ftsoy/2026/10/fsy-lessons/05a-activity-idea?lang=eng"
  },

  // November 2026
  {
    year: 2026,
    month: 11,
    sunday_number: 1,
    organization: "both",
    title: "Fast Sunday: 1. Study the chapter from the FSY guide",
    description: "Study helps for the first Sunday in November.",
    url: "https://www.churchofjesuschrist.org/study/ftsoy/2026/11/fsy-lessons/01-fast-sunday?lang=eng"
  },
  {
    year: 2026,
    month: 11,
    sunday_number: 2,
    organization: "both",
    title: "Second Sunday: 2. Learn more about studying the scriptures",
    description: "Study helps for the second Sunday in November.",
    url: "https://www.churchofjesuschrist.org/study/ftsoy/2026/11/fsy-lessons/02-second-sunday?lang=eng"
  },
  {
    year: 2026,
    month: 11,
    sunday_number: 3,
    organization: "both",
    title: "Third Sunday: 3. Learn more about the search for truth",
    description: "Study helps for the third Sunday in November.",
    url: "https://www.churchofjesuschrist.org/study/ftsoy/2026/11/fsy-lessons/03-third-sunday?lang=eng"
  },
  {
    year: 2026,
    month: 11,
    sunday_number: 4,
    organization: "young_women",
    title: "Last Sunday (Young Women): 4. Becoming a covenant daughter of God",
    description: "Study helps for Young Women classes on the fourth Sunday in November.",
    url: "https://www.churchofjesuschrist.org/study/ftsoy/2026/11/fsy-lessons/04a-fourth-sunday?lang=eng"
  },
  {
    year: 2026,
    month: 11,
    sunday_number: 4,
    organization: "young_men",
    title: "Last Sunday (Aaronic Priesthood): 4. Becoming a covenant son of God",
    description: "Study helps for Aaronic Priesthood quorums on the fourth Sunday in November.",
    url: "https://www.churchofjesuschrist.org/study/ftsoy/2026/11/fsy-lessons/04b-fourth-sunday?lang=eng"
  },
  {
    year: 2026,
    month: 11,
    sunday_number: 5,
    organization: "both",
    title: "5th Sunday: Combined Youth Truth and Light Workshop",
    description: "Combined youth fifth Sunday learning experience.",
    url: "https://www.churchofjesuschrist.org/study/ftsoy/2026/11/fsy-lessons/00-intro?lang=eng"
  },

  // December 2026
  {
    year: 2026,
    month: 12,
    sunday_number: 1,
    organization: "both",
    title: "Fast Sunday: 1. Study the chapter from the FSY guide",
    description: "Study helps for the first Sunday in December.",
    url: "https://www.churchofjesuschrist.org/study/ftsoy/2026/12/fsy-lessons/01-fast-sunday?lang=eng"
  },
  {
    year: 2026,
    month: 12,
    sunday_number: 2,
    organization: "both",
    title: "Second Sunday: 2. Learn more about Jesus Christ",
    description: "Study helps for the second Sunday in December.",
    url: "https://www.churchofjesuschrist.org/study/ftsoy/2026/12/fsy-lessons/02-second-sunday?lang=eng"
  },
  {
    year: 2026,
    month: 12,
    sunday_number: 3,
    organization: "both",
    title: "Third Sunday: 3. Learn more about the First Presidency Christmas Devotional",
    description: "Study helps for the third Sunday in December.",
    url: "https://www.churchofjesuschrist.org/study/ftsoy/2026/12/fsy-lessons/03-third-sunday?lang=eng"
  },
  {
    year: 2026,
    month: 12,
    sunday_number: 4,
    organization: "young_women",
    title: "Last Sunday (Young Women): 4. Becoming a covenant daughter of God",
    description: "Study helps for Young Women classes on the fourth Sunday in December.",
    url: "https://www.churchofjesuschrist.org/study/ftsoy/2026/12/fsy-lessons/04a-fourth-sunday?lang=eng"
  },
  {
    year: 2026,
    month: 12,
    sunday_number: 4,
    organization: "young_men",
    title: "Last Sunday (Aaronic Priesthood): 4. Becoming a covenant son of God",
    description: "Study helps for Aaronic Priesthood quorums on the fourth Sunday in December.",
    url: "https://www.churchofjesuschrist.org/study/ftsoy/2026/12/fsy-lessons/04b-fourth-sunday?lang=eng"
  },
  {
    year: 2026,
    month: 12,
    sunday_number: 5,
    organization: "both",
    title: "5th Sunday: Youth Christmas Service & Reflection",
    description: "Combined youth meeting for year-end Christmas testimony.",
    url: "https://www.churchofjesuschrist.org/study/ftsoy/2026/12/fsy-lessons/00-intro?lang=eng"
  }
];

const outPath = path.join(process.cwd(), "data", "fsy-lessons.json");
fs.writeFileSync(outPath, JSON.stringify(fsyLessons, null, 2), "utf-8");
console.log(`Saved ${fsyLessons.length} FSY lessons to ${outPath}`);
