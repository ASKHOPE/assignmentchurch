/**
 * Church Study & Curriculum Planner Client Logic
 * Enables advance spiritual curation of upcoming Sundays.
 */

let activeDate = "";
let currentAgenda = null;
let currentBookFilter = "Hymns (1985)"; // Default to standard Hymnbook
let searchDebounceTimer = null;
let currentViewMode = "grid";
try {
  currentViewMode = localStorage.getItem("study_view_mode") || "grid";
} catch (e) {}

function applyViewMode(mode) {
  currentViewMode = mode || "grid";
  try {
    localStorage.setItem("study_view_mode", currentViewMode);
  } catch (e) {}

  document.querySelectorAll(".btn-view-toggle").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === currentViewMode);
  });

  const containers = [
    document.getElementById("hymnsGrid"),
    document.getElementById("talksGrid"),
    document.getElementById("gpGrid"),
    document.getElementById("cfmGrid"),
    document.getElementById("fsyGrid"),
    ...document.querySelectorAll("#talksGridContainer .cards-grid"),
    ...document.querySelectorAll(".conf-cards-grid")
  ];

  containers.forEach(el => {
    if (el) {
      if (currentViewMode === "list") {
        el.classList.add("view-mode-list");
      } else {
        el.classList.remove("view-mode-list");
      }
    }
  });
}

// Calendar Selector & Navigation Elements (from Home)
const btnPrevSunday = document.getElementById("btn-prev-sunday") || document.getElementById("prevSundayBtn");
const btnNextSunday = document.getElementById("btn-next-sunday") || document.getElementById("nextSundayBtn");
const btnOpenCalendar = document.getElementById("btn-open-calendar");
const dateDisplayText = document.getElementById("date-display-text") || document.getElementById("curateDateDisplay");
const weekPill = document.getElementById("week-pill");
const datePicker = document.getElementById("date-picker") || document.getElementById("curateDateInput");
const curateDateInput = datePicker;
const prevSundayBtn = btnPrevSunday;
const nextSundayBtn = btnNextSunday;

// Popover Elements
const calendarPopover = document.getElementById("calendar-popover");
const btnClosePopover = document.getElementById("btn-close-popover");
const btnPrevMonth = document.getElementById("btn-prev-month");
const btnNextMonth = document.getElementById("btn-next-month");
const popoverMonthLabel = document.getElementById("popover-month-label");
const popoverSundaysList = document.getElementById("popover-sundays-list");
const btnTriggerNativePicker = document.getElementById("btn-trigger-native-picker");

// Full Calendar Modal Elements
const fullCalModal = document.getElementById("full-calendar-modal");
const btnCloseFullCal = document.getElementById("btn-close-full-cal");
const fullCalMonthYear = document.getElementById("full-cal-month-year");
const btnCalPrevYear = document.getElementById("btn-cal-prev-year");
const btnCalPrevMonth = document.getElementById("btn-cal-prev-month");
const btnCalNextMonth = document.getElementById("btn-cal-next-month");
const btnCalNextYear = document.getElementById("btn-cal-next-year");
const btnCalToday = document.getElementById("btn-cal-today");
const calDaysGrid = document.getElementById("cal-days-grid");
const calDetailsDate = document.getElementById("cal-details-date");
const calDetailsBadge = document.getElementById("cal-details-badge");
const calDetailsEventsList = document.getElementById("cal-details-events-list");
const btnCalJumpAgenda = document.getElementById("btn-cal-jump-agenda");
const calToggleLds = document.getElementById("cal-toggle-lds");
const calToggleIndian = document.getElementById("cal-toggle-indian");
const indianFeedStatus = document.getElementById("indian-feed-status");

let popoverDate = new Date();
let fullCalYear = new Date().getFullYear();
let fullCalMonth = new Date().getMonth();
let fullCalSelectedDate = "";
const fullCalHolidays = {};

const backToAgendaBtn = document.getElementById("backToAgendaBtn");
const viewInAgendaLink = document.getElementById("viewInAgendaLink");
const overviewSundayTitle = document.getElementById("overviewSundayTitle");

// Overview Pills: All 4 Hymns
const valOpeningHymn = document.getElementById("valOpeningHymn");
const valSacramentHymn = document.getElementById("valSacramentHymn");
const valInterludeHymn = document.getElementById("valInterludeHymn");
const valClosingHymn = document.getElementById("valClosingHymn");

// Overview Pills: Talks
const valTalk1 = document.getElementById("valTalk1");
const valTalk2 = document.getElementById("valTalk2");
const valTalk3 = document.getElementById("valTalk3");

// Overview Pills: Second Hour Classes & Quorums
const valCfmAdults = document.getElementById("valCfmAdults");
const valCfmYouth = document.getElementById("valCfmYouth");
const valPrimary = document.getElementById("valPrimary");
const valEq = document.getElementById("valEq");
const valRs = document.getElementById("valRs");
const valYm = document.getElementById("valYm");
const valYw = document.getElementById("valYw");

// Tabs
const tabButtons = document.querySelectorAll(".study-tab");
const tabPanels = document.querySelectorAll(".tab-panel");

// Hymns Tab
const hymnSearchInput = document.getElementById("hymnSearchInput");
const clearHymnSearch = document.getElementById("clearHymnSearch");
const bookChips = document.querySelectorAll(".book-filter-chips .chip");
const hymnsGrid = document.getElementById("hymnsGrid");
const hymnResultsCount = document.getElementById("hymnResultsCount");

// Gospel Principles Tab (Youth 1st Talk)
const gpSearchInput = document.getElementById("gpSearchInput");
const clearGpSearch = document.getElementById("clearGpSearch");
const gpGrid = document.getElementById("gpGrid");
const gpResultsCount = document.getElementById("gpResultsCount");

// Talks Tab
const talkSearchInput = document.getElementById("talkSearchInput");
const clearTalkSearch = document.getElementById("clearTalkSearch");
const talkSortSelect = document.getElementById("talkSortSelect");
const talkYearSelect = document.getElementById("talkYearSelect");
const talkSpeakerSelect = document.getElementById("talkSpeakerSelect");
const talksGrid = document.getElementById("talksGrid");
const talkResultsCount = document.getElementById("talkResultsCount");

// CFM Tab
const cfmSearchInput = document.getElementById("cfmSearchInput");
const clearCfmSearch = document.getElementById("clearCfmSearch");
const cfmYearSelect = document.getElementById("cfmYearSelect");
const cfmActiveMatchBanner = document.getElementById("cfmActiveMatchBanner");
const cfmGrid = document.getElementById("cfmGrid");
const cfmResultsCount = document.getElementById("cfmResultsCount");

// FSY Lessons Tab
const fsySearchInput = document.getElementById("fsySearchInput");
const clearFsySearch = document.getElementById("clearFsySearch");
const fsyMonthSelect = document.getElementById("fsyMonthSelect");
const fsyOrgSelect = document.getElementById("fsyOrgSelect");
const fsyGrid = document.getElementById("fsyGrid");
const fsyResultsCount = document.getElementById("fsyResultsCount");
const fsyActiveMatchBanner = document.getElementById("fsyActiveMatchBanner");

// Toast
const studyToast = document.getElementById("studyToast");

function showToast(message, type = "success") {
  if (!studyToast) return;
  studyToast.textContent = message;
  studyToast.className = `study-toast show ${type}`;
  setTimeout(() => {
    studyToast.className = "study-toast";
  }, 3200);
}

/**
 * Timezone-safe date formatting (prevents UTC day shifts)
 */
function formatDateToISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Formats date as "13 Sep 2026" (month name) for header display
 */
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function formatDisplayDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const day = String(d).padStart(2, "0");
  const month = MONTH_SHORT[m - 1] || String(m).padStart(2, "0");
  return `${day} ${month} ${y}`;
}

/**
 * Formats date as DD/MM/YYYY for hover tooltip
 */
function formatNumericDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const day = String(d).padStart(2, "0");
  const month = String(m).padStart(2, "0");
  return `${day}/${month}/${y}`;
}

function formatFriendlyDate(dateStr) {
  return formatDisplayDate(dateStr);
}

function updateDateDisplay(dateStr) {
  const friendly = formatDisplayDate(dateStr);
  const numeric = formatNumericDate(dateStr);
  if (dateDisplayText) {
    dateDisplayText.textContent = friendly;
    dateDisplayText.title = numeric;
  }
  const el = document.getElementById("curateDateDisplay");
  if (el) {
    el.textContent = friendly;
    el.title = numeric;
  }
  if (weekPill) {
    if (currentAgenda && currentAgenda.week_label) {
      weekPill.textContent = currentAgenda.week_label;
    } else if (dateStr) {
      const [y, m, d] = dateStr.split("-").map(Number);
      const weekNum = Math.min(5, Math.ceil(d / 7));
      const ordinals = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th" };
      weekPill.textContent = `${ordinals[weekNum] || weekNum + "th"} Sunday`;
    }
  }
  if (datePicker) datePicker.value = dateStr;
}

/**
 * Sunday navigation math
 */
function getNextSunday(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const currentDay = date.getDay();
  const daysUntilSunday = currentDay === 0 ? 7 : (7 - currentDay);
  date.setDate(date.getDate() + daysUntilSunday);
  return formatDateToISO(date);
}

function getPrevSunday(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const currentDay = date.getDay();
  const daysSinceSunday = currentDay === 0 ? 7 : currentDay;
  date.setDate(date.getDate() - daysSinceSunday);
  return formatDateToISO(date);
}

function getInitialSunday() {
  const params = new URLSearchParams(window.location.search);
  const queryDate = params.get("date");
  if (queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate)) {
    return queryDate;
  }
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  const nextSun = new Date(today);
  nextSun.setDate(today.getDate() + diff);
  return formatDateToISO(nextSun);
}

/* --------------------------------------------------------------------------
   Calendar Popover
   -------------------------------------------------------------------------- */
function toggleCalendarPopover() {
  if (!calendarPopover) return;
  if (calendarPopover.classList.contains("open")) {
    closeCalendarPopover();
  } else {
    openCalendarPopover();
  }
}

function openCalendarPopover() {
  if (!calendarPopover) return;
  if (activeDate) {
    const [y, m, d] = activeDate.split("-").map(Number);
    popoverDate = new Date(y, m - 1, d, 12, 0, 0);
  }
  renderPopoverSundays();
  calendarPopover.classList.add("open");
  if (btnOpenCalendar) btnOpenCalendar.setAttribute("aria-expanded", "true");
}

function closeCalendarPopover() {
  if (!calendarPopover) return;
  calendarPopover.classList.remove("open");
  if (btnOpenCalendar) btnOpenCalendar.setAttribute("aria-expanded", "false");
}

function renderPopoverSundays() {
  if (!popoverSundaysList || !popoverMonthLabel) return;
  const year = popoverDate.getFullYear();
  const month = popoverDate.getMonth();

  popoverMonthLabel.textContent = popoverDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  popoverSundaysList.innerHTML = "";
  const numDays = new Date(year, month + 1, 0).getDate();
  const sundays = [];

  for (let day = 1; day <= numDays; day++) {
    const d = new Date(year, month, day, 12, 0, 0);
    if (d.getDay() === 0) {
      const weekNum = Math.min(5, Math.ceil(day / 7));
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      sundays.push({ day, weekNum, iso });
    }
  }

  const ordinals = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th" };

  for (const s of sundays) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sunday-item-btn";
    if (s.iso === activeDate) {
      btn.classList.add("selected");
    }

    const displayStr = `${String(s.day).padStart(2, "0")}/${String(month + 1).padStart(2, "0")}/${year}`;
    const badgeStr = `${ordinals[s.weekNum] || s.weekNum + "th"} Sunday`;

    btn.innerHTML = `
      <span class="sunday-item-date">${displayStr}</span>
      <span class="sunday-item-badge">${badgeStr}</span>
    `;

    btn.addEventListener("click", () => {
      closeCalendarPopover();
      loadAgendaForDate(s.iso);
    });

    popoverSundaysList.appendChild(btn);
  }
}

/* --------------------------------------------------------------------------
   Full Calendar & Celebrations Modal
   -------------------------------------------------------------------------- */
