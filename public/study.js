/**
 * Church Study & Curriculum Planner Client Logic
 * Enables advance spiritual curation of upcoming Sundays.
 */

let activeDate = "";
let currentAgenda = null;
let currentBookFilter = "all";
let searchDebounceTimer = null;

// DOM Elements
const curateDateInput = document.getElementById("curateDateInput");
const prevSundayBtn = document.getElementById("prevSundayBtn");
const nextSundayBtn = document.getElementById("nextSundayBtn");
const backToAgendaBtn = document.getElementById("backToAgendaBtn");
const viewInAgendaLink = document.getElementById("viewInAgendaLink");
const overviewSundayTitle = document.getElementById("overviewSundayTitle");

// Overview Pills
const valOpeningHymn = document.getElementById("valOpeningHymn");
const valSacramentHymn = document.getElementById("valSacramentHymn");
const valClosingHymn = document.getElementById("valClosingHymn");
const valTalk1 = document.getElementById("valTalk1");
const valTalk2 = document.getElementById("valTalk2");
const valTalk3 = document.getElementById("valTalk3");
const valCfm = document.getElementById("valCfm");

// Tabs
const tabButtons = document.querySelectorAll(".study-tab");
const tabPanels = document.querySelectorAll(".tab-panel");

// Hymns Tab
const hymnSearchInput = document.getElementById("hymnSearchInput");
const clearHymnSearch = document.getElementById("clearHymnSearch");
const bookChips = document.querySelectorAll(".book-filter-chips .chip");
const hymnsGrid = document.getElementById("hymnsGrid");
const hymnResultsCount = document.getElementById("hymnResultsCount");

// Talks Tab
const talkSearchInput = document.getElementById("talkSearchInput");
const clearTalkSearch = document.getElementById("clearTalkSearch");
const talkYearSelect = document.getElementById("talkYearSelect");
const talkSpeakerSelect = document.getElementById("talkSpeakerSelect");
const talksGrid = document.getElementById("talksGrid");
const talkResultsCount = document.getElementById("talkResultsCount");

// CFM Tab
const cfmSearchInput = document.getElementById("cfmSearchInput");
const clearCfmSearch = document.getElementById("clearCfmSearch");
const cfmYearSelect = document.getElementById("cfmYearSelect");
const cfmGrid = document.getElementById("cfmGrid");
const cfmResultsCount = document.getElementById("cfmResultsCount");

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
 * Sunday navigation math
 */
function getNextSunday(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const currentDay = date.getDay();
  const daysUntilSunday = currentDay === 0 ? 7 : (7 - currentDay);
  date.setDate(date.getDate() + daysUntilSunday);
  return date.toISOString().split("T")[0];
}

function getPrevSunday(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const currentDay = date.getDay();
  const daysSinceSunday = currentDay === 0 ? 7 : currentDay;
  date.setDate(date.getDate() - daysSinceSunday);
  return date.toISOString().split("T")[0];
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
  return nextSun.toISOString().split("T")[0];
}

/**
 * Load Active Agenda for Selected Date
 */
async function loadAgendaForDate(dateStr) {
  activeDate = dateStr;
  curateDateInput.value = dateStr;
  backToAgendaBtn.href = `/?date=${dateStr}`;
  viewInAgendaLink.href = `/?date=${dateStr}`;

  try {
    const res = await fetch(`/api/agenda/${dateStr}`);
    if (!res.ok) throw new Error("Failed to load agenda");
    const json = await res.json();
    currentAgenda = json.data;
    renderOverviewCard();
  } catch (err) {
    console.error("Error loading agenda:", err);
    showToast("Could not load agenda for " + dateStr, "error");
  }
}

/**
 * Render Current Curated Plan Overview Card
 */
