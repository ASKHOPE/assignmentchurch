/**
 * Church Study & Curriculum Planner Client Logic
 * Enables advance spiritual curation of upcoming Sundays.
 */

let activeDate = "";
let currentAgenda = null;
let currentBookFilter = "Hymns (1985)"; // Default to standard Hymnbook
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
const talkSortSelect = document.getElementById("talkSortSelect");
const talkYearSelect = document.getElementById("talkYearSelect");
const talkSpeakerSelect = document.getElementById("talkSpeakerSelect");
const talksGrid = document.getElementById("talksGrid");
const talkResultsCount = document.getElementById("talkResultsCount");

// Gospel Principles Tab (Youth 1st Talk)
const gpSearchInput = document.getElementById("gpSearchInput");
const clearGpSearch = document.getElementById("clearGpSearch");
const gpGrid = document.getElementById("gpGrid");
const gpResultsCount = document.getElementById("gpResultsCount");

// CFM Tab
const cfmSearchInput = document.getElementById("cfmSearchInput");
const clearCfmSearch = document.getElementById("clearCfmSearch");
const cfmYearSelect = document.getElementById("cfmYearSelect");
const cfmActiveMatchBanner = document.getElementById("cfmActiveMatchBanner");
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
    // Refresh CFM matching for this new date
    loadCfm();
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

  // 1st Talk (Youth / Gospel Principles)
  if (currentAgenda.talk1_title) {
    valTalk1.innerHTML = currentAgenda.talk1_url 
      ? `<a href="${currentAgenda.talk1_url}" target="_blank" rel="noopener">${escapeHtml(currentAgenda.talk1_title)} 🔗</a>`
      : escapeHtml(currentAgenda.talk1_title);
  } else {
    valTalk1.textContent = "No topic set";
  }

  // 2nd Talk (General Conference)
  if (currentAgenda.talk2_title) {
    valTalk2.innerHTML = currentAgenda.talk2_url 
      ? `<a href="${currentAgenda.talk2_url}" target="_blank" rel="noopener">${escapeHtml(currentAgenda.talk2_title)} 🔗</a>`
      : escapeHtml(currentAgenda.talk2_title);
  } else {
    valTalk2.textContent = "No topic set";
  }

  // 3rd Talk (General Conference / Adult)
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
          <div class="card-header">
            <span class="badge ${bookClass}">${escapeHtml(bookLabel)}</span>
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
 * Fetch and Render Conference Talks (Corrected Speaker & Title, Organized by Year & Date)
 */
async function loadTalks() {
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
      talksGrid.innerHTML = html;
    } else {
      // Flat grid sorted by name/speaker
      talksGrid.innerHTML = `
        <div class="cards-grid">
          ${talks.map(renderTalkCard).join("")}
        </div>
      `;
    }
  } catch (err) {
    console.error("Error loading talks:", err);
    talksGrid.innerHTML = `<div class="error-state">Failed to load conference talks.</div>`;
  }
}