async function openFullCalendarModal() {
  if (!fullCalModal) return;
  if (activeDate) {
    const [y, m, d] = activeDate.split("-").map(Number);
    fullCalYear = y;
    fullCalMonth = m - 1;
    fullCalSelectedDate = activeDate;
  }

  fullCalModal.classList.add("open");
  await loadAndRenderFullCalendar();
  selectFullCalDate(fullCalSelectedDate);
}

function closeFullCalendarModal() {
  if (!fullCalModal) return;
  fullCalModal.classList.remove("open");
}

async function loadAndRenderFullCalendar() {
  if (!fullCalHolidays[fullCalYear]) {
    try {
      if (indianFeedStatus) indianFeedStatus.textContent = "Syncing...";
      const res = await fetch(`/api/holidays?year=${fullCalYear}&include_indian=true`);
      const json = await res.json();
      if (json.success) {
        fullCalHolidays[fullCalYear] = json.holidays;
        if (indianFeedStatus) indianFeedStatus.textContent = "Live";
      }
    } catch (err) {
      console.warn("Could not fetch holidays:", err);
      if (indianFeedStatus) indianFeedStatus.textContent = "Offline";
    }
  }
  renderFullCalendarGrid();
}

function renderFullCalendarGrid() {
  if (!calDaysGrid || !fullCalMonthYear) return;
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  fullCalMonthYear.textContent = `${monthNames[fullCalMonth]} ${fullCalYear}`;

  calDaysGrid.innerHTML = "";

  const holidays = fullCalHolidays[fullCalYear] || [];
  const showLds = calToggleLds ? calToggleLds.checked : true;
  const showIndian = calToggleIndian ? calToggleIndian.checked : true;

  const activeHolidays = holidays.filter((h) => {
    if (h.category === "lds" && !showLds) return false;
    if (h.category === "indian" && !showIndian) return false;
    return true;
  });

  const holidaysByDate = {};
  for (const h of activeHolidays) {
    if (!holidaysByDate[h.date]) holidaysByDate[h.date] = [];
    holidaysByDate[h.date].push(h);
  }

  const firstOfMonth = new Date(fullCalYear, fullCalMonth, 1, 12, 0, 0);
  const dayOfWeek = firstOfMonth.getDay();
  const startDate = new Date(firstOfMonth);
  startDate.setDate(firstOfMonth.getDate() - dayOfWeek);

  const todayStr = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(startDate);
    cellDate.setDate(startDate.getDate() + i);

    const cy = cellDate.getFullYear();
    const cm = String(cellDate.getMonth() + 1).padStart(2, "0");
    const cd = String(cellDate.getDate()).padStart(2, "0");
    const dateStr = `${cy}-${cm}-${cd}`;

    const isCurrentMonth = cellDate.getMonth() === fullCalMonth;
    const isSunday = cellDate.getDay() === 0;
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === fullCalSelectedDate;

    const cell = document.createElement("div");
    cell.className = `cal-day-cell ${isCurrentMonth ? "" : "other-month"} ${isSunday ? "is-sunday" : ""} ${isToday ? "is-today" : ""} ${isSelected ? "is-selected" : ""}`;
    cell.dataset.date = dateStr;

    const cellTop = document.createElement("div");
    cellTop.className = "cal-cell-top";

    const dayNum = document.createElement("span");
    dayNum.className = "cal-day-num";
    dayNum.textContent = cellDate.getDate();
    cellTop.appendChild(dayNum);

    if (isSunday) {
      const sunBadge = document.createElement("span");
      sunBadge.className = "cal-sunday-badge";
      const weekNum = Math.min(5, Math.ceil(cellDate.getDate() / 7));
      sunBadge.textContent = `${weekNum}${weekNum === 1 ? "st" : weekNum === 2 ? "nd" : weekNum === 3 ? "rd" : "th"}`;
      cellTop.appendChild(sunBadge);
    }

    cell.appendChild(cellTop);

    const dayEvents = holidaysByDate[dateStr] || [];
    if (dayEvents.length > 0) {
      const eventsWrap = document.createElement("div");
      eventsWrap.className = "cal-events-list";

      const displayEvents = dayEvents.slice(0, 2);
      for (const ev of displayEvents) {
        const pill = document.createElement("div");
        pill.className = `cal-event-pill ${ev.category === "lds" ? "pill-lds" : "pill-hindu"}`;
        pill.title = `${ev.name} (${ev.category.toUpperCase()})`;
        pill.innerHTML = `<span>${ev.icon}</span><span class="event-title">${escapeHtml(ev.name)}</span>`;
        eventsWrap.appendChild(pill);
      }

      if (dayEvents.length > 2) {
        const morePill = document.createElement("div");
        morePill.className = "cal-event-pill";
        morePill.style.fontSize = "0.65rem";
        morePill.style.opacity = "0.8";
        morePill.textContent = `+${dayEvents.length - 2} more`;
        eventsWrap.appendChild(morePill);
      }

      cell.appendChild(eventsWrap);
    }

    cell.addEventListener("click", () => {
      selectFullCalDate(dateStr);
    });

    if (isSunday) {
      cell.addEventListener("dblclick", () => {
        loadAgendaForDate(dateStr);
        closeFullCalendarModal();
        showToast(`Loaded Sunday ${formatDisplayDate(dateStr)}`);
      });
    }

    calDaysGrid.appendChild(cell);
  }
}

