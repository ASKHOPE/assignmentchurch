/**
 * Ward Sunday Agenda & Assignment Planner - Client Application
 * Zero-dependency, ultra-fast, optimistic UI with debounced sync
 */

(() => {
  // State
  let currentDate = "2026-09-13";
  let currentAgenda = null;
  let originalAgendaJson = "";
  let hasUnsavedChanges = false;
  let saveTimeout = null;
  let activePreset = "full";
  let currentTab = "tab-sacrament";
  let popoverDate = new Date(2026, 8, 13); // For browsing months in calendar popover
  let fullCalYear = 2026;
  let fullCalMonth = 8; // 0-indexed (8 = September)
  let fullCalSelectedDate = "2026-09-13";
  let fullCalHolidays = {}; // Year-keyed holiday cache

  // Elements
  const datePicker = document.getElementById("date-picker");
  const dateDisplayText = document.getElementById("date-display-text");
  const weekPill = document.getElementById("week-pill");
  const syncBadge = document.getElementById("sync-badge");
  const syncText = document.getElementById("sync-text");
  const btnPrev = document.getElementById("btn-prev-sunday");
  const btnNext = document.getElementById("btn-next-sunday");

  // Calendar Selector Elements
  const btnOpenCalendar = document.getElementById("btn-open-calendar");
  const calendarPopover = document.getElementById("calendar-popover");
  const btnClosePopover = document.getElementById("btn-close-popover");
  const btnPrevMonth = document.getElementById("btn-prev-month");
  const btnNextMonth = document.getElementById("btn-next-month");
  const popoverMonthLabel = document.getElementById("popover-month-label");
  const popoverSundaysList = document.getElementById("popover-sundays-list");
  const btnTriggerNativePicker = document.getElementById("btn-trigger-native-picker");

  // Beautiful Full Calendar Modal Elements
  const fullCalModal = document.getElementById("full-calendar-modal");
  const btnCloseFullCal = document.getElementById("btn-close-full-cal");
  const fullCalMonthYear = document.getElementById("full-cal-month-year");
  const btnCalPrevYear = document.getElementById("btn-cal-prev-year");
  const btnCalPrevMonth = document.getElementById("btn-cal-prev-month");
  const btnCalNextMonth = document.getElementById("btn-cal-next-month");
  const btnCalNextYear = document.getElementById("btn-cal-next-year");
  const btnCalToday = document.getElementById("btn-cal-today");
  const calToggleLds = document.getElementById("cal-toggle-lds");
  const calToggleIndian = document.getElementById("cal-toggle-indian");
  const calDaysGrid = document.getElementById("cal-days-grid");
  const calDetailsDate = document.getElementById("cal-details-date");
  const calDetailsBadge = document.getElementById("cal-details-badge");
  const calDetailsEventsList = document.getElementById("cal-details-events-list");
  const btnCalJumpAgenda = document.getElementById("btn-cal-jump-agenda");
  const indianFeedStatus = document.getElementById("indian-feed-status");

  // Meeting Type & Conference Elements
  const meetingTypeBtns = document.querySelectorAll(".meeting-type-btn");
  const conferenceCard = document.getElementById("conference-card");
  const wardMeetingTopGrid = document.getElementById("ward-meeting-top-grid");
  const panelClasses = document.getElementById("panel-classes");
  const fastTestimonyBanner = document.getElementById("fast-testimony-banner");
  const talksGroup = document.getElementById("talks-group");
  const sacramentCardTitle = document.getElementById("sacrament-card-title");
  const sacramentCardBadge = document.getElementById("sacrament-card-badge");
  const confMainTitle = document.getElementById("conf-main-title");
  const confTypeBadge = document.getElementById("conf-type-badge");
  const confIcon = document.getElementById("conf-icon");
  const confNoticeText = document.getElementById("conf-notice-text");

  // Quorum and Talk Org Selectors
  const talk1OrgSelect = document.getElementById("talk1-org");
  const talk1OrgCustom = document.getElementById("talk1-org-custom");
  const talk2OrgSelect = document.getElementById("talk2-org");
  const talk2OrgCustom = document.getElementById("talk2-org-custom");
  const talk3OrgSelect = document.getElementById("talk3-org");
  const talk3OrgCustom = document.getElementById("talk3-org-custom");

  // WhatsApp Modal Elements
  const whatsappModal = document.getElementById("whatsapp-modal");
  const btnOpenWhatsapp = document.getElementById("btn-open-whatsapp");
  const btnCloseModal = document.getElementById("btn-close-modal");
  const previewTextarea = document.getElementById("whatsapp-preview-text");
  const btnCopyText = document.getElementById("btn-copy-text");
  const btnShareWhatsapp = document.getElementById("btn-share-whatsapp-direct");
  const presetBtns = document.querySelectorAll(".preset-btn");
  const reminderOptions = document.getElementById("reminder-options");
  const reminderSelect = document.getElementById("reminder-member-select");

  // Print & Theme
  const btnPrint = document.getElementById("btn-print");
  const btnTheme = document.getElementById("btn-theme-toggle");
  const themeIcon = document.getElementById("theme-icon");
  const toast = document.getElementById("toast");

  // Talks Order elements
  const orderRulesList = document.getElementById("order-rules-list");
  const currentRotationText = document.getElementById("current-rotation-text");

  // Input mapping definition
  const fieldBindings = [
    { id: "opening-prayer-role", path: "opening_prayer_role", event: "change" },
    { id: "opening-prayer-name", path: "opening_prayer_name", event: "input" },
    { id: "talk1-speaker-role", path: "talk1_speaker_role", event: "change" },
    { id: "talk1-title", path: "talk1_title", event: "input" },
    { id: "talk1-speaker", path: "talk1_speaker", event: "input" },
    { id: "talk2-speaker-role", path: "talk2_speaker_role", event: "change" },
    { id: "talk2-title", path: "talk2_title", event: "input" },
    { id: "talk2-url", path: "talk2_url", event: "input" },
    { id: "talk2-speaker", path: "talk2_speaker", event: "input" },
    { id: "talk3-speaker-role", path: "talk3_speaker_role", event: "change" },
    { id: "talk3-title", path: "talk3_title", event: "input" },
    { id: "talk3-url", path: "talk3_url", event: "input" },
    { id: "talk3-speaker", path: "talk3_speaker", event: "input" },
    { id: "closing-prayer-role", path: "closing_prayer_role", event: "change" },
    { id: "closing-prayer-name", path: "closing_prayer_name", event: "input" },
    { id: "hymn-opening", path: "hymn_opening", event: "input" },
    { id: "hymn-sacrament", path: "hymn_sacrament", event: "input" },
    { id: "hymn-interlude", path: "hymn_interlude", event: "input" },
    { id: "hymn-closing", path: "hymn_closing", event: "input" },
    // Conference fields
    { id: "conf-title", path: "conference_title", event: "input" },
    { id: "conf-url", path: "conference_url", event: "input" },
    { id: "conf-details", path: "conference_details", event: "input" },
    // Classes
    { id: "ss-topic", path: "classes_json.sunday_school.topic", event: "input" },
    { id: "ss-url", path: "classes_json.sunday_school.url", event: "input" },
    { id: "ss-teacher-role", path: "classes_json.sunday_school.teacher_role", event: "change" },
    { id: "ss-teacher", path: "classes_json.sunday_school.teacher", event: "input" },
    { id: "ss-youth-teacher-role", path: "classes_json.sunday_school_youth.teacher_role", event: "change" },
    { id: "ss-youth-teacher", path: "classes_json.sunday_school_youth.teacher", event: "input" },
    { id: "eq-topic", path: "classes_json.elders_quorum.topic", event: "input" },
    { id: "eq-url", path: "classes_json.elders_quorum.url", event: "input" },
    { id: "eq-teacher-role", path: "classes_json.elders_quorum.teacher_role", event: "change" },
    { id: "eq-teacher", path: "classes_json.elders_quorum.teacher", event: "input" },
    { id: "rs-topic", path: "classes_json.relief_society.topic", event: "input" },
    { id: "rs-url", path: "classes_json.relief_society.url", event: "input" },
    { id: "rs-teacher-role", path: "classes_json.relief_society.teacher_role", event: "change" },
    { id: "rs-teacher", path: "classes_json.relief_society.teacher", event: "input" },
    { id: "ym-topic", path: "classes_json.young_men.topic", event: "input" },
    { id: "ym-url", path: "classes_json.young_men.url", event: "input" },
    { id: "ym-teacher-role", path: "classes_json.young_men.teacher_role", event: "change" },
    { id: "ym-teacher", path: "classes_json.young_men.teacher", event: "input" },
    { id: "yw-topic", path: "classes_json.young_women.topic", event: "input" },
    { id: "yw-url", path: "classes_json.young_women.url", event: "input" },
    { id: "yw-teacher-role", path: "classes_json.young_women.teacher_role", event: "change" },
    { id: "yw-teacher", path: "classes_json.young_women.teacher", event: "input" },
    { id: "pri-topic", path: "classes_json.primary.topic", event: "input" },
    { id: "pri-url", path: "classes_json.primary.url", event: "input" },
    { id: "pri-teacher-role", path: "classes_json.primary.teacher_role", event: "change" },
    { id: "pri-teacher", path: "classes_json.primary.teacher", event: "input" },
  ];

  /* --------------------------------------------------------------------------
     Initialization
     -------------------------------------------------------------------------- */
  async function init() {
    initTheme();
    initLanguage();
    updateAuthUI();
    setupEventListeners();
    setupMobileTabs();

    // Check if URL specifies date (e.g. returning from Study Planner)
    const urlParams = new URLSearchParams(window.location.search);
    const paramDate = urlParams.get("date");
    if (paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate)) {
      currentDate = paramDate;
    }

    await loadAgenda(currentDate);
    refreshAutocompleteSuggestions();

    // Register PWA Service Worker
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch((err) => {
          console.log("ServiceWorker registration note:", err);
        });
      });
    }
  }

  /* --------------------------------------------------------------------------
     Data Loading & Sync
     -------------------------------------------------------------------------- */
  async function loadAgenda(dateStr) {
    currentDate = dateStr;
    datePicker.value = dateStr;
    updateSyncStatus("loading", "Loading...");

    try {
      const res = await fetch(`/api/agenda/${dateStr}`);
      if (!res.ok) throw new Error("Failed to fetch agenda");
      const json = await res.json();
      currentAgenda = json.data;
      originalAgendaJson = JSON.stringify(currentAgenda);
      setUnsavedChanges(false);
      renderAgenda(currentAgenda);
      updateSyncStatus("saved", "Saved");
    } catch (err) {
      console.warn("Server unavailable, trying local cache:", err);
      const cached = localStorage.getItem(`agenda_${dateStr}`);
      if (cached) {
        currentAgenda = JSON.parse(cached);
        originalAgendaJson = cached;
        setUnsavedChanges(false);
        renderAgenda(currentAgenda);
        updateSyncStatus("offline", "Cached (Offline)");
      } else {
        showToast("Error connecting to server");
      }
    }
  }

  function renderAgenda(agenda) {
    if (!agenda) return;

    // Update Date & Week pill
    dateDisplayText.textContent = formatDisplayDate(agenda.date);
    dateDisplayText.title = formatNumericDate(agenda.date);
    weekPill.textContent = agenda.week_label || "Sunday";

    // Update form values
    for (const binding of fieldBindings) {
      const el = document.getElementById(binding.id);
      if (!el) continue;
      const val = getNestedValue(agenda, binding.path);
      if (el.tagName === "SELECT") {
        if (val !== undefined && val !== null && val !== "") {
          el.value = val;
          if (el.selectedIndex === -1 && el.options.length > 0) {
            el.selectedIndex = 0;
          }
        } else {
          if (el.options.length > 0) {
            el.selectedIndex = 0;
          }
        }
      } else {
        el.value = val !== undefined && val !== null ? val : "";
      }
    }

    // Update Meeting Type UI
    applyMeetingTypeUI(agenda.meeting_type || "standard");

    // Organization selectors for Talk 1, Talk 2, and Talk 3
    renderOrgSelector(talk1OrgSelect, talk1OrgCustom, agenda.talk1_org || "Bishopric");
    renderOrgSelector(talk2OrgSelect, talk2OrgCustom, agenda.talk2_org || "Elders Quorum");
    renderOrgSelector(talk3OrgSelect, talk3OrgCustom, agenda.talk3_org || "Member");

    // Auto-sync speaker role based on organization if not explicitly saved
    if (!agenda.talk1_speaker_role && agenda.talk1_org) {
      const r1 = getRoleForOrg(agenda.talk1_org);
      if (r1) {
        const el = document.getElementById("talk1-speaker-role");
        if (el) el.value = r1;
        agenda.talk1_speaker_role = r1;
      }
    }
    if (!agenda.talk2_speaker_role && agenda.talk2_org) {
      const r2 = getRoleForOrg(agenda.talk2_org);
      if (r2) {
        const el = document.getElementById("talk2-speaker-role");
        if (el) el.value = r2;
        agenda.talk2_speaker_role = r2;
      }
    }
    if (!agenda.talk3_speaker_role && agenda.talk3_org) {
      const r3 = getRoleForOrg(agenda.talk3_org);
      if (r3) {
        const el = document.getElementById("talk3-speaker-role");
        if (el) el.value = r3;
        agenda.talk3_speaker_role = r3;
      }
    }

    // Update talk and lesson study links buttons
    const urlLinkPairs = [
      ["talk2-url", "talk2-link-btn"],
      ["talk3-url", "talk3-link-btn"],
      ["ss-url", "ss-link-btn"],
      ["eq-url", "eq-link-btn"],
      ["rs-url", "rs-link-btn"],
      ["ym-url", "ym-link-btn"],
      ["yw-url", "yw-link-btn"],
      ["pri-url", "pri-link-btn"],
      ["conf-url", "conf-link-btn"],
    ];
    for (const [inputId, btnId] of urlLinkPairs) {
      updateStudyLink(inputId, btnId);
    }

    // Update links to Study & Curriculum planner
    const btnNavStudy = document.getElementById("btn-nav-study");
    if (btnNavStudy) btnNavStudy.href = `/study.html?date=${agenda.date}`;
    const btnCurateTalks = document.getElementById("btn-curate-talks-header");
    if (btnCurateTalks) btnCurateTalks.href = `/study.html?tab=talks&date=${agenda.date}`;
    const btnCurateHymns = document.getElementById("btn-curate-hymns-header");
    if (btnCurateHymns) btnCurateHymns.href = `/study.html?tab=hymns&date=${agenda.date}`;

    // Update Talks Order Reference Card active status
    highlightActiveSundayRule(agenda.date);
  }

  function updateStudyLink(inputId, btnId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(btnId);
    if (!input || !btn) return;
    const url = input.value.trim();
    if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
      btn.href = url;
      btn.style.display = "inline-flex";
    } else {
      btn.style.display = "none";
    }
  }

  function markModified(fieldElement) {
    if (!currentAgenda) return;
    if (fieldElement && fieldElement.classList) {
      fieldElement.classList.add("field-modified");
    }
    // Cache draft locally in localStorage so work is preserved
    localStorage.setItem(`agenda_draft_${currentDate}`, JSON.stringify(currentAgenda));
    setUnsavedChanges(true);
  }

  function setUnsavedChanges(hasChanges) {
    hasUnsavedChanges = hasChanges;
    const modifyBar = document.getElementById("modify-bar");
    const statusText = document.getElementById("modify-status-text");
    if (!modifyBar) return;
    if (hasChanges) {
      modifyBar.classList.add("visible");
      modifyBar.setAttribute("aria-hidden", "false");
      if (statusText) statusText.textContent = "Unsaved changes in agenda";
    } else {
      modifyBar.classList.remove("visible");
      modifyBar.setAttribute("aria-hidden", "true");
      document.querySelectorAll(".field-modified").forEach((el) => el.classList.remove("field-modified"));
    }
  }

  async function saveModifications() {
    if (!currentAgenda) return;
    const saveBtn = document.getElementById("btn-save-modify");
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<span>⏳ Saving...</span>`;
    }

    try {
      // Calculate explicitly modified fields by diffing currentAgenda with originalAgendaJson
      const modifiedFields = [];
      if (originalAgendaJson) {
        try {
          const orig = JSON.parse(originalAgendaJson);
          for (const key of Object.keys(currentAgenda)) {
            if (key === "classes_json") {
              for (const classKey of Object.keys(currentAgenda.classes_json || {})) {
                const curClass = currentAgenda.classes_json[classKey] || {};
                const origClass = orig.classes_json?.[classKey] || {};
                if (JSON.stringify(curClass) !== JSON.stringify(origClass)) {
                  modifiedFields.push(`classes_json.${classKey}`);
                }
              }
            } else if (key !== "updated_at" && key !== "base_updated_at") {
              if (currentAgenda[key] !== orig[key]) {
                modifiedFields.push(key);
              }
            }
          }
        } catch (e) {
          console.warn("Could not diff modified fields:", e);
        }
      }

      const payload = {
        ...currentAgenda,
        base_updated_at: currentAgenda.updated_at,
        modified_fields: modifiedFields.length > 0 ? modifiedFields : undefined,
      };

      const res = await fetch(`/api/agenda/${currentDate}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 429) {
        const rateData = await res.json().catch(() => ({}));
        const wait = rateData.resetInSec || 5;
        showToast(`⏳ Rate limit reached: wait ${wait}s before modifying again`);
        return;
      }

      if (!res.ok) throw new Error("Save error");
      const json = await res.json();
      currentAgenda = json.data || currentAgenda;
      originalAgendaJson = JSON.stringify(currentAgenda);
      localStorage.setItem(`agenda_${currentDate}`, originalAgendaJson);
      localStorage.removeItem(`agenda_draft_${currentDate}`);
      setUnsavedChanges(false);

      if (json.merged) {
        showToast("✓ Changes merged seamlessly with peer leaders' updates!");
        renderAgenda(currentAgenda);
      } else {
        showToast("✓ Changes modified & saved successfully!");
      }
    } catch (e) {
      console.error("Save failed, cached locally:", e);
      showToast("⚠️ Server error, saved locally");
      localStorage.setItem(`agenda_${currentDate}`, JSON.stringify(currentAgenda));
      setUnsavedChanges(false);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<span>💾 Modify & Save</span>`;
      }
    }
  }

  function discardModifications() {
    if (!originalAgendaJson) return;
    currentAgenda = JSON.parse(originalAgendaJson);
    localStorage.removeItem(`agenda_draft_${currentDate}`);
    setUnsavedChanges(false);
    renderAgenda(currentAgenda);
    showToast("Unsaved changes discarded");
  }

  async function safeChangeDate(newDate) {
    if (hasUnsavedChanges) {
      const confirmSave = confirm("You have unsaved changes. Would you like to save before switching dates?");
      if (confirmSave) {
        await saveModifications();
      } else {
        setUnsavedChanges(false);
      }
    }
    await loadAgenda(newDate);
  }

  function scheduleAutoSave() {
    // Kept for backward compatibility, now routes through markModified
    markModified();
  }

  function updateSyncStatus(status, text) {
    if (syncText) syncText.textContent = text;
    if (syncBadge) {
      if (status === "saving") {
        syncBadge.className = "sync-badge saving";
      } else {
        syncBadge.className = "sync-badge";
      }
    }
  }

  function getRoleForOrg(orgName) {
    if (!orgName) return null;
    const lower = orgName.toLowerCase().trim();
    if (
      lower.includes("relief society") ||
      lower.includes("young women") ||
      lower === "yw" ||
      lower.includes("primary")
    ) {
      return "Sister";
    }
    if (
      lower.includes("elders quorum") ||
      lower === "eq" ||
      lower.includes("young men") ||
      lower === "ym" ||
      lower.includes("bishopric") ||
      lower.includes("high councilor") ||
      lower.includes("councilor")
    ) {
      return "Brother";
    }
    return null;
  }

  function autoPrefillSpeakerRole(talkNum, orgVal) {
    const role = getRoleForOrg(orgVal);
    if (!role) return;
    const roleSelect = document.getElementById(`talk${talkNum}-speaker-role`);
    if (roleSelect) {
      roleSelect.value = role;
      if (currentAgenda) {
        currentAgenda[`talk${talkNum}_speaker_role`] = role;
      }
      markModified(roleSelect);
    }
  }

  /* --------------------------------------------------------------------------
     Form Input Handlers
     -------------------------------------------------------------------------- */
  function setupEventListeners() {
    // Attach listener to every input field for 0ms optimistic mutation
    for (const binding of fieldBindings) {
      const el = document.getElementById(binding.id);
      if (!el) continue;

      el.addEventListener(binding.event, (e) => {
        if (!currentAgenda) return;
        setNestedValue(currentAgenda, binding.path, e.target.value);

        if (binding.id.endsWith("-url")) {
          const prefix = binding.id.replace("-url", "");
          updateStudyLink(binding.id, `${prefix}-link-btn`);
        }

        markModified(el);
      });
    }

    // Modify & Save Floating Bar Buttons
    const btnSaveModify = document.getElementById("btn-save-modify");
    if (btnSaveModify) btnSaveModify.addEventListener("click", saveModifications);
    const btnDiscardChanges = document.getElementById("btn-discard-changes");
    if (btnDiscardChanges) btnDiscardChanges.addEventListener("click", discardModifications);

    // Prevent accidental page close with unsaved edits
    window.addEventListener("beforeunload", (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    });

    // Meeting Type Selection Buttons
    meetingTypeBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        setMeetingType(btn.dataset.type);
        markModified();
      });
    });

    // Talk 1 Org Selection
    talk1OrgSelect.addEventListener("change", (e) => {
      if (e.target.value === "Custom") {
        talk1OrgCustom.style.display = "inline-block";
        talk1OrgCustom.focus();
        currentAgenda.talk1_org = talk1OrgCustom.value || "Custom";
        autoPrefillSpeakerRole(1, talk1OrgCustom.value);
      } else {
        talk1OrgCustom.style.display = "none";
        currentAgenda.talk1_org = e.target.value;
        autoPrefillSpeakerRole(1, e.target.value);
      }
      markModified(talk1OrgSelect);
    });

    talk1OrgCustom.addEventListener("input", (e) => {
      currentAgenda.talk1_org = e.target.value;
      autoPrefillSpeakerRole(1, e.target.value);
      markModified(talk1OrgCustom);
    });

    // Talk 2 Org Selection
    talk2OrgSelect.addEventListener("change", (e) => {
      if (e.target.value === "Custom") {
        talk2OrgCustom.style.display = "inline-block";
        talk2OrgCustom.focus();
        currentAgenda.talk2_org = talk2OrgCustom.value || "Custom";
        autoPrefillSpeakerRole(2, talk2OrgCustom.value);
      } else {
        talk2OrgCustom.style.display = "none";
        currentAgenda.talk2_org = e.target.value;
        autoPrefillSpeakerRole(2, e.target.value);
      }
      markModified(talk2OrgSelect);
    });

    talk2OrgCustom.addEventListener("input", (e) => {
      currentAgenda.talk2_org = e.target.value;
      autoPrefillSpeakerRole(2, e.target.value);
      markModified(talk2OrgCustom);
    });

    // Talk 3 Org Selection
    talk3OrgSelect.addEventListener("change", (e) => {
      if (e.target.value === "Custom") {
        talk3OrgCustom.style.display = "inline-block";
        talk3OrgCustom.focus();
        currentAgenda.talk3_org = talk3OrgCustom.value || "Custom";
        autoPrefillSpeakerRole(3, talk3OrgCustom.value);
      } else {
        talk3OrgCustom.style.display = "none";
        currentAgenda.talk3_org = e.target.value;
        autoPrefillSpeakerRole(3, e.target.value);
      }
      markModified(talk3OrgSelect);
    });

    talk3OrgCustom.addEventListener("input", (e) => {
      currentAgenda.talk3_org = e.target.value;
      autoPrefillSpeakerRole(3, e.target.value);
      markModified(talk3OrgCustom);
    });

    // Date Picker & Calendar Navigation
    datePicker.addEventListener("change", (e) => {
      if (e.target.value) {
        closeCalendarPopover();
        safeChangeDate(e.target.value);
      }
    });

    btnPrev.addEventListener("click", () => {
      const prev = getAdjacentSunday(currentDate, -7);
      safeChangeDate(prev);
    });

    btnNext.addEventListener("click", () => {
      const next = getAdjacentSunday(currentDate, 7);
      safeChangeDate(next);
    });

    // Calendar Popover Triggers
    btnOpenCalendar.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleCalendarPopover();
    });

    btnClosePopover.addEventListener("click", (e) => {
      e.stopPropagation();
      closeCalendarPopover();
    });

    btnPrevMonth.addEventListener("click", (e) => {
      e.stopPropagation();
      popoverDate.setMonth(popoverDate.getMonth() - 1);
      renderPopoverSundays();
    });

    btnNextMonth.addEventListener("click", (e) => {
      e.stopPropagation();
      popoverDate.setMonth(popoverDate.getMonth() + 1);
      renderPopoverSundays();
    });

    btnTriggerNativePicker.addEventListener("click", (e) => {
      e.stopPropagation();
      closeCalendarPopover();
      openFullCalendarModal();
    });

    // Beautiful Full Calendar Modal Controls
    if (btnCloseFullCal) {
      btnCloseFullCal.addEventListener("click", closeFullCalendarModal);
    }

    if (fullCalModal) {
      fullCalModal.addEventListener("click", (e) => {
        if (e.target === fullCalModal) closeFullCalendarModal();
      });
    }

    if (btnCalPrevMonth) {
      btnCalPrevMonth.addEventListener("click", () => {
        fullCalMonth--;
        if (fullCalMonth < 0) {
          fullCalMonth = 11;
          fullCalYear--;
        }
        loadAndRenderFullCalendar();
      });
    }

    if (btnCalNextMonth) {
      btnCalNextMonth.addEventListener("click", () => {
        fullCalMonth++;
        if (fullCalMonth > 11) {
          fullCalMonth = 0;
          fullCalYear++;
        }
        loadAndRenderFullCalendar();
      });
    }

    if (btnCalPrevYear) {
      btnCalPrevYear.addEventListener("click", () => {
        fullCalYear--;
        loadAndRenderFullCalendar();
      });
    }

    if (btnCalNextYear) {
      btnCalNextYear.addEventListener("click", () => {
        fullCalYear++;
        loadAndRenderFullCalendar();
      });
    }

    if (btnCalToday) {
      btnCalToday.addEventListener("click", () => {
        const today = new Date();
        fullCalYear = today.getFullYear();
        fullCalMonth = today.getMonth();
        const m = String(today.getMonth() + 1).padStart(2, "0");
        const d = String(today.getDate()).padStart(2, "0");
        fullCalSelectedDate = `${fullCalYear}-${m}-${d}`;
        loadAndRenderFullCalendar();
      });
    }

    if (calToggleLds) {
      calToggleLds.addEventListener("change", () => {
        renderFullCalendarGrid();
      });
    }

    if (calToggleIndian) {
      calToggleIndian.addEventListener("change", () => {
        renderFullCalendarGrid();
      });
    }

    // Close calendar popover on click outside
    document.addEventListener("click", (e) => {
      if (calendarPopover.classList.contains("open") && !calendarPopover.contains(e.target) && !btnOpenCalendar.contains(e.target)) {
        closeCalendarPopover();
      }
    });

    // WhatsApp Modal
    btnOpenWhatsapp.addEventListener("click", openWhatsAppModal);
    btnCloseModal.addEventListener("click", closeWhatsAppModal);
    whatsappModal.addEventListener("click", (e) => {
      if (e.target === whatsappModal) closeWhatsAppModal();
    });

    presetBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        presetBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        activePreset = btn.dataset.preset;
        refreshWhatsAppPreview();
      });
    });

    reminderSelect.addEventListener("change", () => {
      refreshWhatsAppPreview();
    });

    btnCopyText.addEventListener("click", () => {
      navigator.clipboard.writeText(previewTextarea.value).then(() => {
        showToast("✓ Copied to clipboard!");
      });
    });

    btnShareWhatsapp.addEventListener("click", () => {
      const text = previewTextarea.value;
      if (!text) return;

      // Check if Web Share API is available (Native share on mobile)
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
        navigator.share({
          title: "Ward Sunday Agenda",
          text: text,
        }).catch(() => {
          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
        });
      } else {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
      }
    });

    // Print
    btnPrint.addEventListener("click", () => {
      window.print();
    });

    // Theme Toggle
    btnTheme.addEventListener("click", toggleTheme);

    // Language Toggle
    const btnLang = document.getElementById("btn-lang-toggle");
    if (btnLang) btnLang.addEventListener("click", toggleLanguage);

    // Overall Agenda Spreadsheet Modal
    const btnOverallAgenda = document.getElementById("btn-overall-agenda");
    const overallModal = document.getElementById("overall-agenda-modal");
    const btnCloseOverall = document.getElementById("btn-close-overall-agenda");
    if (btnOverallAgenda) {
      btnOverallAgenda.addEventListener("click", () => openOverallAgenda());
    }
    if (btnCloseOverall) {
      btnCloseOverall.addEventListener("click", () => {
        overallModal.classList.remove("open");
        overallModal.setAttribute("aria-hidden", "true");
      });
    }
    if (overallModal) {
      overallModal.addEventListener("click", (e) => {
        if (e.target === overallModal) {
          overallModal.classList.remove("open");
          overallModal.setAttribute("aria-hidden", "true");
        }
      });
    }
    const btnAgendaPrev = document.getElementById("btn-agenda-sheet-prev");
    const btnAgendaNext = document.getElementById("btn-agenda-sheet-next");
    if (btnAgendaPrev) btnAgendaPrev.addEventListener("click", () => { sheetMonth--; if (sheetMonth < 0) { sheetMonth = 11; sheetYear--; } renderAgendaSheet(); });
    if (btnAgendaNext) btnAgendaNext.addEventListener("click", () => { sheetMonth++; if (sheetMonth > 11) { sheetMonth = 0; sheetYear++; } renderAgendaSheet(); });

    // Auto-fill CFM & FSY Lessons for All Quorums
    const btnAutofillCfm = document.getElementById("btn-autofill-cfm");
    if (btnAutofillCfm) {
      btnAutofillCfm.addEventListener("click", async () => {
        btnAutofillCfm.disabled = true;
        btnAutofillCfm.innerHTML = "<span>⏳ Matching Lessons...</span>";
        try {
          const d = new Date(currentDate + "T00:00:00");
          const year = d.getFullYear();
          const month = d.getMonth() + 1;
          const day = d.getDate();
          const sundayNum = Math.ceil(day / 7);

          // 1. Fetch CFM lesson
          const cfmRes = await fetch(`/api/come-follow-me?year=${year}`);
          const cfmData = await cfmRes.json();
          const lessons = cfmData.lessons || [];
          const match = lessons.find(l => doesDateMatchRangeApp(currentDate, l.date_range, l.year));

          const fullTopic = match && match.scriptures 
            ? `${match.date_range}: “${match.title}” (${match.scriptures})`
            : (match ? `${match.date_range}: “${match.title}”` : "");
          const shortTopic = match ? `${match.date_range}: “${match.title}”` : "";
          const cfmUrl = match ? match.url : "";

          // 2. Fetch FSY lesson for Young Men and Young Women
          const fsyRes = await fetch(`/api/fsy-lessons?year=${year}&month=${month}&sunday=${sundayNum}`);
          let ymLesson = null;
          let ywLesson = null;
          if (fsyRes.ok) {
            const fsyData = await fsyRes.json();
            const fsyLessons = fsyData.lessons || [];
            ymLesson = fsyLessons.find(l => l.organization === "young_men") || fsyLessons.find(l => l.organization === "both");
            ywLesson = fsyLessons.find(l => l.organization === "young_women") || fsyLessons.find(l => l.organization === "both");
          }

          const ymTopic = ymLesson ? ymLesson.title : shortTopic;
          const ymUrl = ymLesson ? ymLesson.url : cfmUrl;
          const ywTopic = ywLesson ? ywLesson.title : shortTopic;
          const ywUrl = ywLesson ? ywLesson.url : cfmUrl;

          // Helper to set DOM value
          const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || "";
          };

          setVal("ss-topic", fullTopic);
          setVal("ss-url", cfmUrl);
          setVal("pri-topic", shortTopic);
          setVal("pri-url", cfmUrl);
          setVal("ym-topic", ymTopic);
          setVal("ym-url", ymUrl);
          setVal("yw-topic", ywTopic);
          setVal("yw-url", ywUrl);

          // Update currentAgenda.classes_json (skip EQ & RS — they manage their own lessons)
          if (!currentAgenda.classes_json) currentAgenda.classes_json = {};
          const c = currentAgenda.classes_json;
          c.sunday_school = { ...(c.sunday_school || {}), topic: fullTopic, url: cfmUrl };
          c.primary = { ...(c.primary || {}), topic: shortTopic, url: cfmUrl };
          c.young_men = { ...(c.young_men || {}), topic: ymTopic, url: ymUrl };
          c.young_women = { ...(c.young_women || {}), topic: ywTopic, url: ywUrl };

          markModified();
          showToast("✓ Auto-filled CFM lesson for Sunday School & Primary, FSY for Youth!");
        } catch (err) {
          console.error("Auto-fill error:", err);
          showToast("Failed to auto-fill classes");
        } finally {
          btnAutofillCfm.disabled = false;
          btnAutofillCfm.innerHTML = "<span>⚡ Auto-Fill CFM & FSY</span>";
        }
      });
    }

    // Leader Login & Settings Modal Listeners
    const btnLoginModal = document.getElementById("btn-login-modal");
    const btnCloseLoginModal = document.getElementById("btn-close-login-modal");
    const btnCancelLogin = document.getElementById("btn-cancel-login");
    const btnSubmitLogin = document.getElementById("btn-submit-login");
    const loginStringInput = document.getElementById("login-string-input");
    const loginModal = document.getElementById("login-modal");

    if (btnLoginModal) btnLoginModal.addEventListener("click", openLoginModal);
    if (btnCloseLoginModal) btnCloseLoginModal.addEventListener("click", closeLoginModal);
    if (btnCancelLogin) btnCancelLogin.addEventListener("click", closeLoginModal);
    if (btnSubmitLogin) btnSubmitLogin.addEventListener("click", handleLoginSubmit);
    if (loginStringInput) {
      loginStringInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") handleLoginSubmit();
      });
    }
    if (loginModal) {
      loginModal.addEventListener("click", (e) => {
        if (e.target === loginModal) closeLoginModal();
      });
    }

    const btnSettingsModal = document.getElementById("btn-settings-modal");
    const btnCloseSettingsModal = document.getElementById("btn-close-settings-modal");
    const settingsModal = document.getElementById("settings-modal");
    const btnAddLeader = document.getElementById("btn-add-leader");

    if (btnSettingsModal) btnSettingsModal.addEventListener("click", openSettingsModal);
    if (btnCloseSettingsModal) btnCloseSettingsModal.addEventListener("click", closeSettingsModal);
    if (settingsModal) {
      settingsModal.addEventListener("click", (e) => {
        if (e.target === settingsModal) closeSettingsModal();
      });
    }
    if (btnAddLeader) {
      btnAddLeader.addEventListener("click", () => {
        window.editAuthUser(0, "", "dowleswaram", "Leader");
      });
    }

    // Settings tab switching
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
  }

  function doesDateMatchRangeApp(dateStr, rangeStr, year) {
    if (!dateStr || !rangeStr) return false;
    const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
    if (!rangeStr.match(/[–\-]/)) {
      const d = new Date(dateStr + "T00:00:00");
      const mName = d.toLocaleDateString("en-US", { month: "long" });
      const day = d.getDate();
      return rangeStr.includes(mName) && rangeStr.includes(String(day));
    }
    const parts = rangeStr.split(/[–\-]/).map(s => s.trim());
    if (parts.length !== 2) return false;
    let m1 = -1, d1 = 0;
    for (let i = 0; i < months.length; i++) {
      if (parts[0].toLowerCase().includes(months[i])) { m1 = i; break; }
    }
    const d1Match = parts[0].match(/\d+/);
    if (d1Match) d1 = parseInt(d1Match[0], 10);
    let m2 = m1, d2 = 0;
    for (let i = 0; i < months.length; i++) {
      if (parts[1].toLowerCase().includes(months[i])) { m2 = i; break; }
    }
    const d2Match = parts[1].match(/\d+/);
    if (d2Match) d2 = parseInt(d2Match[0], 10);
    if (m1 === -1 || !d1 || !d2) return false;
    const yr = year || new Date(dateStr + "T00:00:00").getFullYear();
    let y1 = yr, y2 = yr;
    if (m1 === 11 && m2 === 0) y1 = yr - 1;
    const start = new Date(Date.UTC(y1, m1, d1)).toISOString().split("T")[0];
    const end = new Date(Date.UTC(y2, m2, d2, 23, 59, 59)).toISOString().split("T")[0];
    return dateStr >= start && dateStr <= end;
  }

  /* --------------------------------------------------------------------------
     WhatsApp Modal & Formatter
     -------------------------------------------------------------------------- */
  async function openWhatsAppModal() {
    whatsappModal.classList.add("open");
    populateReminderAssignments();
    await refreshWhatsAppPreview();
  }

  function closeWhatsAppModal() {
    whatsappModal.classList.remove("open");
  }

  function populateReminderAssignments() {
    reminderSelect.innerHTML = "";
    if (!currentAgenda) return;

    const options = [];
    const isConference = currentAgenda.meeting_type === "general_conference" || currentAgenda.meeting_type === "stake_conference";
    const isFast = currentAgenda.meeting_type === "fast_and_testimony";

    if (isConference) {
      const opt = document.createElement("option");
      opt.textContent = "No individual ward assignments (Conference Sunday)";
      reminderSelect.appendChild(opt);
      return;
    }

    if (currentAgenda.opening_prayer_name) {
      options.push({ label: `Opening Prayer: ${currentAgenda.opening_prayer_name}`, role: "Opening Prayer", name: currentAgenda.opening_prayer_name, topic: "" });
    }
    
    if (!isFast) {
      if (currentAgenda.talk1_speaker) {
        options.push({ label: `1st Talk (${currentAgenda.talk1_org || "Bishopric"}): ${currentAgenda.talk1_speaker}`, role: `1st Talk (${currentAgenda.talk1_org || "Bishopric"})`, name: currentAgenda.talk1_speaker, topic: currentAgenda.talk1_title });
      }
      if (currentAgenda.talk2_speaker) {
        options.push({ label: `2nd Talk (${currentAgenda.talk2_org || "Quorum"}): ${currentAgenda.talk2_speaker}`, role: `2nd Talk (${currentAgenda.talk2_org || "Quorum"})`, name: currentAgenda.talk2_speaker, topic: currentAgenda.talk2_title, url: currentAgenda.talk2_url });
      }
      if (currentAgenda.talk3_speaker) {
        const orgSuffix = currentAgenda.talk3_org && currentAgenda.talk3_org !== "Member" ? ` (${currentAgenda.talk3_org})` : "";
        options.push({
          label: `3rd Talk${orgSuffix}: ${currentAgenda.talk3_speaker}`,
          role: `3rd Talk${orgSuffix}`,
          name: currentAgenda.talk3_speaker,
          topic: currentAgenda.talk3_title,
          url: currentAgenda.talk3_url,
        });
      }
    }

    if (currentAgenda.closing_prayer_name) {
      options.push({ label: `Closing Prayer: ${currentAgenda.closing_prayer_name}`, role: "Closing Prayer", name: currentAgenda.closing_prayer_name, topic: "" });
    }

    // Classes
    const c = currentAgenda.classes_json || {};
    if (c.sunday_school?.teacher) {
      options.push({ label: `Sunday School Teacher: ${c.sunday_school.teacher}`, role: "Sunday School Teacher", name: c.sunday_school.teacher, topic: c.sunday_school.topic, url: c.sunday_school.url });
    }
    if (c.elders_quorum?.teacher) {
      options.push({ label: `Elders Quorum Teacher: ${c.elders_quorum.teacher}`, role: "Elders Quorum Teacher", name: c.elders_quorum.teacher, topic: c.elders_quorum.topic, url: c.elders_quorum.url });
    }
    if (c.relief_society?.teacher) {
      options.push({ label: `Relief Society Teacher: ${c.relief_society.teacher}`, role: "Relief Society Teacher", name: c.relief_society.teacher, topic: c.relief_society.topic, url: c.relief_society.url });
    }
    if (c.young_men?.teacher) {
      options.push({ label: `Young Men Leader: ${c.young_men.teacher}`, role: "Young Men Leader", name: c.young_men.teacher, topic: c.young_men.topic });
    }
    if (c.young_women?.teacher) {
      options.push({ label: `Young Women Leader: ${c.young_women.teacher}`, role: "Young Women Leader", name: c.young_women.teacher, topic: c.young_women.topic });
    }
    if (c.primary?.teacher) {
      options.push({ label: `Primary Teacher: ${c.primary.teacher}`, role: "Primary Teacher", name: c.primary.teacher, topic: c.primary.topic });
    }

    if (options.length === 0) {
      const opt = document.createElement("option");
      opt.textContent = "No assigned names yet (type names first)";
      reminderSelect.appendChild(opt);
    } else {
      for (const item of options) {
        const opt = document.createElement("option");
        opt.value = JSON.stringify(item);
        opt.textContent = item.label;
        reminderSelect.appendChild(opt);
      }
    }
  }

  async function refreshWhatsAppPreview() {
    if (activePreset === "reminder") {
      reminderOptions.style.display = "block";
    } else {
      reminderOptions.style.display = "none";
    }

    let payload = {
      date: currentDate,
      preset: activePreset,
    };

    if (activePreset === "reminder" && reminderSelect.value) {
      try {
        const sel = JSON.parse(reminderSelect.value);
        payload.roleOrClass = sel.role;
        payload.name = sel.name;
        payload.topic = sel.topic;
        payload.url = sel.url;
      } catch (e) {}
    }

    try {
      const res = await fetch("/api/share/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        previewTextarea.value = json.text;
      }
    } catch (err) {
      console.error("Preview generation error:", err);
    }
  }

  /* --------------------------------------------------------------------------
     Talks Order Highlight
     -------------------------------------------------------------------------- */
  function highlightActiveSundayRule(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const day = new Date(y, m - 1, d, 12, 0, 0).getDate();
    const weekNum = Math.min(5, Math.ceil(day / 7));

    const rules = {
      1: "1st Sunday: Testimonies (Fast & Testimony)",
      2: "2nd Sunday: Elders Quorum",
      3: "3rd Sunday: Relief Society",
      4: "4th Sunday: Elders Quorum",
      5: "5th Sunday: Bishopric",
    };

    currentRotationText.textContent = rules[weekNum] || "General Agenda";

    const items = orderRulesList.querySelectorAll(".order-item");
    items.forEach((item) => {
      if (Number(item.dataset.week) === weekNum) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  }

  /* --------------------------------------------------------------------------
     Mobile Tabs Switcher
     -------------------------------------------------------------------------- */
  function setupMobileTabs() {
    const tabBtns = document.querySelectorAll(".mobile-tabs .tab-btn");
    const sacramentCard = document.getElementById("panel-sacrament");
    const hymnsCard = document.getElementById("panel-hymns");
    const orderCard = document.getElementById("panel-order");
    const classesCard = document.getElementById("panel-classes");

    function updateMobileView(tab) {
      currentTab = tab;
      tabBtns.forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));

      // Remove active-tab from all
      [sacramentCard, hymnsCard, orderCard, classesCard].forEach((el) => {
        el.classList.remove("active-tab");
      });

      if (tab === "tab-sacrament") {
        sacramentCard.classList.add("active-tab");
        hymnsCard.classList.add("active-tab");
      } else if (tab === "tab-classes") {
        classesCard.classList.add("active-tab");
      } else if (tab === "tab-order") {
        orderCard.classList.add("active-tab");
      }
    }

    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        updateMobileView(btn.dataset.tab);
      });
    });

    // Default mobile state
    if (window.innerWidth <= 768) {
      updateMobileView("tab-sacrament");
    }
  }

  /* --------------------------------------------------------------------------
     Autocomplete Suggestions
     -------------------------------------------------------------------------- */
  async function refreshAutocompleteSuggestions() {
    try {
      const [namesRes, topicsRes] = await Promise.all([
        fetch("/api/autocomplete?category=name"),
        fetch("/api/autocomplete?category=topic"),
      ]);

      const namesJson = await namesRes.json();
      const topicsJson = await topicsRes.json();

      const namesList = document.getElementById("names-datalist");
      const topicsList = document.getElementById("topics-datalist");

      if (namesJson.suggestions) {
        namesList.innerHTML = namesJson.suggestions
          .map((n) => `<option value="${escapeHtml(n)}">`)
          .join("");
      }

      if (topicsJson.suggestions) {
        topicsList.innerHTML = topicsJson.suggestions
          .map((t) => `<option value="${escapeHtml(t)}">`)
          .join("");
      }
    } catch (e) {}
  }

  /* --------------------------------------------------------------------------
     Theme Management
     -------------------------------------------------------------------------- */
  function initTheme() {
    const saved = localStorage.getItem("ward_agenda_theme");
    const themeLabel = document.getElementById("theme-label");
    if (saved === "light") {
      document.body.className = "theme-light";
      themeIcon.textContent = "☀️";
      if (themeLabel) themeLabel.textContent = "Day";
    } else {
      document.body.className = "theme-dark";
      themeIcon.textContent = "🌙";
      if (themeLabel) themeLabel.textContent = "Night";
    }
  }

  function toggleTheme() {
    const themeLabel = document.getElementById("theme-label");
    if (document.body.classList.contains("theme-dark")) {
      document.body.className = "theme-light";
      themeIcon.textContent = "☀️";
      if (themeLabel) themeLabel.textContent = "Day";
      localStorage.setItem("ward_agenda_theme", "light");
    } else {
      document.body.className = "theme-dark";
      themeIcon.textContent = "🌙";
      if (themeLabel) themeLabel.textContent = "Night";
      localStorage.setItem("ward_agenda_theme", "dark");
    }
  }

  /* --------------------------------------------------------------------------
     Language Toggle (Telugu / English)
     -------------------------------------------------------------------------- */
  function initLanguage() {
    const saved = localStorage.getItem("ward_agenda_lang") || "en";
    applyLanguage(saved);
  }

  function applyLanguage(lang) {
    const langIcon = document.getElementById("lang-icon");
    const langLabel = document.getElementById("lang-label");
    document.documentElement.setAttribute("data-lang", lang);
    localStorage.setItem("ward_agenda_lang", lang);
    if (window.i18n) window.i18n.setLanguage(lang);
    if (lang === "te") {
      if (langIcon) langIcon.textContent = "EN";
      if (langLabel) langLabel.textContent = "English";
    } else {
      if (langIcon) langIcon.textContent = "తె";
      if (langLabel) langLabel.textContent = "Telugu";
    }
  }

  function toggleLanguage() {
    const current = localStorage.getItem("ward_agenda_lang") || "en";
    applyLanguage(current === "en" ? "te" : "en");
  }

  /* --------------------------------------------------------------------------
     Leader Login & Settings Logic
     -------------------------------------------------------------------------- */
  let currentUser = null;
  try {
    const savedUser = localStorage.getItem("ward_auth_user");
    if (savedUser) currentUser = JSON.parse(savedUser);
  } catch (e) {}

  function updateAuthUI() {
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

  function openLoginModal() {
    const modal = document.getElementById("login-modal");
    if (!modal) return;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    const inp = document.getElementById("login-string-input");
    if (inp) {
      inp.value = currentUser ? `${currentUser.name} dowleswaram` : "";
      setTimeout(() => inp.focus(), 150);
    }
  }

  function closeLoginModal() {
    const modal = document.getElementById("login-modal");
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }

  async function handleLoginSubmit() {
    const inp = document.getElementById("login-string-input");
    if (!inp) return;
    const val = inp.value.trim();
    if (!val) {
      showToast("Please enter your name and passkey", "error");
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
      updateAuthUI();
      closeLoginModal();
      showToast(`✓ Welcome, ${currentUser.name}! Editing rights unlocked.`);
    } catch (err) {
      showToast("Error connecting to auth service", "error");
    }
  }

  function openSettingsModal() {
    const modal = document.getElementById("settings-modal");
    if (!modal) return;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    loadSettingsUsers();
  }

  function closeSettingsModal() {
    const modal = document.getElementById("settings-modal");
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }

  async function loadSettingsUsers() {
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
    const newName = prompt("Leader Name:", name || "");
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
        loadSettingsUsers();
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
        loadSettingsUsers();
      }
    } catch (e) {
      showToast("Error removing leader", "error");
    }
  };

  /* --------------------------------------------------------------------------
     Meeting Type & Quorum Controls
     -------------------------------------------------------------------------- */
  function applyMeetingTypeUI(meetingType) {
    meetingTypeBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.type === meetingType);
    });

    if (meetingType === "general_conference") {
      conferenceCard.style.display = "block";
      wardMeetingTopGrid.style.display = "none";
      panelClasses.style.display = "none";
      confIcon.textContent = "📡";
      confMainTitle.textContent = "General Conference Sunday";
      confTypeBadge.textContent = "Worldwide Broadcast";
      confTypeBadge.className = "pill-badge pill-blue";
      confNoticeText.textContent = "Notice: General Conference worldwide broadcast. No local ward sacrament meeting or 2nd hour classes.";
    } else if (meetingType === "stake_conference") {
      conferenceCard.style.display = "block";
      wardMeetingTopGrid.style.display = "none";
      panelClasses.style.display = "none";
      confIcon.textContent = "🏛️";
      confMainTitle.textContent = "Stake Conference Sunday";
      confTypeBadge.textContent = "Stake Center Meeting";
      confTypeBadge.className = "pill-badge pill-purple";
      confNoticeText.textContent = "Notice: All ward members gather at the Stake Center for Stake Conference. No local ward meetings.";
    } else if (meetingType === "fast_and_testimony") {
      conferenceCard.style.display = "none";
      wardMeetingTopGrid.style.display = "grid";
      panelClasses.style.display = "block";
      fastTestimonyBanner.style.display = "flex";
      talksGroup.classList.add("hidden-on-fast");
      sacramentCardTitle.textContent = "Fast & Testimony Sacrament Meeting";
      sacramentCardBadge.textContent = "Fast Sunday";
      sacramentCardBadge.className = "pill-badge pill-gold";
    } else {
      // Standard
      conferenceCard.style.display = "none";
      wardMeetingTopGrid.style.display = "grid";
      panelClasses.style.display = "block";
      fastTestimonyBanner.style.display = "none";
      talksGroup.classList.remove("hidden-on-fast");
      sacramentCardTitle.textContent = "Sacrament Meeting";
      sacramentCardBadge.textContent = "1st Hour";
      sacramentCardBadge.className = "pill-badge pill-amber";
    }
  }

  function setMeetingType(type) {
    if (!currentAgenda) return;
    currentAgenda.meeting_type = type;

    if (type === "fast_and_testimony") {
      if (!currentAgenda.week_label.includes("Fast & Testimony")) {
        currentAgenda.week_label = `${currentAgenda.week_label} - Fast & Testimony`;
      }
    } else if (type === "general_conference") {
      currentAgenda.week_label = "General Conference";
      if (!currentAgenda.conference_title) currentAgenda.conference_title = "General Conference Worldwide Broadcast";
      if (!currentAgenda.conference_url) currentAgenda.conference_url = "https://www.churchofjesuschrist.org/general-conference";
    } else if (type === "stake_conference") {
      currentAgenda.week_label = "Stake Conference";
      if (!currentAgenda.conference_title) currentAgenda.conference_title = "Stake Conference at Stake Center";
    } else {
      // Revert label if needed
      currentAgenda.week_label = currentAgenda.week_label.replace(" - Fast & Testimony", "");
    }

    weekPill.textContent = currentAgenda.week_label;
    applyMeetingTypeUI(type);
    scheduleAutoSave();
  }

  function renderOrgSelector(selectEl, customInputEl, currentVal) {
    let matched = false;
    for (const opt of selectEl.options) {
      if (opt.value === currentVal) {
        selectEl.value = currentVal;
        matched = true;
        break;
      }
    }

    if (matched && currentVal !== "Custom") {
      customInputEl.style.display = "none";
    } else {
      selectEl.value = "Custom";
      customInputEl.style.display = "inline-block";
      customInputEl.value = currentVal === "Custom" ? "" : (currentVal || "");
    }
  }

  /* --------------------------------------------------------------------------
     Calendar Popover
     -------------------------------------------------------------------------- */
  function toggleCalendarPopover() {
    if (calendarPopover.classList.contains("open")) {
      closeCalendarPopover();
    } else {
      openCalendarPopover();
    }
  }

  function openCalendarPopover() {
    const [y, m, d] = currentDate.split("-").map(Number);
    popoverDate = new Date(y, m - 1, d, 12, 0, 0);
    renderPopoverSundays();
    calendarPopover.classList.add("open");
    btnOpenCalendar.setAttribute("aria-expanded", "true");
  }

  function closeCalendarPopover() {
    calendarPopover.classList.remove("open");
    btnOpenCalendar.setAttribute("aria-expanded", "false");
  }

  function renderPopoverSundays() {
    const year = popoverDate.getFullYear();
    const month = popoverDate.getMonth();

    // Month label (e.g. "September 2026")
    popoverMonthLabel.textContent = popoverDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    // Find all Sundays in this month
    popoverSundaysList.innerHTML = "";
    const numDays = new Date(year, month + 1, 0).getDate();
    const sundays = [];

    for (let day = 1; day <= numDays; day++) {
      const d = new Date(year, month, day, 12, 0, 0);
      if (d.getDay() === 0) { // 0 = Sunday
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
      if (s.iso === currentDate) {
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
        safeChangeDate(s.iso);
      });

      popoverSundaysList.appendChild(btn);
    }
  }

  /* --------------------------------------------------------------------------
     Full Calendar & Celebrations Modal
     -------------------------------------------------------------------------- */
  async function openFullCalendarModal() {
    const [y, m, d] = currentDate.split("-").map(Number);
    fullCalYear = y;
    fullCalMonth = m - 1;
    fullCalSelectedDate = currentDate;

    fullCalModal.classList.add("open");
    await loadAndRenderFullCalendar();
    selectFullCalDate(fullCalSelectedDate);
  }

  function closeFullCalendarModal() {
    fullCalModal.classList.remove("open");
  }

  async function loadAndRenderFullCalendar() {
    // Check if we have holidays cached for this year
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
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    fullCalMonthYear.textContent = `${monthNames[fullCalMonth]} ${fullCalYear}`;

    calDaysGrid.innerHTML = "";

    const holidays = fullCalHolidays[fullCalYear] || [];
    const showLds = calToggleLds ? calToggleLds.checked : true;
    const showIndian = calToggleIndian ? calToggleIndian.checked : true;

    // Filter active holidays
    const activeHolidays = holidays.filter((h) => {
      if (h.category === "lds" && !showLds) return false;
      if (h.category === "indian" && !showIndian) return false;
      return true;
    });

    // Group holidays by date
    const holidaysByDate = {};
    for (const h of activeHolidays) {
      if (!holidaysByDate[h.date]) holidaysByDate[h.date] = [];
      holidaysByDate[h.date].push(h);
    }

    // Grid starts on Sunday on or before 1st of fullCalMonth
    const firstOfMonth = new Date(fullCalYear, fullCalMonth, 1, 12, 0, 0);
    const dayOfWeek = firstOfMonth.getDay(); // 0 = Sunday
    const startDate = new Date(firstOfMonth);
    startDate.setDate(firstOfMonth.getDate() - dayOfWeek);

    const todayStr = new Date().toISOString().slice(0, 10);

    // 42 cells (6 rows of 7 days)
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

      // Top bar with day number and Sunday indicator
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

      // Events container
      const dayEvents = holidaysByDate[dateStr] || [];
      if (dayEvents.length > 0) {
        const eventsWrap = document.createElement("div");
        eventsWrap.className = "cal-events-list";

        // Display up to 2 pills per cell
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

      // Click to select day and view full details
      cell.addEventListener("click", () => {
        selectFullCalDate(dateStr);
      });

      // Double click on Sunday loads agenda directly
      if (isSunday) {
        cell.addEventListener("dblclick", () => {
          loadAgenda(dateStr);
          closeFullCalendarModal();
          showToast(`Loaded Sunday ${formatDisplayDate(dateStr)}`);
        });
      }

      calDaysGrid.appendChild(cell);
    }
  }

  function selectFullCalDate(dateStr) {
    fullCalSelectedDate = dateStr;

    // Update cell highlights
    calDaysGrid.querySelectorAll(".cal-day-cell").forEach((c) => {
      c.classList.toggle("is-selected", c.dataset.date === dateStr);
    });

    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d, 12, 0, 0);
    const isSunday = dateObj.getDay() === 0;

    // Display formatted title
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
      calDetailsBadge.textContent = rotationRules[weekNum] || `${weekNum}th Sunday`;
      calDetailsBadge.className = "pill-badge pill-amber";
      calDetailsBadge.style.display = "inline-flex";

      btnCalJumpAgenda.innerHTML = "<span>⛪ Open This Sunday's Agenda</span>";
      btnCalJumpAgenda.style.display = "inline-flex";
      btnCalJumpAgenda.onclick = () => {
        safeChangeDate(dateStr);
        closeFullCalendarModal();
        showToast(`Loaded ${formatDisplayDate(dateStr)}`);
      };
    } else {
      calDetailsBadge.style.display = "none";
      // Find Sunday of this week (previous Sunday)
      const prevSunday = new Date(dateObj);
      prevSunday.setDate(dateObj.getDate() - dateObj.getDay());
      const psy = prevSunday.getFullYear();
      const psm = String(prevSunday.getMonth() + 1).padStart(2, "0");
      const psd = String(prevSunday.getDate()).padStart(2, "0");
      const sundayStr = `${psy}-${psm}-${psd}`;

      btnCalJumpAgenda.innerHTML = `<span>➡️ Go to Sunday (${formatDisplayDate(sundayStr)})</span>`;
      btnCalJumpAgenda.style.display = "inline-flex";
      btnCalJumpAgenda.onclick = () => {
        safeChangeDate(sundayStr);
        closeFullCalendarModal();
        showToast(`Loaded Sunday ${formatDisplayDate(sundayStr)}`);
      };
    }

    // List all holidays and celebrations for this date
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
        ? "Regular ward Sunday meeting. Click 'Open This Sunday's Agenda' above to view and plan assignments."
        : "No special celebrations on this date.";
      calDetailsEventsList.appendChild(empty);
    } else {
      for (const ev of dayHolidays) {
        const item = document.createElement("div");
        item.className = "cal-event-detail-item";

        const icon = document.createElement("span");
        icon.className = "cal-event-icon";
        icon.textContent = ev.icon;
        item.appendChild(icon);

        const info = document.createElement("div");
        info.className = "cal-event-info";

        const topRow = document.createElement("div");
        topRow.style.display = "flex";
        topRow.style.alignItems = "center";
        topRow.style.gap = "6px";

        const name = document.createElement("span");
        name.className = "cal-event-name";
        name.textContent = ev.name;
        topRow.appendChild(name);

        const catBadge = document.createElement("span");
        catBadge.className = `pill-badge ${ev.category === "lds" ? "pill-lds" : "pill-hindu"}`;
        catBadge.style.fontSize = "0.7rem";
        catBadge.textContent = ev.category === "lds" ? "⛪ LDS" : "🪔 Indian / Hindu";
        topRow.appendChild(catBadge);

        info.appendChild(topRow);

        if (ev.description) {
          const desc = document.createElement("span");
          desc.className = "cal-event-desc";
          desc.textContent = ev.description;
          info.appendChild(desc);
        }

        item.appendChild(info);
        calDetailsEventsList.appendChild(item);
      }
    }
  }

  /* --------------------------------------------------------------------------
     Helpers
     -------------------------------------------------------------------------- */
  function getAdjacentSunday(dateStr, offsetDays) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d, 12, 0, 0);
    date.setDate(date.getDate() + offsetDays);
    const ny = date.getFullYear();
    const nm = String(date.getMonth() + 1).padStart(2, "0");
    const nd = String(date.getDate()).padStart(2, "0");
    return `${ny}-${nm}-${nd}`;
  }

  function formatDisplayDate(dateStr) {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-").map(Number);
    const day = String(d).padStart(2, "0");
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[m - 1] || String(m).padStart(2, "0");
    return `${day} ${month} ${y}`;
  }

  function formatNumericDate(dateStr) {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-").map(Number);
    const day = String(d).padStart(2, "0");
    const month = String(m).padStart(2, "0");
    return `${day}/${month}/${y}`;
  }

  function getNestedValue(obj, path) {
    return path.split(".").reduce((curr, key) => (curr ? curr[key] : undefined), obj);
  }

  function setNestedValue(obj, path, value) {
    const keys = path.split(".");
    let curr = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!curr[keys[i]]) curr[keys[i]] = {};
      curr = curr[keys[i]];
    }
    curr[keys[keys.length - 1]] = value;
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 2400);
  }

  function escapeHtml(str) {
    return str.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function escapeJs(str) {
    if (!str) return "";
    return String(str)
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, " ");
  }

  // ── Overall Agenda Spreadsheet State ──
  let sheetYear = new Date().getFullYear();
  let sheetMonth = new Date().getMonth();

  async function openOverallAgenda() {
    const now = new Date(currentDate + "T00:00:00");
    sheetYear = now.getFullYear();
    sheetMonth = now.getMonth();
    const modal = document.getElementById("overall-agenda-modal");
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    await renderAgendaSheet();
  }

  async function renderAgendaSheet() {
    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
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
    const agendas = await Promise.all(sundays.map(async s => {
      const iso = `${s.getFullYear()}-${String(s.getMonth()+1).padStart(2,'0')}-${String(s.getDate()).padStart(2,'0')}`;
      try {
        const res = await fetch(`/api/agenda/${iso}`);
        const json = await res.json();
        return { date: iso, data: json.data || json.agenda || {} };
      } catch { return { date: iso, data: {} }; }
    }));

    // Build table
    const thead = document.getElementById("agenda-sheet-thead");
    const tbody = document.getElementById("agenda-sheet-tbody");

    // Header row: Field | Sunday 1 | Sunday 2 ...
    const headerRow = document.createElement("tr");
    const fieldTh = document.createElement("th");
    fieldTh.textContent = "Field";
    fieldTh.className = "sheet-th-field";
    headerRow.appendChild(fieldTh);
    agendas.forEach(a => {
      const th = document.createElement("th");
      const [y,m,day] = a.date.split("-");
      const isActive = a.date === currentDate;
      th.textContent = `${day}/${m}/${y}`;
      th.className = `sheet-th-date${isActive ? " active-sheet-date" : ""}`;
      th.title = `Click to load agenda for ${day}/${m}/${y}`;
      th.style.cursor = "pointer";
      th.addEventListener("click", () => {
        safeChangeDate(a.date);
        const modal = document.getElementById("overall-agenda-modal");
        if (modal) {
          modal.classList.remove("open");
          modal.setAttribute("aria-hidden", "true");
        }
      });
      headerRow.appendChild(th);
    });
    thead.innerHTML = "";
    thead.appendChild(headerRow);

    // Row definitions
    const rows = [
      { label: "Week",              get: a => a.week_label || "" },
      { label: "Meeting Type",      get: a => a.meeting_type?.replace(/_/g," ") || "Standard" },
      { label: "Opening Prayer",    get: a => a.opening_prayer_name || "" },
      { label: "Opening Hymn",      get: a => a.hymn_opening || "" },
      { label: "Sacrament Hymn",    get: a => a.hymn_sacrament || "" },
      { label: "1st Talk",          get: a => [a.talk1_title, a.talk1_speaker].filter(Boolean).join(" — ") },
      { label: "2nd Talk",          get: a => [a.talk2_title, a.talk2_speaker].filter(Boolean).join(" — ") },
      { label: "Interlude Hymn",    get: a => a.hymn_interlude || "" },
      { label: "3rd Talk",          get: a => [a.talk3_title, a.talk3_speaker].filter(Boolean).join(" — ") },
      { label: "Closing Hymn",      get: a => a.hymn_closing || "" },
      { label: "Closing Prayer",    get: a => a.closing_prayer_name || "" },
      { label: "Sunday School",     get: a => a.classes_json?.sunday_school?.topic || "", group: true },
      { label: "SS Teacher",        get: a => a.classes_json?.sunday_school?.teacher || "" },
      { label: "Elders Quorum",     get: a => a.classes_json?.elders_quorum?.topic || "", group: true },
      { label: "EQ Teacher",        get: a => a.classes_json?.elders_quorum?.teacher || "" },
      { label: "Relief Society",    get: a => a.classes_json?.relief_society?.topic || "", group: true },
      { label: "RS Teacher",        get: a => a.classes_json?.relief_society?.teacher || "" },
      { label: "Young Men",         get: a => a.classes_json?.young_men?.topic || "", group: true },
      { label: "YM Leader",         get: a => a.classes_json?.young_men?.teacher || "" },
      { label: "Young Women",       get: a => a.classes_json?.young_women?.topic || "", group: true },
      { label: "YW Leader",         get: a => a.classes_json?.young_women?.teacher || "" },
      { label: "Primary",           get: a => a.classes_json?.primary?.topic || "", group: true },
      { label: "Primary Teacher",   get: a => a.classes_json?.primary?.teacher || "" },
    ];

    tbody.innerHTML = "";
    rows.forEach(row => {
      const tr = document.createElement("tr");
      if (row.group) tr.classList.add("sheet-row-group");
      const th = document.createElement("th");
      th.textContent = row.label;
      th.className = "sheet-row-label";
      tr.appendChild(th);
      agendas.forEach(a => {
        const td = document.createElement("td");
        td.textContent = row.get(a.data);
        td.className = "sheet-cell";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  // Run on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