function renderTalkCard(t) {
  const title = t.title;
  const speaker = t.speaker;
  return `
    <div class="resource-card talk-card">
      <div class="card-header">
        <span class="badge badge-conf">${escapeHtml(t.conference_name)}</span>
        <span class="conf-session">${escapeHtml(t.session || "General Session")}</span>
      </div>
      <h3 class="card-title">“${escapeHtml(title)}”</h3>
      <p class="card-author">👤 <strong>${escapeHtml(speaker)}</strong></p>
      <div class="card-links">
        <a href="${t.url}" target="_blank" rel="noopener" class="btn-link-out">
          <span>📖 Read Talk on Church.org</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
      </div>
      <div class="action-btn-row">
        <button class="btn-assign btn-highlight-assign" onclick="assignTalk(2, '${escapeJs(title)}', '${escapeJs(speaker)}', '${escapeJs(t.url)}')">Assign 2nd Talk</button>
        <button class="btn-assign btn-highlight-assign" onclick="assignTalk(3, '${escapeJs(title)}', '${escapeJs(speaker)}', '${escapeJs(t.url)}')">Assign 3rd Talk</button>
        <button class="btn-assign btn-subtle" onclick="assignTalk(1, '${escapeJs(title)}', '${escapeJs(speaker)}', '${escapeJs(t.url)}')">1st Talk</button>
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
        <div class="card-header">
          <span class="badge badge-gp">📖 Gospel Principles</span>
          <span class="gp-chapter-pill">Chapter ${c.chapter_number}</span>
        </div>
        <h3 class="card-title">Chapter ${c.chapter_number}: ${escapeHtml(c.title)}</h3>
        <p class="gp-desc">Ideal foundational topic for youth speakers and new member talks.</p>
        <div class="card-links">
          <a href="${c.url}" target="_blank" rel="noopener" class="btn-link-out">
            <span>📖 Read Chapter on Church.org</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
        </div>
        <div class="action-btn-row">
          <button class="btn-assign btn-gp-assign" onclick="assignGospelPrinciple(${c.chapter_number}, '${escapeJs(c.title)}', '${escapeJs(c.url)}')">
            ⚡ Assign 1st Talk (Youth)
          </button>
        </div>
      </div>
    `).join("");
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
      const d = new Date(activeDate + "T00:00:00");
      const sunDisplay = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      cfmActiveMatchBanner.style.display = "flex";
      cfmActiveMatchBanner.innerHTML = `
        <div class="cfm-banner-left">
          <div class="cfm-banner-tag">★ SCHEDULED FOR ACTIVE SUNDAY (${escapeHtml(sunDisplay)})</div>
          <h3 class="cfm-banner-title">📅 ${escapeHtml(matchedLesson.date_range)}: “${escapeHtml(matchedLesson.title)}”</h3>
          ${matchedLesson.scriptures ? `<p class="cfm-banner-scriptures">📜 <strong>Reading:</strong> ${escapeHtml(matchedLesson.scriptures)}</p>` : ''}
          <p class="cfm-banner-sub">⚡ 1st 25-Min: Sunday School (CFM) | 2nd 25-Min: Aaronic Priesthood & YW (FSY Lessons)</p>
        </div>
        <div class="cfm-banner-right">
          <button class="btn btn-apply-all-banner" onclick="applyCfmToAllQuorums('${escapeJs(matchedLesson.date_range)}', '${escapeJs(matchedLesson.title)}', '${escapeJs(matchedLesson.scriptures)}', '${escapeJs(matchedLesson.url)}')">
            ⚡ Apply to ALL Quorums & Classes
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
      return `
        <div class="resource-card cfm-card ${isDateMatch ? 'highlight-active-week' : ''}">
          <div class="card-header">
            <span class="badge badge-cfm">${escapeHtml(c.book_title)}</span>
            <span class="cfm-date-pill">📅 ${escapeHtml(c.date_range || `Week ${c.week_number}`)}</span>
            ${isDateMatch ? '<span class="badge-matched">★ Scheduled for Active Sunday</span>' : ''}
          </div>
          <h3 class="card-title">${escapeHtml(c.title)}</h3>
          ${c.scriptures ? `<p class="cfm-scriptures">📜 <strong>Reading:</strong> ${escapeHtml(c.scriptures)}</p>` : ''}
          <div class="card-links">
            <a href="${c.url}" target="_blank" rel="noopener" class="btn-link-out">
              <span>📖 Open Lesson on Church.org</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
          </div>
          <div class="action-btn-row">
            <button class="btn-assign btn-highlight-assign" onclick="applyCfmToAllQuorums('${escapeJs(c.date_range)}', '${escapeJs(c.title)}', '${escapeJs(c.scriptures)}', '${escapeJs(c.url)}')">⚡ Apply to ALL Quorums</button>
            <button class="btn-assign" onclick="assignCfm('sunday_school', '${escapeJs(c.date_range)}: ${escapeJs(c.title)}', '${escapeJs(c.url)}')">Sunday School</button>
            <button class="btn-assign" onclick="assignCfm('elders_quorum', '${escapeJs(c.date_range)}: ${escapeJs(c.title)}', '${escapeJs(c.url)}')">Elders Quorum</button>
            <button class="btn-assign" onclick="assignCfm('relief_society', '${escapeJs(c.date_range)}: ${escapeJs(c.title)}', '${escapeJs(c.url)}')">Relief Society</button>
            <button class="btn-assign" onclick="assignCfm('primary', '${escapeJs(c.date_range)}: ${escapeJs(c.title)}', '${escapeJs(c.url)}')">Primary</button>
          </div>
        </div>
      `;
    }).join("");
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
    sunday_school: "Sunday School",
    elders_quorum: "Elders Quorum",
    relief_society: "Relief Society",
    young_men: "Young Men",
    young_women: "Young Women",
    primary: "Primary"
  };

  saveAgendaUpdate({ classes_json: classesJson }, `✓ Applied Come, Follow Me lesson to ${labelMap[className] || className}!`);
};

window.applyCfmToAllQuorums = async function(dateRange, title, scriptures, url) {
  if (!currentAgenda) return;
  const fullTopic = scriptures 
    ? `${dateRange}: “${title}” (${scriptures})` 
    : `${dateRange}: “${title}”`;
  const shortTopic = `${dateRange}: “${title}”`;

  const classesJson = currentAgenda.classes_json || {};
  
  // 1st 25-minute class: Sunday School
  classesJson.sunday_school = {
    ...(classesJson.sunday_school || {}),
    topic: fullTopic,
    url: url,
  };
  
  // Primary
  classesJson.primary = {
    ...(classesJson.primary || {}),
    topic: shortTopic,
    url: url,
  };

  // Adult Quorums (Elders Quorum & Relief Society)
  classesJson.elders_quorum = {
    ...(classesJson.elders_quorum || {}),
    topic: classesJson.elders_quorum?.topic || shortTopic,
    url: classesJson.elders_quorum?.url || url,
  };
  classesJson.relief_society = {
    ...(classesJson.relief_society || {}),
    topic: classesJson.relief_society?.topic || shortTopic,
    url: classesJson.relief_society?.url || url,
  };

  // 2nd 25-minute class: Young Men & Young Women (FSY Sunday Lessons)
  try {
    const d = new Date(activeDate + "T00:00:00");
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const sundayNum = Math.ceil(day / 7);

    const fsyRes = await fetch(`/api/fsy-lessons?year=${year}&month=${month}&sunday=${sundayNum}`);
    if (fsyRes.ok) {
      const fsyData = await fsyRes.json();
      const fsyLessons = fsyData.lessons || [];

      // Find Young Men lesson
      const ymLesson = fsyLessons.find(l => l.organization === "young_men") || fsyLessons.find(l => l.organization === "both");
      if (ymLesson) {
        classesJson.young_men = {
          ...(classesJson.young_men || {}),
          topic: ymLesson.title,
          url: ymLesson.url,
        };
      } else {
        classesJson.young_men = { ...(classesJson.young_men || {}), topic: shortTopic, url };
      }

      // Find Young Women lesson
      const ywLesson = fsyLessons.find(l => l.organization === "young_women") || fsyLessons.find(l => l.organization === "both");
      if (ywLesson) {
        classesJson.young_women = {
          ...(classesJson.young_women || {}),
          topic: ywLesson.title,
          url: ywLesson.url,
        };
      } else {
        classesJson.young_women = { ...(classesJson.young_women || {}), topic: shortTopic, url };
      }
    } else {
      classesJson.young_men = { ...(classesJson.young_men || {}), topic: shortTopic, url };
      classesJson.young_women = { ...(classesJson.young_women || {}), topic: shortTopic, url };
    }
  } catch (err) {
    console.warn("Could not fetch FSY lesson:", err);
    classesJson.young_men = { ...(classesJson.young_men || {}), topic: shortTopic, url };
    classesJson.young_women = { ...(classesJson.young_women || {}), topic: shortTopic, url };
  }

  saveAgendaUpdate({ classes_json: classesJson }, `✓ Applied Come, Follow Me to Sunday School & Primary, and FSY Sunday Lessons to Young Men & Young Women!`);
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
      } else if (tabId === "gp") {
        document.getElementById("tabGp").classList.add("active");
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
}

// Initial Boot
document.addEventListener("DOMContentLoaded", () => {
  initEvents();
  const initDate = getInitialSunday();
  loadAgendaForDate(initDate);
  loadHymns();
  loadTalks();
  loadGospelPrinciples();
  loadCfm();

  // If URL specified target tab
  const params = new URLSearchParams(window.location.search);
  const targetTab = params.get("tab");
  if (targetTab) {
    const targetBtn = document.querySelector(`.study-tab[data-tab="${targetTab}"]`);
    if (targetBtn) targetBtn.click();
  }
});