function selectFullCalDate(dateStr) {
  if (!calDaysGrid || !calDetailsDate) return;
  fullCalSelectedDate = dateStr;

  calDaysGrid.querySelectorAll(".cal-day-cell").forEach((c) => {
    c.classList.toggle("is-selected", c.dataset.date === dateStr);
  });

  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d, 12, 0, 0);
  const isSunday = dateObj.getDay() === 0;

  calDetailsDate.textContent = `${dateObj.toLocaleDateString("en-GB", { weekday: "long" })}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;

  if (isSunday) {
    const weekNum = Math.min(5, Math.ceil(d / 7));
    const rotationRules = {
      1: "1st Sunday (Fast & Testimony)",
      2: "2nd Sunday (Elders Quorum)",
      3: "3rd Sunday (Relief Society)",
      4: "4th Sunday (Elders Quorum)",
      5: "5th Sunday (Bishopric)",
    };
    if (calDetailsBadge) {
      calDetailsBadge.textContent = rotationRules[weekNum] || `${weekNum}th Sunday`;
      calDetailsBadge.className = "pill-badge pill-amber";
      calDetailsBadge.style.display = "inline-flex";
    }

    if (btnCalJumpAgenda) {
      btnCalJumpAgenda.innerHTML = "<span>⛪ Curate This Sunday</span>";
      btnCalJumpAgenda.style.display = "inline-flex";
      btnCalJumpAgenda.onclick = () => {
        loadAgendaForDate(dateStr);
        closeFullCalendarModal();
        showToast(`Loaded Sunday ${formatDisplayDate(dateStr)}`);
      };
    }
  } else {
    if (calDetailsBadge) calDetailsBadge.style.display = "none";
    const prevSunday = new Date(dateObj);
    prevSunday.setDate(dateObj.getDate() - dateObj.getDay());
    const psy = prevSunday.getFullYear();
    const psm = String(prevSunday.getMonth() + 1).padStart(2, "0");
    const psd = String(prevSunday.getDate()).padStart(2, "0");
    const sundayStr = `${psy}-${psm}-${psd}`;

    if (btnCalJumpAgenda) {
      btnCalJumpAgenda.innerHTML = `<span>➡️ Go to Sunday (${formatDisplayDate(sundayStr)})</span>`;
      btnCalJumpAgenda.style.display = "inline-flex";
      btnCalJumpAgenda.onclick = () => {
        loadAgendaForDate(sundayStr);
        closeFullCalendarModal();
        showToast(`Loaded Sunday ${formatDisplayDate(sundayStr)}`);
      };
    }
  }

  if (calDetailsEventsList) {
    calDetailsEventsList.innerHTML = "";
    const holidays = fullCalHolidays[y] || [];
    const showLds = calToggleLds ? calToggleLds.checked : true;
    const showIndian = calToggleIndian ? calToggleIndian.checked : true;

    const dayHolidays = holidays.filter((h) => {
      if (h.date !== dateStr) return false;
      if (h.category === "lds" && !showLds) return false;
      if (h.category === "indian" && !showIndian) return false;
      return true;
    });

    if (dayHolidays.length === 0) {
      const empty = document.createElement("div");
      empty.className = "cal-empty-hint";
      empty.textContent = isSunday
        ? "Regular ward Sunday meeting. Click 'Curate This Sunday' above to view and plan topics."
        : "No special celebrations on this date.";
      calDetailsEventsList.appendChild(empty);
    } else {
      for (const ev of dayHolidays) {
        const item = document.createElement("div");
        item.className = "cal-event-detail-item";

        const icon = document.createElement("span");
        icon.className = "cal-event-icon";
        icon.textContent = ev.icon;

        const info = document.createElement("div");
        info.className = "cal-event-info";

        const title = document.createElement("div");
        title.className = "cal-event-name";
        title.textContent = ev.name;

        const cat = document.createElement("div");
        cat.className = "cal-event-category";
        cat.textContent = ev.category === "lds" ? "LDS Celebration" : "Indian / Hindu Festival";

        info.appendChild(title);
        info.appendChild(cat);
        item.appendChild(icon);
        item.appendChild(info);
        calDetailsEventsList.appendChild(item);
      }
    }
  }
}


/* --------------------------------------------------------------------------
   Meeting Type — Set Topics Page
   -------------------------------------------------------------------------- */
const meetingTypeMeta = {
  standard:           { icon: "⛪", label: "Standard" },
  fast_and_testimony: { icon: "🍞", label: "Fast & Testimony" },
  general_conference: { icon: "📡", label: "General Conference" },
  stake_conference:   { icon: "🏛️", label: "Stake Conference" },
};

function applyMeetingTypeStudy(type) {
  const btns = document.querySelectorAll(".meeting-type-btn-study");
  btns.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.type === type);
  });

  const conferenceCard = document.getElementById("study-conference-card");
  const curatedSections = document.getElementById("curatedSectionsContainer");
  const talksGrid = document.getElementById("overviewTalksGrid");
  const fastBanner = document.getElementById("studyFastTestimonyBanner");
  const talksIcon = document.getElementById("talksSubgroupIcon");
  const talksTitle = document.getElementById("talksSubgroupTitle");

  const confIcon = document.getElementById("study-conf-icon");
  const confMainTitle = document.getElementById("study-conf-main-title");
  const confTypeBadge = document.getElementById("study-conf-type-badge");
  const confNoticeText = document.getElementById("study-conf-notice-text");
  const confTitleInput = document.getElementById("study-conf-title");
  const confUrlInput = document.getElementById("study-conf-url");
  const confLinkBtn = document.getElementById("study-conf-link-btn");
  const confDetailsInput = document.getElementById("study-conf-details");

  if (type === "general_conference") {
    if (conferenceCard) conferenceCard.style.display = "block";
    if (curatedSections) curatedSections.style.display = "none";
    if (confIcon) confIcon.textContent = "📡";
    if (confMainTitle) confMainTitle.textContent = "General Conference Sunday";
    if (confTypeBadge) {
      confTypeBadge.textContent = "Worldwide Broadcast";
      confTypeBadge.className = "pill-badge pill-blue";
    }
    if (confNoticeText) {
      confNoticeText.textContent = "Notice: General Conference worldwide broadcast. No local ward sacrament meeting or 2nd hour Sunday School/Quorum classes will be held today.";
    }
    if (confTitleInput && currentAgenda) {
      confTitleInput.value = currentAgenda.conference_title || "General Conference Worldwide Broadcast";
    }
    if (confUrlInput && currentAgenda) {
      confUrlInput.value = currentAgenda.conference_url || "https://www.churchofjesuschrist.org/general-conference";
      if (confLinkBtn) {
        confLinkBtn.href = confUrlInput.value || "#";
        confLinkBtn.style.display = confUrlInput.value ? "inline-flex" : "none";
      }
    }
    if (confDetailsInput && currentAgenda) {
      confDetailsInput.value = currentAgenda.conference_details || "";
    }
  } else if (type === "stake_conference") {
    if (conferenceCard) conferenceCard.style.display = "block";
    if (curatedSections) curatedSections.style.display = "none";
    if (confIcon) confIcon.textContent = "🏛️";
    if (confMainTitle) confMainTitle.textContent = "Stake Conference Sunday";
    if (confTypeBadge) {
      confTypeBadge.textContent = "Stake Center Meeting";
      confTypeBadge.className = "pill-badge pill-purple";
    }
    if (confNoticeText) {
      confNoticeText.textContent = "Notice: All ward members gather at the Stake Center for Stake Conference. No local ward meetings will be held today.";
    }
    if (confTitleInput && currentAgenda) {
      confTitleInput.value = currentAgenda.conference_title || "Stake Conference at Stake Center";
    }
    if (confUrlInput && currentAgenda) {
      confUrlInput.value = currentAgenda.conference_url || "";
      if (confLinkBtn) {
        confLinkBtn.href = confUrlInput.value || "#";
        confLinkBtn.style.display = confUrlInput.value ? "inline-flex" : "none";
      }
    }
    if (confDetailsInput && currentAgenda) {
      confDetailsInput.value = currentAgenda.conference_details || "";
    }
  } else if (type === "fast_and_testimony") {
    if (conferenceCard) conferenceCard.style.display = "none";
    if (curatedSections) curatedSections.style.display = "flex";
    if (talksGrid) talksGrid.style.display = "none";
    if (fastBanner) fastBanner.style.display = "flex";
    if (talksIcon) talksIcon.textContent = "🍞";
    if (talksTitle) talksTitle.textContent = "Sacrament Testimonies (Fast Sunday)";
  } else {
    // standard
    if (conferenceCard) conferenceCard.style.display = "none";
    if (curatedSections) curatedSections.style.display = "flex";
    if (talksGrid) talksGrid.style.display = "grid";
    if (fastBanner) fastBanner.style.display = "none";
    if (talksIcon) talksIcon.textContent = "🎙️";
    if (talksTitle) talksTitle.textContent = "Sacrament Talks";
  }
}

async function setMeetingTypeStudy(type) {
  if (!currentAgenda) return;
  currentAgenda.meeting_type = type;

  if (type === "general_conference") {
    currentAgenda.week_label = "General Conference";
    if (!currentAgenda.conference_title) currentAgenda.conference_title = "General Conference Worldwide Broadcast";
    if (!currentAgenda.conference_url) currentAgenda.conference_url = "https://www.churchofjesuschrist.org/general-conference";
  } else if (type === "stake_conference") {
    currentAgenda.week_label = "Stake Conference";
    if (!currentAgenda.conference_title) currentAgenda.conference_title = "Stake Conference at Stake Center";
  } else if (type === "fast_and_testimony") {
    if (!currentAgenda.week_label.includes("Fast & Testimony")) {
      currentAgenda.week_label = (currentAgenda.week_label || "").replace(" - Fast & Testimony", "") + " - Fast & Testimony";
    }
  } else {
    currentAgenda.week_label = (currentAgenda.week_label || "").replace(" - Fast & Testimony", "");
  }

  applyMeetingTypeStudy(type);
  updateDateDisplay(activeDate);
  const meta = meetingTypeMeta[type] || meetingTypeMeta.standard;
  await saveAgendaUpdate(
    {
      meeting_type: type,
      week_label: currentAgenda.week_label,
      conference_title: currentAgenda.conference_title,
      conference_url: currentAgenda.conference_url,
      conference_details: currentAgenda.conference_details
    },
    `✓ Meeting type set to ${meta.label}`
  );
}

/**
 * Load Active Agenda for Selected Date
 */
async function loadAgendaForDate(dateStr) {
  activeDate = dateStr;
  if (datePicker) datePicker.value = dateStr;
  updateDateDisplay(dateStr);
  // Update agenda sheet link href
  const sheetBtn = document.getElementById("studyAgendaSheetBtn");
  if (sheetBtn) sheetBtn.href = `/?date=${dateStr}`;
  if (backToAgendaBtn) backToAgendaBtn.href = `/?date=${dateStr}`;
  if (viewInAgendaLink) viewInAgendaLink.href = `/?date=${dateStr}`;

  try {
    const res = await fetch(`/api/agenda/${dateStr}`);
    if (!res.ok) throw new Error("Failed to load agenda");
    const json = await res.json();
    currentAgenda = json.data;

    // If 1st Sunday (day of month <= 7), default to Fast & Testimony unless explicitly Conference
    const [y, m, d] = dateStr.split("-").map(Number);
    const isFirstSunday = d <= 7;
    let meetingType = currentAgenda.meeting_type || "standard";
    if (isFirstSunday && meetingType !== "general_conference" && meetingType !== "stake_conference") {
      meetingType = "fast_and_testimony";
      currentAgenda.meeting_type = "fast_and_testimony";
      if (!currentAgenda.week_label || !currentAgenda.week_label.includes("Fast & Testimony")) {
        currentAgenda.week_label = (currentAgenda.week_label || "1st Sunday").replace(" - Fast & Testimony", "") + " - Fast & Testimony";
      }
    }

    renderOverviewCard();
    applyMeetingTypeStudy(meetingType);
    updateDateDisplay(dateStr);
    // Refresh CFM & FSY matching for this new date
    loadCfm();
    loadFsy();
  } catch (err) {
    console.error("Error loading agenda:", err);
    showToast("Could not load agenda for " + dateStr, "error");
  }
}

/**
 * Helper to render pill link or plain text safely
 */
function renderPill(el, val, url, emptyText = "None selected") {
  if (!el) return;
  if (val) {
    el.innerHTML = url
      ? `<a href="${url}" target="_blank" rel="noopener">${escapeHtml(val)} 🔗</a>`
      : escapeHtml(val);
  } else {
    el.textContent = emptyText;
  }
}

/**
 * Render Current Curated Plan Overview Card
 */
function renderOverviewCard() {
  if (!currentAgenda) return;
  const dateFormatted = formatDisplayDate(activeDate);
  overviewSundayTitle.textContent = `Sunday Plan: ${dateFormatted} (${currentAgenda.week_label || "Sunday"})`;

  // 1. All 4 Hymns
  renderPill(valOpeningHymn, currentAgenda.hymn_opening, currentAgenda.hymn_opening_url);
  renderPill(valSacramentHymn, currentAgenda.hymn_sacrament, currentAgenda.hymn_sacrament_url);
  renderPill(valInterludeHymn, currentAgenda.hymn_interlude, currentAgenda.hymn_interlude_url);
  renderPill(valClosingHymn, currentAgenda.hymn_closing, currentAgenda.hymn_closing_url);

  // 2. Sacrament Talks
  renderPill(valTalk1, currentAgenda.talk1_title, currentAgenda.talk1_url, "No topic set");
  renderPill(valTalk2, currentAgenda.talk2_title, currentAgenda.talk2_url, "No topic set");
  renderPill(valTalk3, currentAgenda.talk3_title, currentAgenda.talk3_url, "No topic set");

  // Source hint notes for each talk
  const talk1Note = document.getElementById("talkNote1");
  const talk2Note = document.getElementById("talkNote2");
  const talk3Note = document.getElementById("talkNote3");

  const t1 = (currentAgenda.talk1_title || "").toLowerCase();
  const t2 = (currentAgenda.talk2_title || "").toLowerCase();
  const t3 = (currentAgenda.talk3_title || "").toLowerCase();

  // 1st Talk: should be from Gospel Principles, assigned to Youth
  if (talk1Note) {
    if (t1 && !t1.includes("gospel principles") && !t1.includes("chapter")) {
      talk1Note.textContent = "💡 Tip: The 1st Talk is typically given by a Youth speaker. The recommended source is Gospel Principles (a chapter topic assigned to the youth speaker).";
      talk1Note.style.display = "block";
      talk1Note.className = "pill-source-note pill-note-warn";
    } else if (t1.includes("gospel principles") || t1.includes("chapter")) {
      talk1Note.textContent = "✓ From Gospel Principles — Youth speaker";
      talk1Note.style.display = "block";
      talk1Note.className = "pill-source-note pill-note-ok";
    } else {
      talk1Note.style.display = "none";
    }
  }

  // 2nd Talk: should be from General Conference
  if (talk2Note) {
    if (t2 && !t2.includes("general conference") && !isLikelyConferenceTalk(currentAgenda.talk2_url)) {
      talk2Note.textContent = "💡 Tip: The 2nd Talk is usually a General Conference talk assigned to an Elders Quorum member or member family.";
      talk2Note.style.display = "block";
      talk2Note.className = "pill-source-note pill-note-warn";
    } else if (t2 && (t2.includes("general conference") || isLikelyConferenceTalk(currentAgenda.talk2_url))) {
      talk2Note.textContent = "✓ From General Conference — Elders Quorum / Member";
      talk2Note.style.display = "block";
      talk2Note.className = "pill-source-note pill-note-ok";
    } else {
      talk2Note.style.display = "none";
    }
  }

  // 3rd Talk: should be from General Conference
  if (talk3Note) {
    if (t3 && !t3.includes("general conference") && !isLikelyConferenceTalk(currentAgenda.talk3_url)) {
      talk3Note.textContent = "💡 Tip: The 3rd Talk is usually a General Conference talk assigned to a member or Relief Society sister.";
      talk3Note.style.display = "block";
      talk3Note.className = "pill-source-note pill-note-warn";
    } else if (t3 && (t3.includes("general conference") || isLikelyConferenceTalk(currentAgenda.talk3_url))) {
      talk3Note.textContent = "✓ From General Conference — Member / Relief Society";
      talk3Note.style.display = "block";
      talk3Note.className = "pill-source-note pill-note-ok";
    } else {
      talk3Note.style.display = "none";
    }
  }

  // 3. Second Hour Classes & Quorums
  const cJson = currentAgenda.classes_json || {};
  renderPill(valCfmAdults, cJson.sunday_school?.topic, cJson.sunday_school?.url, "No lesson set");
  renderPill(valCfmYouth, cJson.sunday_school_youth?.topic, cJson.sunday_school_youth?.url, "No lesson set");
  renderPill(valPrimary, cJson.primary?.topic, cJson.primary?.url, "No lesson set");
  renderPill(valEq, cJson.elders_quorum?.topic, cJson.elders_quorum?.url, "No talk set");
  renderPill(valRs, cJson.relief_society?.topic, cJson.relief_society?.url, "No talk set");
  renderPill(valYm, cJson.young_men?.topic, cJson.young_men?.url, "No lesson set");
  renderPill(valYw, cJson.young_women?.topic, cJson.young_women?.url, "No lesson set");
}

/**
 * Detect if a URL is from a General Conference talk on the Church website
 */
function isLikelyConferenceTalk(url) {
  if (!url) return false;
  return url.includes("churchofjesuschrist.org") &&
    (url.includes("/general-conference") || url.includes("/study/general-conference"));
}

/**
 * Save updated agenda fields back to server
 */
async function saveAgendaUpdate(partialUpdate, successMsg) {
  if (!currentAgenda) return;
  const modifiedKeys = Object.keys(partialUpdate);
  const updated = {
    ...currentAgenda,
    ...partialUpdate,
    date: activeDate,
    base_updated_at: currentAgenda.updated_at,
    modified_fields: modifiedKeys,
  };

  try {
    const res = await fetch(`/api/agenda/${activeDate}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    if (res.status === 429) {
      const rateData = await res.json().catch(() => ({}));
      const wait = rateData.resetInSec || 5;
      showToast(`⏳ Rate limit reached: wait ${wait}s before saving again`, "warning");
      return;
    }
    if (!res.ok) throw new Error("Failed to save agenda update");
    const json = await res.json();
    currentAgenda = json.data;
    renderOverviewCard();
    applyMeetingTypeStudy(currentAgenda.meeting_type || "standard");
    showToast(successMsg || "Updated successfully!");
  } catch (err) {
    console.error("Error saving agenda:", err);
    showToast("Failed to save changes", "error");
  }
}

/**
 * Fetch and Render Hymns (Full list, prioritized by 1985, Home & Church, Children's)
 */