function renderOverviewCard() {
  if (!currentAgenda) return;
  const d = new Date(activeDate + "T00:00:00");
  const dateFormatted = d.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" });
  overviewSundayTitle.textContent = `Sunday Plan: ${dateFormatted} (${currentAgenda.week_label || "Sunday"})`;

  // Opening Hymn
  if (currentAgenda.hymn_opening) {
    valOpeningHymn.innerHTML = currentAgenda.hymn_opening_url 
      ? `<a href="${currentAgenda.hymn_opening_url}" target="_blank" rel="noopener">${escapeHtml(currentAgenda.hymn_opening)} 🔗</a>`
      : escapeHtml(currentAgenda.hymn_opening);
  } else {
    valOpeningHymn.textContent = "None selected";
  }

  // Sacrament Hymn
  if (currentAgenda.hymn_sacrament) {
    valSacramentHymn.innerHTML = currentAgenda.hymn_sacrament_url 
      ? `<a href="${currentAgenda.hymn_sacrament_url}" target="_blank" rel="noopener">${escapeHtml(currentAgenda.hymn_sacrament)} 🔗</a>`
      : escapeHtml(currentAgenda.hymn_sacrament);
  } else {
    valSacramentHymn.textContent = "None selected";
  }

  // Closing Hymn
  if (currentAgenda.hymn_closing) {
    valClosingHymn.innerHTML = currentAgenda.hymn_closing_url 
      ? `<a href="${currentAgenda.hymn_closing_url}" target="_blank" rel="noopener">${escapeHtml(currentAgenda.hymn_closing)} 🔗</a>`
      : escapeHtml(currentAgenda.hymn_closing);
  } else {
    valClosingHymn.textContent = "None selected";
  }

  // 1st Talk
  if (currentAgenda.talk1_title) {
    valTalk1.innerHTML = currentAgenda.talk1_url 
      ? `<a href="${currentAgenda.talk1_url}" target="_blank" rel="noopener">${escapeHtml(currentAgenda.talk1_title)} 🔗</a>`
      : escapeHtml(currentAgenda.talk1_title);
  } else {
    valTalk1.textContent = "No topic set";
  }

  // 2nd Talk
  if (currentAgenda.talk2_title) {
    valTalk2.innerHTML = currentAgenda.talk2_url 
      ? `<a href="${currentAgenda.talk2_url}" target="_blank" rel="noopener">${escapeHtml(currentAgenda.talk2_title)} 🔗</a>`
      : escapeHtml(currentAgenda.talk2_title);
  } else {
    valTalk2.textContent = "No topic set";
  }

  // 3rd Talk
  if (currentAgenda.talk3_title) {
    valTalk3.innerHTML = currentAgenda.talk3_url 
      ? `<a href="${currentAgenda.talk3_url}" target="_blank" rel="noopener">${escapeHtml(currentAgenda.talk3_title)} 🔗</a>`
      : escapeHtml(currentAgenda.talk3_title);
  } else {
    valTalk3.textContent = "No topic set";
  }

  // CFM
  const ssTopic = currentAgenda.classes_json?.sunday_school?.topic || "";
  const ssUrl = currentAgenda.classes_json?.sunday_school?.url || "";
  if (ssTopic) {
    valCfm.innerHTML = ssUrl
      ? `<a href="${ssUrl}" target="_blank" rel="noopener">${escapeHtml(ssTopic)} 🔗</a>`
      : escapeHtml(ssTopic);
  } else {
    valCfm.textContent = "No CFM lesson applied";
  }
}

/**
 * Save updated agenda fields back to server
 */