async function loadHymns() {
  hymnsGrid.innerHTML = `<div class="loading-state">Loading hymns from database...</div>`;
  const q = hymnSearchInput.value.trim();
  const book = currentBookFilter;

  const url = `/api/hymns?q=${encodeURIComponent(q)}&book=${encodeURIComponent(book)}&limit=700`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const hymns = data.hymns || [];
    
    let filterLabel = "all books (664)";
    if (book.includes("1985")) filterLabel = "Hymns 1985 (Old Hymns)";
    else if (book.includes("Home")) filterLabel = "Hymns for Home & Church (New Hymns)";
    else if (book.includes("Children")) filterLabel = "Children's Songbook";
    
    hymnResultsCount.textContent = `Showing ${data.count || hymns.length} hymns from ${filterLabel}`;

    if (hymns.length === 0) {
      hymnsGrid.innerHTML = `<div class="empty-state">No hymns matched your search.</div>`;
      return;
    }

    hymnsGrid.innerHTML = hymns.map(h => {
      let bookLabel = h.book;
      let bookClass = "badge-1985";
      if (h.book.includes("1985")) {
        bookLabel = "Hymns 1985 (Old Hymns)";
        bookClass = "badge-1985";
      } else if (h.book.includes("Home")) {
        bookLabel = "Hymns for Home & Church (New Hymns)";
        bookClass = "badge-new";
      } else if (h.book.includes("Children")) {
        bookLabel = "Children's Songbook";
        bookClass = "badge-cs";
      }

      return `
        <div class="resource-card hymn-card">
          <div class="card-info-wrap">
            <div class="card-header">
              <span class="badge ${bookClass}">${escapeHtml(bookLabel)}</span>
              <span class="hymn-number">#${h.number}</span>
            </div>
            <div class="card-content-wrap">
              <h3 class="card-title">${escapeHtml(h.title)}</h3>
            </div>
            <div class="card-links">
              <a href="${h.url}" target="_blank" rel="noopener" class="btn-link-out">
                <span>🎧 Listen & Music</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </div>
          </div>
          <div class="action-btn-row">
            <button class="btn-assign" onclick="assignHymn('opening', ${h.number}, '${escapeJs(h.title)}', '${escapeJs(h.url)}')">Opening</button>
            <button class="btn-assign" onclick="assignHymn('sacrament', ${h.number}, '${escapeJs(h.title)}', '${escapeJs(h.url)}')">Sacrament</button>
            <button class="btn-assign" onclick="assignHymn('interlude', ${h.number}, '${escapeJs(h.title)}', '${escapeJs(h.url)}')">Intermediate</button>
            <button class="btn-assign" onclick="assignHymn('closing', ${h.number}, '${escapeJs(h.title)}', '${escapeJs(h.url)}')">Closing</button>
          </div>
        </div>
      `;
    }).join("");
    applyViewMode(currentViewMode);
  } catch (err) {
    console.error("Error loading hymns:", err);
    hymnsGrid.innerHTML = `<div class="error-state">Failed to load hymns.</div>`;
  }
}

window.assignHymn = function(slot, num, title, url) {
  const displayVal = `#${num} ${title}`;
  const update = {};
  let slotLabel = "";

  if (slot === "opening") {
    update.hymn_opening = displayVal;
    update.hymn_opening_url = url;
    slotLabel = "Opening Hymn";
  } else if (slot === "sacrament") {
    update.hymn_sacrament = displayVal;
    update.hymn_sacrament_url = url;
    slotLabel = "Sacrament Hymn";
  } else if (slot === "interlude") {
    update.hymn_interlude = displayVal;
    update.hymn_interlude_url = url;
    slotLabel = "Intermediate Hymn";
  } else if (slot === "closing") {
    update.hymn_closing = displayVal;
    update.hymn_closing_url = url;
    slotLabel = "Closing Hymn";
  }

  saveAgendaUpdate(update, `✓ Set ${slotLabel} to ${displayVal}!`);
};

/**
 * Dynamically populate Conference Talk Filters (Years & Speakers) from API
 */
let talkFiltersLoaded = false;
async function initTalkFilters() {
  if (talkFiltersLoaded) return;
  try {
    const res = await fetch("/api/talks/meta");
    const data = await res.json();
    if (!data.success) return;

    if (talkYearSelect && data.years) {
      const currentVal = talkYearSelect.value;
      talkYearSelect.innerHTML = `<option value="">All Years (${data.years[data.years.length - 1]}–${data.years[0]})</option>` +
        data.years.map(y => `<option value="${y}">${y}</option>`).join("");
      if (currentVal) talkYearSelect.value = currentVal;
    }

    if (talkSpeakerSelect && data.speakers) {
      const currentVal = talkSpeakerSelect.value;
      talkSpeakerSelect.innerHTML = `<option value="">All Church Leaders & Speakers</option>` +
        data.speakers.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
      if (currentVal) talkSpeakerSelect.value = currentVal;
    }
    talkFiltersLoaded = true;
  } catch (err) {
    console.error("Error loading talk filters:", err);
  }
}

/**
 * Dynamically populate Come Follow Me Year Selector from distinct curriculum
 */
let cfmFiltersLoaded = false;
async function initCfmFilters() {
  if (cfmFiltersLoaded) return;
  try {
    const res = await fetch("/api/come-follow-me");
    const data = await res.json();
    const lessons = data.lessons || [];
    if (lessons.length === 0) return;

    const yearMap = new Map();
    lessons.forEach(l => {
      if (!yearMap.has(l.year)) {
        yearMap.set(l.year, l.book_title || `${l.year} Curriculum`);
      }
    });

    if (cfmYearSelect) {
      const sortedYears = [...yearMap.keys()].sort((a, b) => b - a);
      const currentVal = cfmYearSelect.value;
      cfmYearSelect.innerHTML = sortedYears.map(y => {
        const title = yearMap.get(y);
        return `<option value="${y}">${y}: ${escapeHtml(title.replace(/\s*\d{4}$/, ""))}</option>`;
      }).join("");

      // Preserve or set active Sunday year
      const activeYear = (activeDate ? new Date(activeDate + "T00:00:00").getFullYear() : 2026);
      if (yearMap.has(activeYear)) {
        cfmYearSelect.value = String(activeYear);
      } else if (sortedYears.length > 0) {
        cfmYearSelect.value = String(sortedYears[0]);
      }
    }
    cfmFiltersLoaded = true;
  } catch (err) {
    console.error("Error initializing CFM filters:", err);
  }
}

/**
 * Dynamically populate FSY Month & Quorum filters from database
 */
let fsyFiltersLoaded = false;
async function initFsyFilters() {
  if (fsyFiltersLoaded) return;
  try {
    const res = await fetch("/api/fsy-lessons/meta");
    const data = await res.json();
    const months = data.months || [];
    if (fsyMonthSelect && months.length > 0) {
      const monthNames = [
        "", "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const currentVal = fsyMonthSelect.value;
      const minMonth = monthNames[months[0].month]?.substring(0, 3);
      const maxMonth = monthNames[months[months.length - 1].month]?.substring(0, 3);
      const year = months[0].year;

      let options = `<option value="">All Months (${minMonth}–${maxMonth} ${year})</option>`;
      months.forEach(m => {
        options += `<option value="${m.month}">${monthNames[m.month]} ${m.year}</option>`;
      });
      fsyMonthSelect.innerHTML = options;
      if (currentVal) fsyMonthSelect.value = currentVal;
    }
    fsyFiltersLoaded = true;
  } catch (err) {
    console.error("Error initializing FSY filters:", err);
  }
}

/**
 * Fetch and Render Conference Talks (Corrected Speaker & Title, Organized by Year & Date)
 */
async function loadTalks() {
  await initTalkFilters();
  talksGrid.innerHTML = `<div class="loading-state">Loading conference talks from database...</div>`;
  const q = talkSearchInput.value.trim();
  const year = talkYearSelect.value;
  const speaker = talkSpeakerSelect.value;
  const sort = talkSortSelect ? talkSortSelect.value : "date-desc";

  const url = `/api/talks?q=${encodeURIComponent(q)}&speaker=${encodeURIComponent(speaker)}&year=${encodeURIComponent(year)}&limit=600`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    let talks = data.talks || [];
    talkResultsCount.textContent = `Found ${data.count || talks.length} conference talks`;

    if (talks.length === 0) {
      talksGrid.innerHTML = `<div class="empty-state">No conference talks matched your filters.</div>`;
      return;
    }

    // Client-side sorting
    talks.sort((a, b) => {
      if (sort === "date-desc") {
        if (b.year !== a.year) return b.year - a.year;
        if (b.month !== a.month) return b.month - a.month;
        return (a.id || 0) - (b.id || 0);
      } else if (sort === "date-asc") {
        if (a.year !== b.year) return a.year - b.year;
        if (a.month !== b.month) return a.month - b.month;
        return (a.id || 0) - (b.id || 0);
      } else if (sort === "title-asc") {
        return (a.title || "").localeCompare(b.title || "");
      } else if (sort === "title-desc") {
        return (b.title || "").localeCompare(a.title || "");
      } else if (sort === "speaker-asc") {
        return (a.speaker || "").localeCompare(b.speaker || "");
      } else if (sort === "speaker-desc") {
        return (b.speaker || "").localeCompare(a.speaker || "");
      }
      return 0;
    });

    // If sorting by date, group talks by conference (year & month)
    if (sort === "date-desc" || sort === "date-asc") {
      const groups = new Map();
      for (const t of talks) {
        const confKey = t.conference_name || `${t.year} General Conference`;
        if (!groups.has(confKey)) {
          groups.set(confKey, []);
        }
        groups.get(confKey).push(t);
      }

      let html = "";
      for (const [confName, confTalks] of groups.entries()) {
        html += `
          <div class="conference-group-section">
            <div class="conference-group-header">
              <div class="conf-group-title">
                <span class="conf-group-icon">🏛️</span>
                <h3>${escapeHtml(confName)}</h3>
              </div>
              <span class="conf-group-count">${confTalks.length} ${confTalks.length === 1 ? 'talk' : 'talks'}</span>
            </div>
            <div class="cards-grid conf-cards-grid">
              ${confTalks.map(renderTalkCard).join("")}
            </div>
          </div>
        `;
      }
      talksGrid.className = "conference-groups-wrap";
      talksGrid.innerHTML = html;
    } else {
      // Flat grid sorted by name/speaker
      talksGrid.className = "cards-grid";
      talksGrid.innerHTML = talks.map(renderTalkCard).join("");
    }
    applyViewMode(currentViewMode);
  } catch (err) {
    console.error("Error loading talks:", err);
    talksGrid.innerHTML = `<div class="error-state">Failed to load conference talks.</div>`;
  }
}

function renderTalkCard(t) {
  const title = t.title;
  const speaker = t.speaker;
  const isTelugu = (typeof window !== "undefined" && window.i18n && window.i18n.getCurrentLang() === "te") || 
                   (localStorage.getItem("ward_agenda_lang") === "te");
  const readUrl = (isTelugu && t.url_tel) ? t.url_tel : t.url;

  return `
    <div class="resource-card talk-card">
      <div class="card-info-wrap">
        <div class="card-header">
          <span class="badge badge-conf">${escapeHtml(t.conference_name)}</span>
          <span class="conf-session">${escapeHtml(t.session || "General Session")}</span>
        </div>
        <div class="card-content-wrap">
          <h3 class="card-title">“${escapeHtml(title)}”</h3>
          <p class="card-author">👤 <strong>${escapeHtml(speaker)}</strong></p>
        </div>
        <div class="card-links">
          <a href="${readUrl}" target="_blank" rel="noopener" class="btn-link-out">
            <span>${isTelugu && t.url_tel ? '📖 తెలుగు ప్రసంగం (Read)' : '📖 Read Talk'}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
        </div>
      </div>
      <div class="action-btn-row">
        <button class="btn-assign btn-highlight-assign" onclick="assignTalk(2, '${escapeJs(title)}', '${escapeJs(speaker)}', '${escapeJs(readUrl)}')">Assign 2nd Talk</button>
        <button class="btn-assign btn-highlight-assign" onclick="assignTalk(3, '${escapeJs(title)}', '${escapeJs(speaker)}', '${escapeJs(readUrl)}')">Assign 3rd Talk</button>
        <button class="btn-assign btn-both-quorums" onclick="assignTalkToBothQuorums('${escapeJs(title)}', '${escapeJs(speaker)}', '${escapeJs(readUrl)}')">Elder Quorum and Relief Society Lesson</button>
      </div>
    </div>
  `;
}

window.assignTalk = function(talkNum, title, speaker, url) {
  const displayTitle = speaker && speaker !== "Church Leader" ? `${title} (${speaker})` : title;
  const update = {};

  if (talkNum === 1) {
    update.talk1_title = displayTitle;
    update.talk1_url = url;
  } else if (talkNum === 2) {
    update.talk2_title = displayTitle;
    update.talk2_url = url;
  } else if (talkNum === 3) {
    update.talk3_title = displayTitle;
    update.talk3_url = url;
  }

  saveAgendaUpdate(update, `✓ Assigned ${talkNum}${talkNum === 1 ? 'st' : (talkNum === 2 ? 'nd' : 'rd')} Talk: ${displayTitle}!`);
};

window.assignTalkToBothQuorums = function(title, speaker, url) {
  if (!currentAgenda) return;
  const displayTitle = speaker && speaker !== "Church Leader" ? `${title} (${speaker})` : title;
  const classesJson = currentAgenda.classes_json || {};
  classesJson.elders_quorum = {
    ...(classesJson.elders_quorum || {}),
    topic: displayTitle,
    url: url,
  };
  classesJson.relief_society = {
    ...(classesJson.relief_society || {}),
    topic: displayTitle,
    url: url,
  };
  saveAgendaUpdate({ classes_json: classesJson }, `✓ Assigned to Elders Quorum & Relief Society: “${title}”!`);
};

window.assignTalkToClass = function(className, title, speaker, url) {
  if (!currentAgenda) return;
  const displayTitle = speaker && speaker !== "Church Leader" ? `${title} (${speaker})` : title;
  const classesJson = currentAgenda.classes_json || {};
  classesJson[className] = {
    ...(classesJson[className] || {}),
    topic: displayTitle,
    url: url,
  };
  const label = className === "elders_quorum" ? "Elders Quorum" : "Relief Society";
  saveAgendaUpdate({ classes_json: classesJson }, `✓ Assigned General Conference Talk to ${label}: “${title}”!`);
};

/**
 * Fetch and Render Gospel Principles Chapters (1st Talk for Youth)
 */
async function loadGospelPrinciples() {
  if (!gpGrid) return;
  gpGrid.innerHTML = `<div class="loading-state">Loading Gospel Principles manual...</div>`;
  const q = gpSearchInput ? gpSearchInput.value.trim() : "";

  const url = `/api/gospel-principles?q=${encodeURIComponent(q)}&limit=60`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const chapters = data.chapters || [];
    if (gpResultsCount) {
      gpResultsCount.textContent = `Showing ${data.count || chapters.length} Gospel Principles chapters for 1st Talk (Youth)`;
    }

    if (chapters.length === 0) {
      gpGrid.innerHTML = `<div class="empty-state">No chapters found matching "${escapeHtml(q)}".</div>`;
      return;
    }

    gpGrid.innerHTML = chapters.map(c => `
      <div class="resource-card gp-card">
        <div class="card-info-wrap">
          <div class="card-header">
            <span class="badge badge-gp">📖 Gospel Principles</span>
            <span class="gp-chapter-pill">Chapter ${c.chapter_number}</span>
          </div>
          <div class="card-content-wrap">
            <h3 class="card-title">Chapter ${c.chapter_number}: ${escapeHtml(c.title)}</h3>
            <p class="gp-desc">Foundational doctrine for youth & new member talks.</p>
          </div>
          <div class="card-links">
            <a href="${c.url}" target="_blank" rel="noopener" class="btn-link-out">
              <span>📖 Read Chapter</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
          </div>
        </div>
        <div class="action-btn-row">
          <button class="btn-assign btn-gp-assign" onclick="assignGospelPrinciple(${c.chapter_number}, '${escapeJs(c.title)}', '${escapeJs(c.url)}')">
            ⚡ Assign 1st Talk (Youth)
          </button>
        </div>
      </div>
    `).join("");
    applyViewMode(currentViewMode);
  } catch (err) {
    console.error("Error loading Gospel Principles:", err);
    if (gpGrid) gpGrid.innerHTML = `<div class="error-state">Failed to load Gospel Principles.</div>`;
  }
}

window.assignGospelPrinciple = function(chapterNum, title, url) {
  const displayTitle = `Chapter ${chapterNum}: ${title} (Gospel Principles)`;
  const update = {
    talk1_title: displayTitle,
    talk1_url: url,
    talk1_org: "Youth - Young Men",
  };
  saveAgendaUpdate(update, `✓ Assigned 1st Talk (Youth): ${displayTitle}!`);
};

/**
 * Fetch and Render Come, Follow Me Curriculum
 */
const CFM_MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

function parseCfmRange(rangeStr, year) {
  if (!rangeStr || !rangeStr.match(/[–\-]/)) return null;
  const parts = rangeStr.split(/[–\-]/).map(s => s.trim());
  if (parts.length !== 2) return null;
  let m1 = -1, d1 = 0;
  for (let i = 0; i < CFM_MONTHS.length; i++) {
    if (parts[0].toLowerCase().includes(CFM_MONTHS[i])) { m1 = i; break; }
  }
  const d1Match = parts[0].match(/\d+/);
  if (d1Match) d1 = parseInt(d1Match[0], 10);

  let m2 = m1, d2 = 0;
  for (let i = 0; i < CFM_MONTHS.length; i++) {
    if (parts[1].toLowerCase().includes(CFM_MONTHS[i])) { m2 = i; break; }
  }
  const d2Match = parts[1].match(/\d+/);
  if (d2Match) d2 = parseInt(d2Match[0], 10);

  if (m1 === -1 || !d1 || !d2) return null;
  let y1 = year, y2 = year;
  if (m1 === 11 && m2 === 0) { y1 = year - 1; }
  const start = new Date(Date.UTC(y1, m1, d1));
  const end = new Date(Date.UTC(y2, m2, d2, 23, 59, 59));
  return { start: start.toISOString().split("T")[0], end: end.toISOString().split("T")[0] };
}

function doesDateMatchRange(dateStr, rangeStr, year) {
  if (!dateStr || !rangeStr) return false;
  const yr = year || (new Date(dateStr + "T00:00:00").getFullYear());
  const parsed = parseCfmRange(rangeStr, yr);
  if (!parsed) {
    const d = new Date(dateStr + "T00:00:00");
    const mName = d.toLocaleDateString("en-US", { month: "long" });
    const day = d.getDate();
    return rangeStr.includes(mName) && rangeStr.includes(String(day));
  }
  return dateStr >= parsed.start && dateStr <= parsed.end;
}