async function saveAgendaUpdate(partialUpdate, successMsg) {
  if (!currentAgenda) return;
  const updated = {
    ...currentAgenda,
    ...partialUpdate,
    date: activeDate,
  };

  try {
    const res = await fetch(`/api/agenda/${activeDate}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    if (!res.ok) throw new Error("Failed to save agenda update");
    const json = await res.json();
    currentAgenda = json.data;
    renderOverviewCard();
    showToast(successMsg || "Updated successfully!");
  } catch (err) {
    console.error("Error saving agenda:", err);
    showToast("Failed to save changes", "error");
  }
}

/**
 * Fetch and Render Hymns
 */
async function loadHymns() {
  hymnsGrid.innerHTML = `<div class="loading-state">Loading hymns from database...</div>`;
  const q = hymnSearchInput.value.trim();
  const book = currentBookFilter;

  const url = `/api/hymns?q=${encodeURIComponent(q)}&book=${encodeURIComponent(book)}&limit=100`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const hymns = data.hymns || [];
    hymnResultsCount.textContent = `Found ${data.count || hymns.length} hymns`;

    if (hymns.length === 0) {
      hymnsGrid.innerHTML = `<div class="empty-state">No hymns matched your search.</div>`;
      return;
    }

    hymnsGrid.innerHTML = hymns.map(h => {
      const bookClass = h.book.includes("Children") ? "badge-cs" : (h.book.includes("Home") ? "badge-new" : "badge-1985");
      return `
        <div class="resource-card hymn-card">
          <div class="card-header">
            <span class="badge ${bookClass}">${escapeHtml(h.book)}</span>
            <span class="hymn-number">#${h.number}</span>
          </div>
          <h3 class="card-title">${escapeHtml(h.title)}</h3>
          <div class="card-links">
            <a href="${h.url}" target="_blank" rel="noopener" class="btn-link-out">
              <span>🎧 Listen & Music</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
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
 * Fetch and Render Conference Talks
 */
async function loadTalks() {
  talksGrid.innerHTML = `<div class="loading-state">Loading conference talks from database...</div>`;
  const q = talkSearchInput.value.trim();
  const year = talkYearSelect.value;
  const speaker = talkSpeakerSelect.value;

  const url = `/api/talks?q=${encodeURIComponent(q)}&speaker=${encodeURIComponent(speaker)}&year=${encodeURIComponent(year)}&limit=60`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const talks = data.talks || [];
    talkResultsCount.textContent = `Found ${data.count || talks.length} conference talks`;

    if (talks.length === 0) {
      talksGrid.innerHTML = `<div class="empty-state">No conference talks matched your filters.</div>`;
      return;
    }

    talksGrid.innerHTML = talks.map(t => {
      // Clean display speaker and title
      const title = t.title;
      const speaker = t.speaker;
      return `
        <div class="resource-card talk-card">
          <div class="card-header">
            <span class="badge badge-conf">${escapeHtml(t.conference_name)}</span>
            <span class="conf-session">${escapeHtml(t.session || "General Session")}</span>
          </div>
          <h3 class="card-title">${escapeHtml(title)}</h3>
          <p class="card-author">👤 ${escapeHtml(speaker)}</p>
          <div class="card-links">
            <a href="${t.url}" target="_blank" rel="noopener" class="btn-link-out">
              <span>📖 Read Talk on Church.org</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
          </div>
          <div class="action-btn-row">
            <button class="btn-assign" onclick="assignTalk(1, '${escapeJs(title)}', '${escapeJs(speaker)}', '${escapeJs(t.url)}')">Assign 1st Talk</button>
            <button class="btn-assign" onclick="assignTalk(2, '${escapeJs(title)}', '${escapeJs(speaker)}', '${escapeJs(t.url)}')">Assign 2nd Talk</button>
            <button class="btn-assign" onclick="assignTalk(3, '${escapeJs(title)}', '${escapeJs(speaker)}', '${escapeJs(t.url)}')">Assign 3rd Talk</button>
          </div>
        </div>
      `;
    }).join("");
  } catch (err) {
    console.error("Error loading talks:", err);
    talksGrid.innerHTML = `<div class="error-state">Failed to load conference talks.</div>`;
  }
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

  saveAgendaUpdate(update, `✓ Assigned ${talkNum}${talkNum === 1 ? 'st' : (talkNum === 2 ? 'nd' : 'rd')} Talk Topic: ${title}!`);
};

/**
 * Fetch and Render Come, Follow Me Curriculum
 */
async function loadCfm() {
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
      return;
    }

    cfmGrid.innerHTML = lessons.map(c => {
      const isDateMatch = activeDate && c.date_range && doesDateMatchRange(activeDate, c.date_range);
      return `
        <div class="resource-card cfm-card ${isDateMatch ? 'highlight-active-week' : ''}">
          <div class="card-header">
            <span class="badge badge-cfm">${escapeHtml(c.book_title)}</span>
            <span class="cfm-date-pill">📅 ${escapeHtml(c.date_range || `Week ${c.week_number}`)}</span>
            ${isDateMatch ? '<span class="badge-matched">★ Scheduled for this Sunday</span>' : ''}
          </div>
          <h3 class="card-title">${escapeHtml(c.title)}</h3>
          ${c.scriptures ? `<p class="cfm-scriptures">📜 <strong>Reading:</strong> ${escapeHtml(c.scriptures)}</p>` : ''}
          <div class="card-links">
            <a href="${c.url}" target="_blank" rel="noopener" class="btn-link-out">
              <span>📖 Open Lesson on Church.org</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/></svg>
            </a>
          </div>
          <div class="action-btn-row">
            <button class="btn-assign" onclick="assignCfm('sunday_school', '${escapeJs(c.date_range)}: ${escapeJs(c.title)}', '${escapeJs(c.url)}')">Apply to Sunday School</button>
            <button class="btn-assign" onclick="assignCfm('primary', '${escapeJs(c.date_range)}: ${escapeJs(c.title)}', '${escapeJs(c.url)}')">Apply to Primary</button>
          </div>
        </div>
      `;
    }).join("");
  } catch (err) {
    console.error("Error loading CFM lessons:", err);
    cfmGrid.innerHTML = `<div class="error-state">Failed to load lessons.</div>`;
  }
}