async function loadCfm() {
  await initCfmFilters();
  cfmGrid.innerHTML = `<div class="loading-state">Loading Come, Follow Me curriculum...</div>`;
  const q = cfmSearchInput.value.trim();
  const year = cfmYearSelect.value;

  const url = `/api/come-follow-me?year=${encodeURIComponent(year)}&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const lessons = data.lessons || [];
    cfmResultsCount.textContent = `Found ${data.count || lessons.length} weekly lessons`;

    if (lessons.length === 0) {
      cfmGrid.innerHTML = `<div class="empty-state">No lessons found.</div>`;
      if (cfmActiveMatchBanner) cfmActiveMatchBanner.style.display = "none";
      return;
    }

    // Check if active Sunday date matches a lesson
    const matchedLesson = lessons.find(c => doesDateMatchRange(activeDate, c.date_range, c.year));
    if (matchedLesson && cfmActiveMatchBanner) {
      const sunDisplay = formatDisplayDate(activeDate);
      cfmActiveMatchBanner.style.display = "flex";
      cfmActiveMatchBanner.innerHTML = `
        <div class="cfm-banner-left">
          <div class="cfm-banner-tag">★ SCHEDULED FOR ACTIVE SUNDAY (${escapeHtml(sunDisplay)})</div>
          <h3 class="cfm-banner-title">📅 ${escapeHtml(matchedLesson.date_range)}: “${escapeHtml(matchedLesson.title)}”</h3>
          ${matchedLesson.scriptures ? `<p class="cfm-banner-scriptures">📜 <strong>Reading:</strong> ${escapeHtml(matchedLesson.scriptures)}</p>` : ''}
          <p class="cfm-banner-sub">⚡ Sunday School & Primary: Combined Adults, Combined Youth & Primary all learn from Come, Follow Me!</p>
        </div>
        <div class="cfm-banner-right">
          <button class="btn btn-apply-all-banner" onclick="applyCfmToBothSundaySchools('${escapeJs(matchedLesson.date_range)}', '${escapeJs(matchedLesson.title)}', '${escapeJs(matchedLesson.scriptures)}', '${escapeJs(matchedLesson.url)}')">
            ⚡ Apply to ALL (Adults, Youth & Primary)
          </button>
          <a href="${matchedLesson.url}" target="_blank" rel="noopener" class="btn-banner-church-link">
            Open on Church.org ↗
          </a>
        </div>
      `;
    } else if (cfmActiveMatchBanner) {
      cfmActiveMatchBanner.style.display = "none";
    }

    cfmGrid.innerHTML = lessons.map(c => {
      const isDateMatch = activeDate && c.date_range && doesDateMatchRange(activeDate, c.date_range, c.year);
      const isTelugu = (typeof window !== "undefined" && window.i18n && window.i18n.getCurrentLang() === "te") || 
                       (localStorage.getItem("ward_agenda_lang") === "te");
      let lessonUrl = c.url;
      if (isTelugu && !lessonUrl.includes("lang=tel")) {
        lessonUrl += (lessonUrl.includes("?") ? "&lang=tel" : "?lang=tel");
      }
      return `
        <div class="resource-card cfm-card ${isDateMatch ? 'highlight-active-week' : ''}">
          <div class="card-info-wrap">
            <div class="card-header">
              <span class="badge badge-cfm">${escapeHtml(c.book_title)}</span>
              <span class="cfm-date-pill">📅 ${escapeHtml(c.date_range || `Week ${c.week_number}`)}</span>
              ${isDateMatch ? '<span class="badge-matched">★ Scheduled for Active Sunday</span>' : ''}
            </div>
            <div class="card-content-wrap">
              <h3 class="card-title">${escapeHtml(c.title)}</h3>
              ${c.scriptures ? `<p class="cfm-scriptures">📜 <strong>Reading:</strong> ${escapeHtml(c.scriptures)}</p>` : ''}
            </div>
            <div class="card-links">
              <a href="${lessonUrl}" target="_blank" rel="noopener" class="btn-link-out">
                <span>${isTelugu ? '📖 పాఠం చదవండి (Telugu CFM)' : '📖 Read Lesson'}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </div>
          </div>
          <div class="action-btn-row">
            <button class="btn-assign btn-highlight-assign btn-cfm-all" onclick="applyCfmToBothSundaySchools('${escapeJs(c.date_range)}', '${escapeJs(c.title)}', '${escapeJs(c.scriptures)}', '${escapeJs(lessonUrl)}')">⚡ Apply to All (Adults, Youth & Primary)</button>
            <button class="btn-assign" onclick="assignCfm('sunday_school', '${escapeJs(c.date_range)}: ${escapeJs(c.title)}', '${escapeJs(lessonUrl)}')">Adult Sunday School</button>
            <button class="btn-assign" onclick="assignCfm('sunday_school_youth', '${escapeJs(c.date_range)}: ${escapeJs(c.title)}', '${escapeJs(lessonUrl)}')">Youth Sunday School</button>
            <button class="btn-assign btn-cfm-primary" onclick="assignCfm('primary', '${escapeJs(c.date_range)}: ${escapeJs(c.title)}', '${escapeJs(lessonUrl)}')">Primary</button>
          </div>
        </div>
      `;
    }).join("");
    applyViewMode(currentViewMode);
  } catch (err) {
    console.error("Error loading CFM lessons:", err);
    cfmGrid.innerHTML = `<div class="error-state">Failed to load lessons.</div>`;
  }
}

window.assignCfm = function(className, topic, url) {
  if (!currentAgenda) return;
  const classesJson = currentAgenda.classes_json || {};
  classesJson[className] = {
    ...(classesJson[className] || {}),
    topic,
    url,
  };

  const labelMap = {
    sunday_school: "Combined Adults (Sunday School)",
    sunday_school_youth: "Combined Youth (Sunday School)",
    elders_quorum: "Elders Quorum",
    relief_society: "Relief Society",
    young_men: "Young Men",
    young_women: "Young Women",
    primary: "Primary"
  };

  saveAgendaUpdate({ classes_json: classesJson }, `✓ Applied Come, Follow Me to ${labelMap[className] || className}!`);
};

window.applyCfmToBothSundaySchools = function(dateRange, title, scriptures, url) {
  if (!currentAgenda) return;
  const fullTopic = scriptures 
    ? `${dateRange}: “${title}” (${scriptures})` 
    : `${dateRange}: “${title}”`;
  const shortTopic = `${dateRange}: “${title}”`;

  const classesJson = currentAgenda.classes_json || {};
  classesJson.sunday_school = { ...(classesJson.sunday_school || {}), topic: fullTopic, url };
  classesJson.sunday_school_youth = { ...(classesJson.sunday_school_youth || {}), topic: fullTopic, url };
  classesJson.primary = { ...(classesJson.primary || {}), topic: shortTopic, url };

  saveAgendaUpdate({ classes_json: classesJson }, `✓ Applied Come, Follow Me to Combined Adults, Combined Youth & Primary!`);
};

/**
 * Fetch and Render FSY Sunday Lessons (Young Men & Young Women)
 */
async function loadFsy() {
  if (!fsyGrid) return;
  await initFsyFilters();
  fsyGrid.innerHTML = `<div class="loading-state">Loading FSY Sunday lessons...</div>`;
  const q = fsySearchInput ? fsySearchInput.value.trim().toLowerCase() : "";
  const month = fsyMonthSelect ? fsyMonthSelect.value : "";
  const org = fsyOrgSelect ? fsyOrgSelect.value : "all";

  let url = `/api/fsy-lessons?year=2026`;
  if (month) url += `&month=${month}`;
  if (org && org !== "all") url += `&org=${org}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    let lessons = data.lessons || [];

    if (q) {
      lessons = lessons.filter(l => 
        l.title.toLowerCase().includes(q) || 
        (l.description && l.description.toLowerCase().includes(q))
      );
    }

    if (fsyResultsCount) {
      fsyResultsCount.textContent = `Showing ${lessons.length} FSY Sunday lessons for Young Men & Young Women`;
    }

    if (lessons.length === 0) {
      fsyGrid.innerHTML = `<div class="empty-state">No FSY lessons found matching your filters.</div>`;
      if (fsyActiveMatchBanner) fsyActiveMatchBanner.style.display = "none";
      return;
    }

    // Match active Sunday for FSY auto-fill feature
    const [y, m, d] = activeDate.split("-").map(Number);
    const activeMonth = m;
    const activeSundayNum = Math.ceil(d / 7);

    const matchedFsy = lessons.find(l => l.month === activeMonth && l.sunday_number === activeSundayNum);
    if (matchedFsy && fsyActiveMatchBanner) {
      const sunDisplay = formatDisplayDate(activeDate);
      let sundayOrdinal = `${activeSundayNum}th Sunday`;
      if (activeSundayNum === 1) sundayOrdinal = "1st Sunday (Fast Sunday)";
      else if (activeSundayNum === 2) sundayOrdinal = "2nd Sunday";
      else if (activeSundayNum === 3) sundayOrdinal = "3rd Sunday";
      else if (activeSundayNum === 4) sundayOrdinal = "4th Sunday (Quorums/Classes)";
      else if (activeSundayNum === 5) sundayOrdinal = "5th Sunday (Combined Activity)";

      fsyActiveMatchBanner.style.display = "flex";
      fsyActiveMatchBanner.innerHTML = `
        <div class="fsy-banner-left">
          <div class="fsy-banner-tag">★ SCHEDULED FOR ACTIVE SUNDAY (${escapeHtml(sunDisplay)} • ${escapeHtml(sundayOrdinal)})</div>
          <h3 class="fsy-banner-title">🌟 ${escapeHtml(matchedFsy.title)}</h3>
          ${matchedFsy.description ? `<p class="fsy-banner-desc">${escapeHtml(matchedFsy.description)}</p>` : ''}
          <p class="fsy-banner-sub">⚡ Aaronic Priesthood & Young Women learn from this FSY Magazine topic.</p>
        </div>
        <div class="fsy-banner-right">
          <button class="btn btn-apply-all-banner btn-fsy-autofill-banner" onclick="autoFillFsy('${escapeJs(matchedFsy.title)}', '${escapeJs(matchedFsy.url)}')">
            ⚡ Auto-Fill YM & YW Lessons
          </button>
          <a href="${matchedFsy.url}" target="_blank" rel="noopener" class="btn-banner-church-link">
            Open FSY Magazine ↗
          </a>
        </div>
      `;
    } else if (fsyActiveMatchBanner) {
      fsyActiveMatchBanner.style.display = "none";
    }

    const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

    fsyGrid.innerHTML = lessons.map(l => {
      const isDateMatch = (l.month === activeMonth && l.sunday_number === activeSundayNum);
      const monthLabel = monthNames[l.month] || `Month ${l.month}`;
      let sundayLabel = `${l.sunday_number}th Sunday`;
      if (l.sunday_number === 1) sundayLabel = "1st Sunday (Fast Sunday)";
      else if (l.sunday_number === 2) sundayLabel = "2nd Sunday";
      else if (l.sunday_number === 3) sundayLabel = "3rd Sunday";
      else if (l.sunday_number === 4) sundayLabel = "4th Sunday (Quorums/Classes)";
      else if (l.sunday_number === 5) sundayLabel = "5th Sunday (Combined Activity)";

      let orgText = "Young Men & Young Women";
      if (l.organization === "young_men") {
        orgText = "Aaronic Priesthood / Young Men";
      } else if (l.organization === "young_women") {
        orgText = "Young Women";
      }

      return `
        <div class="resource-card fsy-card ${isDateMatch ? 'highlight-active-week' : ''}">
          <div class="card-info-wrap">
            <div class="card-header">
              <span class="badge badge-fsy">${escapeHtml(orgText)}</span>
              <span class="conf-session">📅 ${escapeHtml(monthLabel)} 2026 • ${escapeHtml(sundayLabel)}</span>
              ${isDateMatch ? '<span class="badge-matched">★ Scheduled for Active Sunday</span>' : ''}
            </div>
            <div class="card-content-wrap">
              <h3 class="card-title">${escapeHtml(l.title)}</h3>
              ${l.description ? `<p class="card-author">${escapeHtml(l.description)}</p>` : ''}
            </div>
            <div class="card-links">
              <a href="${l.url}" target="_blank" rel="noopener" class="btn-link-out">
                <span>🌟 FSY Magazine</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </div>
          </div>
          <div class="action-btn-row">
            ${l.organization === 'young_men' ? `
              <button class="btn-assign btn-highlight-assign btn-fsy-single" onclick="assignFsy('young_men', '${escapeJs(l.title)}', '${escapeJs(l.url)}')">Assign to Young Men</button>
            ` : l.organization === 'young_women' ? `
              <button class="btn-assign btn-highlight-assign btn-fsy-single" onclick="assignFsy('young_women', '${escapeJs(l.title)}', '${escapeJs(l.url)}')">Assign to Young Women</button>
            ` : `
              <button class="btn-assign btn-highlight-assign btn-fsy-both" onclick="assignFsy('both', '${escapeJs(l.title)}', '${escapeJs(l.url)}')">⚡ Assign Both (YM & YW)</button>
              <button class="btn-assign" onclick="assignFsy('young_men', '${escapeJs(l.title)}', '${escapeJs(l.url)}')">Young Men</button>
              <button class="btn-assign" onclick="assignFsy('young_women', '${escapeJs(l.title)}', '${escapeJs(l.url)}')">Young Women</button>
            `}
          </div>
        </div>
      `;
    }).join("");
    applyViewMode(currentViewMode);
  } catch (err) {
    console.error("Error loading FSY lessons:", err);
    if (fsyGrid) fsyGrid.innerHTML = `<div class="error-state">Failed to load FSY lessons.</div>`;
  }
}

window.autoFillFsy = function(title, url) {
  if (!currentAgenda) return;
  const classesJson = currentAgenda.classes_json || {};
  classesJson.young_men = { ...(classesJson.young_men || {}), topic: title, url: url };
  classesJson.young_women = { ...(classesJson.young_women || {}), topic: title, url: url };
  saveAgendaUpdate({ classes_json: classesJson }, `✓ Auto-filled FSY Lesson to Young Men & Young Women: “${title}”!`);
};

window.assignFsy = function(targetOrg, title, url) {
  if (!currentAgenda) return;
  const classesJson = currentAgenda.classes_json || {};
  if (targetOrg === "both" || targetOrg === "young_men") {
    classesJson.young_men = {
      ...(classesJson.young_men || {}),
      topic: title,
      url: url,
    };
  }
  if (targetOrg === "both" || targetOrg === "young_women") {
    classesJson.young_women = {
      ...(classesJson.young_women || {}),
      topic: title,
      url: url,
    };
  }
  const label = targetOrg === "both" ? "Young Men & Young Women" : (targetOrg === "young_men" ? "Young Men" : "Young Women");
  saveAgendaUpdate({ classes_json: classesJson }, `✓ Assigned FSY Magazine Lesson to ${label}!`);
};

/**
 * Helper to escape HTML & JS
 */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeJs(str) {
  if (!str) return "";
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, " ");
}

/**
 * Event Listeners Initialization
 */
function initEvents() {
  // Date navigation — Prev / Next Sunday buttons
  if (btnPrevSunday) {
    btnPrevSunday.addEventListener("click", () => {
      const prev = getPrevSunday(activeDate);
      loadAgendaForDate(prev);
    });
  }

  if (btnNextSunday) {
    btnNextSunday.addEventListener("click", () => {
      const next = getNextSunday(activeDate);
      loadAgendaForDate(next);
    });
  }

  // Native date input change listener
  if (datePicker) {
    datePicker.addEventListener("change", () => {
      if (datePicker.value) {
        loadAgendaForDate(datePicker.value);
      }
    });
  }

  // Calendar Trigger Button opens Sunday quick-selector popover
  if (btnOpenCalendar) {
    btnOpenCalendar.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleCalendarPopover();
    });
  }

  // Close popover
  if (btnClosePopover) {
    btnClosePopover.addEventListener("click", closeCalendarPopover);
  }

  // Popover Month Navigation
  if (btnPrevMonth) {
    btnPrevMonth.addEventListener("click", (e) => {
      e.stopPropagation();
      popoverDate.setMonth(popoverDate.getMonth() - 1);
      renderPopoverSundays();
    });
  }

  if (btnNextMonth) {
    btnNextMonth.addEventListener("click", (e) => {
      e.stopPropagation();
      popoverDate.setMonth(popoverDate.getMonth() + 1);
      renderPopoverSundays();
    });
  }

  // Trigger full calendar modal from popover footer
  if (btnTriggerNativePicker) {
    btnTriggerNativePicker.addEventListener("click", () => {
      closeCalendarPopover();
      openFullCalendarModal();
    });
  }

  // Close calendar popover on outside click
  document.addEventListener("click", (e) => {
    if (calendarPopover && calendarPopover.classList.contains("open")) {
      const pickerWrap = document.getElementById("date-picker-wrap");
      if (pickerWrap && !pickerWrap.contains(e.target)) {
        closeCalendarPopover();
      }
    }
  });

  // Full Calendar Modal Listeners
  if (btnCloseFullCal) {
    btnCloseFullCal.addEventListener("click", closeFullCalendarModal);
  }
  if (fullCalModal) {
    fullCalModal.addEventListener("click", (e) => {
      if (e.target === fullCalModal) closeFullCalendarModal();
    });
  }
  if (btnCalPrevYear) {
    btnCalPrevYear.addEventListener("click", async () => {
      fullCalYear--;
      await loadAndRenderFullCalendar();
    });
  }
  if (btnCalNextYear) {
    btnCalNextYear.addEventListener("click", async () => {
      fullCalYear++;
      await loadAndRenderFullCalendar();
    });
  }
  if (btnCalPrevMonth) {
    btnCalPrevMonth.addEventListener("click", async () => {
      fullCalMonth--;
      if (fullCalMonth < 0) {
        fullCalMonth = 11;
        fullCalYear--;
      }
      await loadAndRenderFullCalendar();
    });
  }
  if (btnCalNextMonth) {
    btnCalNextMonth.addEventListener("click", async () => {
      fullCalMonth++;
      if (fullCalMonth > 11) {
        fullCalMonth = 0;
        fullCalYear++;
      }
      await loadAndRenderFullCalendar();
    });
  }
  if (btnCalToday) {
    btnCalToday.addEventListener("click", async () => {
      const now = new Date();
      fullCalYear = now.getFullYear();
      fullCalMonth = now.getMonth();
      await loadAndRenderFullCalendar();
      selectFullCalDate(now.toISOString().slice(0, 10));
    });
  }
  if (calToggleLds) {
    calToggleLds.addEventListener("change", renderFullCalendarGrid);
  }
  if (calToggleIndian) {
    calToggleIndian.addEventListener("change", renderFullCalendarGrid);
  }

  // Tab switching
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      tabButtons.forEach(b => b.classList.remove("active"));
      tabPanels.forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      const tabId = btn.dataset.tab;
      if (tabId === "hymns") {
        document.getElementById("tabHymns").classList.add("active");
      } else if (tabId === "gp") {
        document.getElementById("tabGp").classList.add("active");
      } else if (tabId === "talks") {
        document.getElementById("tabTalks").classList.add("active");
      } else if (tabId === "cfm") {
        document.getElementById("tabCfm").classList.add("active");
      } else if (tabId === "fsy") {
        document.getElementById("tabFsy").classList.add("active");
        loadFsy();
      }
    });
  });

  // Hymn filters
  bookChips.forEach(chip => {
    chip.addEventListener("click", () => {
      bookChips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      currentBookFilter = chip.dataset.book;
      loadHymns();
    });
  });

  hymnSearchInput.addEventListener("input", () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(loadHymns, 250);
  });

  clearHymnSearch.addEventListener("click", () => {
    hymnSearchInput.value = "";
    loadHymns();
  });

  // Talk filters & sorting
  talkSearchInput.addEventListener("input", () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(loadTalks, 250);
  });

  clearTalkSearch.addEventListener("click", () => {
    talkSearchInput.value = "";
    loadTalks();
  });

  if (talkSortSelect) talkSortSelect.addEventListener("change", loadTalks);
  talkYearSelect.addEventListener("change", loadTalks);
  talkSpeakerSelect.addEventListener("change", loadTalks);

  // Gospel Principles filters
  if (gpSearchInput) {
    gpSearchInput.addEventListener("input", () => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(loadGospelPrinciples, 250);
    });
  }

  if (clearGpSearch) {
    clearGpSearch.addEventListener("click", () => {
      if (gpSearchInput) gpSearchInput.value = "";
      loadGospelPrinciples();
    });
  }

  // CFM filters
  cfmSearchInput.addEventListener("input", () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(loadCfm, 250);
  });

  clearCfmSearch.addEventListener("click", () => {
    cfmSearchInput.value = "";
    loadCfm();
  });

  cfmYearSelect.addEventListener("change", loadCfm);

  // FSY filters
  if (fsySearchInput) {
    fsySearchInput.addEventListener("input", () => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(loadFsy, 250);
    });
  }

  if (clearFsySearch) {
    clearFsySearch.addEventListener("click", () => {
      if (fsySearchInput) fsySearchInput.value = "";
      loadFsy();
    });
  }

  if (fsyMonthSelect) fsyMonthSelect.addEventListener("change", loadFsy);
  if (fsyOrgSelect) fsyOrgSelect.addEventListener("change", loadFsy);

  // View Mode Toggles (Grid vs List View)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-view-toggle");
    if (btn && btn.dataset.view) {
      applyViewMode(btn.dataset.view);
    }
  });

  // Meeting Type Buttons
  document.querySelectorAll(".meeting-type-btn-study").forEach(btn => {
    btn.addEventListener("click", () => {
      setMeetingTypeStudy(btn.dataset.type);
    });
  });

  // Conference Form Inputs (Auto-Save)
  const confTitleInput = document.getElementById("study-conf-title");
  const confUrlInput = document.getElementById("study-conf-url");
  const confLinkBtn = document.getElementById("study-conf-link-btn");
  const confDetailsInput = document.getElementById("study-conf-details");

  if (confTitleInput) {
    confTitleInput.addEventListener("input", () => {
      if (!currentAgenda) return;
      currentAgenda.conference_title = confTitleInput.value;
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        saveAgendaUpdate({ conference_title: currentAgenda.conference_title }, "✓ Conference title saved");
      }, 500);
    });
  }

  if (confUrlInput) {
    confUrlInput.addEventListener("input", () => {
      if (!currentAgenda) return;
      currentAgenda.conference_url = confUrlInput.value;
      if (confLinkBtn) {
        confLinkBtn.href = confUrlInput.value || "#";
        confLinkBtn.style.display = confUrlInput.value ? "inline-flex" : "none";
      }
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        saveAgendaUpdate({ conference_url: currentAgenda.conference_url }, "✓ Broadcast link saved");
      }, 500);
    });
  }

  if (confDetailsInput) {
    confDetailsInput.addEventListener("input", () => {
      if (!currentAgenda) return;
      currentAgenda.conference_details = confDetailsInput.value;
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        saveAgendaUpdate({ conference_details: currentAgenda.conference_details }, "✓ Conference schedule saved");
      }, 500);
    });
  }


  // Check for Updates / Sync Content Button
  const btnSyncContent = document.getElementById("btn-sync-content");
  if (btnSyncContent) {
    btnSyncContent.addEventListener("click", async () => {
      btnSyncContent.disabled = true;
      btnSyncContent.innerHTML = "<span>⏳ Syncing...</span>";
      try {
        const res = await fetch("/api/content/sync", { method: "POST" });
        const data = await res.json();
        if (data.success) {
          showToast(`✓ Content refreshed! ${data.addedTalks || 0} talks added.`);
          talkFiltersLoaded = false;
          fsyFiltersLoaded = false;
          cfmFiltersLoaded = false;
          await loadTalks();
          await loadFsy();
          await loadCfm();
        } else {
          showToast("Sync completed with no changes.");
        }
      } catch (err) {
        console.error("Sync error:", err);
        showToast("Error checking for updates", "error");
      } finally {
        btnSyncContent.disabled = false;
        btnSyncContent.innerHTML = "<span>🔄</span><span class=\"desktop-only\">Updates</span>";
      }
    });
  }

  // Language Toggle Button in Study
  const btnLangToggle = document.getElementById("btn-lang-toggle");
  if (btnLangToggle) {
    btnLangToggle.addEventListener("click", () => {
      const current = localStorage.getItem("ward_agenda_lang") || "en";
      const next = current === "en" ? "te" : "en";
      if (window.i18n) window.i18n.setLanguage(next);
      localStorage.setItem("ward_agenda_lang", next);
      const icon = document.getElementById("lang-icon");
      const label = document.getElementById("lang-label");
      if (icon) icon.textContent = next === "te" ? "EN" : "తె";
      if (label) label.textContent = next === "te" ? "English" : "Telugu";
      loadTalks();
      loadCfm();
    });
  }

  // Leader Login & Settings Modal Listeners in Study
  const btnLoginModal = document.getElementById("btn-login-modal");
  const btnCloseLoginModal = document.getElementById("btn-close-login-modal");
  const btnCancelLogin = document.getElementById("btn-cancel-login");
  const btnSubmitLogin = document.getElementById("btn-submit-login");
  const loginStringInput = document.getElementById("login-string-input");
  const loginModal = document.getElementById("login-modal");

  if (btnLoginModal) btnLoginModal.addEventListener("click", openStudyLoginModal);
  if (btnCloseLoginModal) btnCloseLoginModal.addEventListener("click", closeStudyLoginModal);
  if (btnCancelLogin) btnCancelLogin.addEventListener("click", closeStudyLoginModal);
  if (btnSubmitLogin) btnSubmitLogin.addEventListener("click", handleStudyLoginSubmit);
  if (loginStringInput) {
    loginStringInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleStudyLoginSubmit();
    });
  }
  if (loginModal) {
    loginModal.addEventListener("click", (e) => {
      if (e.target === loginModal) closeStudyLoginModal();
    });
  }

  const btnSettingsModal = document.getElementById("btn-settings-modal");
  const btnCloseSettingsModal = document.getElementById("btn-close-settings-modal");
  const settingsModal = document.getElementById("settings-modal");
  const btnAddLeader = document.getElementById("btn-add-leader");

  if (btnSettingsModal) btnSettingsModal.addEventListener("click", openStudySettingsModal);
  if (btnCloseSettingsModal) btnCloseSettingsModal.addEventListener("click", closeStudySettingsModal);
  if (settingsModal) {
    settingsModal.addEventListener("click", (e) => {
      if (e.target === settingsModal) closeStudySettingsModal();
    });
  }
  if (btnAddLeader) {
    btnAddLeader.addEventListener("click", () => {
      window.editAuthUser(0, "", "dowleswaram", "Leader");
    });
  }

  // Settings tabs
  document.querySelectorAll(".settings-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".settings-tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".settings-content").forEach((c) => (c.style.display = "none"));
      btn.classList.add("active");
      const targetId = `settings-${btn.dataset.tab}`;
      const targetEl = document.getElementById(targetId);
      if (targetEl) targetEl.style.display = "block";
    });
  });

  // Overall Agenda Spreadsheet Modal
  const btnOverallAgenda = document.getElementById("btn-overall-agenda");
  const overallModal = document.getElementById("overall-agenda-modal");
  const btnCloseOverall = document.getElementById("btn-close-overall-agenda");
  if (btnOverallAgenda) {
    btnOverallAgenda.addEventListener("click", () => openOverallAgenda());
  }
  if (btnCloseOverall) {
    btnCloseOverall.addEventListener("click", closeOverallAgenda);
  }
  if (overallModal) {
    overallModal.addEventListener("click", (e) => {
      if (e.target === overallModal) closeOverallAgenda();
    });
  }
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeCalendarPopover();
      closeFullCalendarModal();
      closeOverallAgenda();
      closeStudyLoginModal();
      closeStudySettingsModal();
    }
  });
  const btnAgendaPrev = document.getElementById("btn-agenda-sheet-prev");
  const btnAgendaNext = document.getElementById("btn-agenda-sheet-next");
  if (btnAgendaPrev) {
    btnAgendaPrev.addEventListener("click", () => {
      sheetMonth--;
      if (sheetMonth < 0) {
        sheetMonth = 11;
        sheetYear--;
      }
      renderAgendaSheet();
    });
  }
  if (btnAgendaNext) {
    btnAgendaNext.addEventListener("click", () => {
      sheetMonth++;
      if (sheetMonth > 11) {
        sheetMonth = 0;
        sheetYear++;
      }
      renderAgendaSheet();
    });
  }
}

// ── Overall Agenda Spreadsheet State & Logic ──
let sheetYear = new Date().getFullYear();
let sheetMonth = new Date().getMonth();

async function openOverallAgenda() {
  const modal = document.getElementById("overall-agenda-modal");
  if (!modal) return;
  if (activeDate) {
    const d = new Date(activeDate + "T00:00:00");
    if (!isNaN(d.getTime())) {
      sheetYear = d.getFullYear();
      sheetMonth = d.getMonth();
    }
  }
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  await renderAgendaSheet();
}