function doesDateMatchRange(dateStr, rangeStr) {
  // Simple check if month name matches
  const d = new Date(dateStr + "T00:00:00");
  const monthName = d.toLocaleDateString("en-US", { month: "long" });
  const day = d.getDate();
  return rangeStr.includes(monthName) && rangeStr.includes(String(day));
}

window.assignCfm = function(className, topic, url) {
  if (!currentAgenda) return;
  const classesJson = currentAgenda.classes_json || {};
  if (className === "sunday_school") {
    classesJson.sunday_school = {
      ...classesJson.sunday_school,
      topic,
      url,
    };
  } else if (className === "primary") {
    classesJson.primary = {
      ...classesJson.primary,
      topic,
      url,
    };
  }

  saveAgendaUpdate({ classes_json: classesJson }, `✓ Applied Come, Follow Me lesson to ${className === 'sunday_school' ? 'Sunday School' : 'Primary'}!`);
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
  // Date changes
  curateDateInput.addEventListener("change", () => {
    loadAgendaForDate(curateDateInput.value);
  });

  prevSundayBtn.addEventListener("click", () => {
    const prev = getPrevSunday(activeDate);
    loadAgendaForDate(prev);
  });

  nextSundayBtn.addEventListener("click", () => {
    const next = getNextSunday(activeDate);
    loadAgendaForDate(next);
  });

  // Tab switching
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      tabButtons.forEach(b => b.classList.remove("active"));
      tabPanels.forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      const tabId = btn.dataset.tab;
      if (tabId === "hymns") {
        document.getElementById("tabHymns").classList.add("active");
      } else if (tabId === "talks") {
        document.getElementById("tabTalks").classList.add("active");
      } else if (tabId === "cfm") {
        document.getElementById("tabCfm").classList.add("active");
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

  // Talk filters
  talkSearchInput.addEventListener("input", () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(loadTalks, 250);
  });

  clearTalkSearch.addEventListener("click", () => {
    talkSearchInput.value = "";
    loadTalks();
  });

  talkYearSelect.addEventListener("change", loadTalks);
  talkSpeakerSelect.addEventListener("change", loadTalks);

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
}

// Initial Boot
document.addEventListener("DOMContentLoaded", () => {
  initEvents();
  const initDate = getInitialSunday();
  loadAgendaForDate(initDate);
  loadHymns();
  loadTalks();
  loadCfm();

  // If URL specified target tab
  const params = new URLSearchParams(window.location.search);
  const targetTab = params.get("tab");
  if (targetTab) {
    const targetBtn = document.querySelector(`.study-tab[data-tab="${targetTab}"]`);
    if (targetBtn) targetBtn.click();
  }
});