function closeOverallAgenda() {
  const modal = document.getElementById("overall-agenda-modal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

async function renderAgendaSheet() {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const label = document.getElementById("agenda-sheet-month-label");
  if (label) label.textContent = `${monthNames[sheetMonth]} ${sheetYear}`;

  // Collect all Sundays in the month
  const sundays = [];
  const d = new Date(sheetYear, sheetMonth, 1);
  while (d.getMonth() === sheetMonth) {
    if (d.getDay() === 0) sundays.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }

  // Fetch all agendas for those Sundays
  const agendas = await Promise.all(
    sundays.map(async (s) => {
      const iso = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(s.getDate()).padStart(2, "0")}`;
      try {
        const res = await fetch(`/api/agenda/${iso}`);
        const json = await res.json();
        return { date: iso, data: json.data || json.agenda || {} };
      } catch {
        return { date: iso, data: {} };
      }
    })
  );

  // Build table
  const thead = document.getElementById("agenda-sheet-thead");
  const tbody = document.getElementById("agenda-sheet-tbody");
  if (!thead || !tbody) return;

  // Header row: Field | Sunday 1 | Sunday 2 ...
  const headerRow = document.createElement("tr");
  const fieldTh = document.createElement("th");
  fieldTh.textContent = "Field";
  fieldTh.className = "sheet-th-field";
  headerRow.appendChild(fieldTh);

  agendas.forEach((a) => {
    const th = document.createElement("th");
    const [y, m, day] = a.date.split("-");
    const isActive = a.date === activeDate;
    th.textContent = `${day}/${m}/${y}`;
    th.className = `sheet-th-date${isActive ? " active-sheet-date" : ""}`;
    th.title = `Click to curate topics for ${day}/${m}/${y}`;
    th.style.cursor = "pointer";
    th.addEventListener("click", () => {
      loadAgendaForDate(a.date);
      closeOverallAgenda();
      showToast(`Now curating for ${day}/${m}/${y}`);
    });
    headerRow.appendChild(th);
  });
  thead.innerHTML = "";
  thead.appendChild(headerRow);

  // Row definitions
  const rows = [
    { label: "Week", get: (a) => a.week_label || "" },
    { label: "Meeting Type", get: (a) => a.meeting_type?.replace(/_/g, " ") || "Standard" },
    { label: "Opening Prayer", get: (a) => a.opening_prayer_name || "" },
    { label: "Opening Hymn", get: (a) => a.hymn_opening || "" },
    { label: "Sacrament Hymn", get: (a) => a.hymn_sacrament || "" },
    { label: "1st Talk", get: (a) => [a.talk1_title, a.talk1_speaker].filter(Boolean).join(" — ") },
    { label: "2nd Talk", get: (a) => [a.talk2_title, a.talk2_speaker].filter(Boolean).join(" — ") },
    { label: "Interlude Hymn", get: (a) => a.hymn_interlude || "" },
    { label: "3rd Talk", get: (a) => [a.talk3_title, a.talk3_speaker].filter(Boolean).join(" — ") },
    { label: "Closing Hymn", get: (a) => a.hymn_closing || "" },
    { label: "Closing Prayer", get: (a) => a.closing_prayer_name || "" },
    { label: "Sunday School", get: (a) => a.classes_json?.sunday_school?.topic || "", group: true },
    { label: "SS Teacher", get: (a) => a.classes_json?.sunday_school?.teacher || "" },
    { label: "Elders Quorum", get: (a) => a.classes_json?.elders_quorum?.topic || "", group: true },
    { label: "EQ Teacher", get: (a) => a.classes_json?.elders_quorum?.teacher || "" },
    { label: "Relief Society", get: (a) => a.classes_json?.relief_society?.topic || "", group: true },
    { label: "RS Teacher", get: (a) => a.classes_json?.relief_society?.teacher || "" },
    { label: "Young Men", get: (a) => a.classes_json?.young_men?.topic || "", group: true },
    { label: "YM Leader", get: (a) => a.classes_json?.young_men?.teacher || "" },
    { label: "Young Women", get: (a) => a.classes_json?.young_women?.topic || "", group: true },
    { label: "YW Leader", get: (a) => a.classes_json?.young_women?.teacher || "" },
    { label: "Primary", get: (a) => a.classes_json?.primary?.topic || "", group: true },
    { label: "Primary Teacher", get: (a) => a.classes_json?.primary?.teacher || "" },
  ];

  tbody.innerHTML = "";
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    if (row.group) tr.classList.add("sheet-row-group");
    const th = document.createElement("th");
    th.textContent = row.label;
    th.className = "sheet-row-label";
    tr.appendChild(th);
    agendas.forEach((a) => {
      const td = document.createElement("td");
      const val = row.get(a.data);
      td.textContent = val;
      td.className = "sheet-cell";
      if (a.date === activeDate) td.classList.add("active-sheet-cell");
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

// ── Leader Authentication & Settings Logic for Study ──
let currentUser = null;
try {
  const savedUser = localStorage.getItem("ward_auth_user");
  if (savedUser) currentUser = JSON.parse(savedUser);
} catch (e) {}

function updateStudyAuthUI() {
  const btnLogin = document.getElementById("btn-login-modal");
  const icon = document.getElementById("auth-status-icon");
  const text = document.getElementById("auth-status-text");

  if (currentUser) {
    if (btnLogin) {
      btnLogin.className = "btn btn-auth logged-in";
      btnLogin.title = `Logged in as ${currentUser.name} (${currentUser.role || "Leader"})`;
    }
    if (icon) icon.textContent = "👤";
    if (text) text.textContent = currentUser.name;
  } else {
    if (btnLogin) {
      btnLogin.className = "btn btn-auth logged-out";
      btnLogin.title = "Leader Login (Click to unlock editing)";
    }
    if (icon) icon.textContent = "🔒";
    if (text) text.textContent = "Login";
  }
}

function openStudyLoginModal() {
  const modal = document.getElementById("login-modal");
  if (!modal) return;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  const inp = document.getElementById("login-string-input");
  if (inp) {
    inp.value = currentUser ? `${currentUser.name}dowleswaram` : "";
    setTimeout(() => inp.focus(), 150);
  }
}

function closeStudyLoginModal() {
  const modal = document.getElementById("login-modal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

async function handleStudyLoginSubmit() {
  const inp = document.getElementById("login-string-input");
  if (!inp) return;
  const val = inp.value.trim();
  if (!val) {
    showToast("Please enter your name or phone and passkey", "error");
    return;
  }

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login_string: val })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      showToast(data.error || "Login failed. Must end with dowleswaram.", "error");
      return;
    }

    currentUser = data.user;
    localStorage.setItem("ward_auth_user", JSON.stringify(currentUser));
    updateStudyAuthUI();
    closeStudyLoginModal();
    showToast(`✓ Welcome, ${currentUser.name}! Editing rights unlocked.`);
  } catch (err) {
    showToast("Error connecting to auth service", "error");
  }
}

function openStudySettingsModal() {
  const modal = document.getElementById("settings-modal");
  if (!modal) return;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  loadStudySettingsUsers();

  // Settings tab switching
  document.querySelectorAll(".settings-tab-btn").forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll(".settings-tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".settings-content").forEach((c) => (c.style.display = "none"));
      btn.classList.add("active");
      const targetId = `settings-${btn.dataset.tab}`;
      const targetEl = document.getElementById(targetId);
      if (targetEl) targetEl.style.display = "block";
    };
  });

  const btnSpeedtest = document.getElementById("btn-run-speedtest");
  if (btnSpeedtest) {
    btnSpeedtest.onclick = async () => {
      const box = document.getElementById("speedtest-results-box");
      if (box) box.innerHTML = "⏳ Running 150 live queries against database...";
      try {
        const res = await fetch("/api/speedtest");
        const data = await res.json();
        if (box) {
          box.innerHTML = `
            <div style="color: #34d399; font-weight: 700; margin-bottom: 8px;">✓ Speedtest Completed: ${data.status}</div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-bottom: 12px;">
              <div style="background: rgba(0,0,0,0.25); padding: 8px; border-radius: 6px;">
                <div style="color: var(--text-muted); font-size: 0.75rem;">Conference Talks Search</div>
                <div style="font-size: 1.2rem; font-weight: 700; color: #60a5fa;">${data.talksQueryMs} ms</div>
              </div>
              <div style="background: rgba(0,0,0,0.25); padding: 8px; border-radius: 6px;">
                <div style="color: var(--text-muted); font-size: 0.75rem;">Hymns Filter & Index</div>
                <div style="font-size: 1.2rem; font-weight: 700; color: #f59e0b;">${data.hymnsQueryMs} ms</div>
              </div>
              <div style="background: rgba(0,0,0,0.25); padding: 8px; border-radius: 6px;">
                <div style="color: var(--text-muted); font-size: 0.75rem;">Agenda Record Fetch</div>
                <div style="font-size: 1.2rem; font-weight: 700; color: #a78bfa;">${data.agendaGetMs} ms</div>
              </div>
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">
              Records verified: <strong>${data.totalRecords?.talks || 0}</strong> talks (procedural & duplicates removed), 
              <strong>${data.totalRecords?.hymns || 0}</strong> hymns, 
              <strong>${data.totalRecords?.cfm || 0}</strong> CFM lessons, 
              <strong>${data.totalRecords?.agendas || 0}</strong> saved Sunday agendas.
            </div>
          `;
        }
      } catch (err) {
        if (box) box.textContent = "Error running speedtest: " + err.message;
      }
    };
  }
}

function closeStudySettingsModal() {
  const modal = document.getElementById("settings-modal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

async function loadStudySettingsUsers() {
  const tbody = document.getElementById("auth-users-tbody");
  if (!tbody) return;
  tbody.innerHTML = "<tr><td colspan=\"5\">Loading authorized leaders...</td></tr>";

  try {
    const res = await fetch("/api/auth/users");
    const data = await res.json();
    const users = data.users || [];
    if (users.length === 0) {
      tbody.innerHTML = "<tr><td colspan=\"5\">No users configured.</td></tr>";
      return;
    }

    tbody.innerHTML = users.map(u => `
      <tr data-id="${u.id}">
        <td><strong>${escapeHtml(u.name)}</strong></td>
        <td><code>${escapeHtml(u.passkey)}</code></td>
        <td>${escapeHtml(u.role || "Leader")}</td>
        <td><span class="pill-badge ${u.is_active ? "pill-ok" : "pill-amber"}">${u.is_active ? "Active" : "Disabled"}</span></td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="window.editAuthUser(${u.id}, '${escapeJs(u.name)}', '${escapeJs(u.passkey)}', '${escapeJs(u.role || "")}')">✏️ Edit</button>
          <button class="btn btn-ghost btn-sm" style="color:#ef4444;" onclick="window.deleteAuthUserPrompt(${u.id}, '${escapeJs(u.name)}')">✕</button>
        </td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = "<tr><td colspan=\"5\" style=\"color:#ef4444;\">Error loading leaders.</td></tr>";
  }
}

window.editAuthUser = async function(id, name, passkey, role) {
  const newName = prompt("Leader Name or Phone Number:", name || "");
  if (!newName) return;
  const newKey = prompt("Passkey (default: dowleswaram):", passkey || "dowleswaram");
  if (!newKey) return;
  const newRole = prompt("Role / Calling:", role || "Leader") || "Leader";

  try {
    const res = await fetch("/api/auth/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id || undefined, name: newName, passkey: newKey, role: newRole, is_active: 1 })
    });
    if (res.ok) {
      showToast("✓ Leader login updated!");
      loadStudySettingsUsers();
    }
  } catch (e) {
    showToast("Error updating leader", "error");
  }
};

window.deleteAuthUserPrompt = async function(id, name) {
  if (!confirm(`Are you sure you want to remove leader login for: ${name}?`)) return;
  try {
    const res = await fetch(`/api/auth/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("✓ Leader login removed");
      loadStudySettingsUsers();
    }
  } catch (e) {
    showToast("Error removing leader", "error");
  }
};

// Initial Boot
document.addEventListener("DOMContentLoaded", () => {
  // Sync theme with Home page (defaults to dark)
  try {
    const savedTheme = localStorage.getItem("ward_agenda_theme");
    if (savedTheme === "light") {
      document.body.classList.remove("theme-dark");
      document.body.classList.add("theme-light");
    } else {
      document.body.classList.remove("theme-light");
      document.body.classList.add("theme-dark");
    }
  } catch (e) {}

  updateStudyAuthUI();
  initEvents();
  applyViewMode(currentViewMode);
  const initDate = getInitialSunday();
  loadAgendaForDate(initDate);
  loadHymns();
  loadTalks();
  loadGospelPrinciples();
  loadCfm();
  loadFsy();

  // If URL specified target tab
  const params = new URLSearchParams(window.location.search);
  const targetTab = params.get("tab");
  if (targetTab) {
    const targetBtn = document.querySelector(`.study-tab[data-tab="${targetTab}"]`);
    if (targetBtn) targetBtn.click();
  }
});
