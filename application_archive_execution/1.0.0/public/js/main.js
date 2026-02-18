// public/js/main.js
(() => {
  const APP_VERSION = "1.0.0"; // OFFICIAL RELEASE

  // Stable keys
  const META_VERSION_KEY = "calc_app_version";
  const STORAGE_SETTINGS = "calc_settings";
  const STORAGE_HISTORY  = "calc_history";
  const STORAGE_WELCOME  = "calc_seen_welcome";

  // Older keys (best-effort migrate)
  const OLD_KEYS = [
    { settings: "calc_v051_settings", history: "calc_v051_history", welcome: "calc_v051_seen_welcome" },
    { settings: "calc_v050_settings", history: "calc_v050_history", welcome: "calc_v050_seen_welcome" }
  ];

  // Dialog timings
  const DIALOG_ANIM_MS = 140;
  const DIALOG_GAP_MS  = 60;
  const CHAIN_WAIT_MS  = 140;   // small gap between chained dialogs
  const PANEL_SWITCH_GAP_MS = 60;

  const WHATS_NEW_HTML = window.CALC_APP?.WHATS_NEW_HTML || "";
  const NOTICE_HTML    = window.CALC_APP?.NOTICE_HTML || "";
  const INFINITY_HTML  = window.CALC_APP?.INFINITY_HTML || "";

  // ===== Elements =====
  const pageRoot = document.getElementById("pageRoot");
  const introOverlay = document.getElementById("introOverlay");

  const prevEl   = document.getElementById("prev");
  const screenEl = document.getElementById("screen");
  const keysEl   = document.querySelector(".keys");
  const backdrop = document.getElementById("backdrop");

  const menuBtn    = document.getElementById("menuBtn");
  const historyBtn = document.getElementById("historyBtn");

  const settingsSide  = document.getElementById("settingsSide");
  const historySide   = document.getElementById("historySide");
  const settingsClose = document.getElementById("settingsClose");
  const historyClose  = document.getElementById("historyClose");

  const optVibrate  = document.getElementById("optVibrate");
  const optAutoFont = document.getElementById("optAutoFont");
  const optSounds   = document.getElementById("optSounds"); // NEW
  const optLight    = document.getElementById("optLight");  // hidden but kept

  const whatsNewBtn       = document.getElementById("whatsNewBtn");
  const resetSettingsBtn  = document.getElementById("resetSettingsBtn");

  const savedDataVal = document.getElementById("savedDataVal");
  const cacheDataVal = document.getElementById("cacheDataVal");

  const historyListSide    = document.getElementById("historyListSide");
  const clearHistorySide   = document.getElementById("clearHistorySide");
  const clearCacheSide     = document.getElementById("clearCacheSide");

  const historyInline      = document.getElementById("historyInline");
  const historyListInline  = document.getElementById("historyListInline");
  const clearHistoryInline = document.getElementById("clearHistoryInline");
  const clearCacheInline   = document.getElementById("clearCacheInline");

  const dialogRoot = document.getElementById("dialogRoot");
  const dialogBox  = document.getElementById("dialogBox");
  const dlgTitle   = document.getElementById("dlgTitle");
  const dlgBody    = document.getElementById("dlgBody");
  const dlgActions = document.getElementById("dlgActions");

  // ===== Math helpers =====
  const M = window.CALC_APP?.math || {};
  const sanitize = M.sanitize || ((s) => String(s).replace(/[^0-9+\-*/().%]/g, ""));
  const safeEvaluate = M.safeEvaluate || (() => { throw new Error("math missing"); });
  const unmatchedOpenParens = M.unmatchedOpenParens || (() => 0);
  const toSciNoPlus = M.toSciNoPlus || ((n) => String(n));
  const shouldUseSci = M.shouldUseSci || (() => false);

  // ===== Version safety =====
  const upgradeState = handleVersionSafety(); // { upgraded:boolean, firstInstall:boolean }

  // ===== Settings/History =====
  const defaultSettings = { vibration: false, autoFont: true, lightMode: false, sounds: true };
  let settings = loadSettings();
  let history = loadHistory();

  // Force dark always
  settings.lightMode = false;
  saveSettings();
  optLight.checked = false;
  document.body.classList.remove("light");

  // ===== State =====
  let exprRaw = "";
  let exprDisp = "";

  let lastWasEquals = false;
  let lastResultDisp = "";
  let lastResultIsSci = false;

  // panel: none | settings | history
  let panel = "none";

  // ===== Helpers =====
  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

  function isLandscape() {
    return window.matchMedia && window.matchMedia("(orientation: landscape)").matches;
  }

  function setPrev(text) {
    if (!text) {
      prevEl.textContent = "--";
      prevEl.classList.add("placeholder");
      prevEl.setAttribute("aria-hidden", "true");
      return;
    }
    prevEl.textContent = text;
    prevEl.classList.remove("placeholder");
    prevEl.setAttribute("aria-hidden", "false");
  }

  function setScreen(text) {
    screenEl.textContent = text || "0";
    if (settings.autoFont) autoFitFont();
  }

  function autoFitFont() {
    const len = (screenEl.textContent || "").length;
    const base = isLandscape() ? 48 : 40;

    if (len <= 10) screenEl.style.fontSize = `${base}px`;
    else if (len <= 14) screenEl.style.fontSize = `${Math.max(base - 6, 22)}px`;
    else if (len <= 20) screenEl.style.fontSize = `${Math.max(base - 14, 18)}px`;
    else screenEl.style.fontSize = `16px`;
  }

  function vibrate(ms = 10) {
    if (!settings.vibration) return;
    if (navigator.vibrate) navigator.vibrate(ms);
  }

  // ===== 1.0.0: Click Sound (overlapping) =====
  const CLICK_SOUND_URL = "assets/sounds/click.ogg";
  let audioCtx = null;
  let clickBuf = null;
  let soundLoading = false;

  async function ensureAudioReady() {
    if (!settings.sounds) return false;

    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;

    try {
      if (!audioCtx) audioCtx = new Ctx();

      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      if (clickBuf || soundLoading) return true;

      soundLoading = true;
      const res = await fetch(CLICK_SOUND_URL, { cache: "force-cache" });
      const arr = await res.arrayBuffer();
      clickBuf = await audioCtx.decodeAudioData(arr);
      soundLoading = false;

      return true;
    } catch {
      soundLoading = false;
      return false;
    }
  }

  function playClickSound() {
    if (!settings.sounds) return;

    // WebAudio (best)
    if (audioCtx && clickBuf && audioCtx.state !== "closed") {
      try {
        const src = audioCtx.createBufferSource();
        const gain = audioCtx.createGain();
        gain.gain.value = 0.35;

        src.buffer = clickBuf;
        src.connect(gain);
        gain.connect(audioCtx.destination);
        src.start(0);
        return;
      } catch {}
    }

    // Fallback: HTMLAudio (still overlaps if new instance)
    try {
      const a = new Audio(CLICK_SOUND_URL);
      a.volume = 0.35;
      a.play().catch(() => {});
    } catch {}
  }

  async function tapFX(ms = 10) {
    vibrate(ms);
    await ensureAudioReady();
    playClickSound();
  }

  // ===== Ripple (multi-touch safe) =====
  function spawnRipple(target, clientX, clientY) {
    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.6;

    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.width = ripple.style.height = `${size}px`;

    const x = clientX - rect.left - size / 2;
    const y = clientY - rect.top - size / 2;
    ripple.style.left = `${x}px`;
    ripple.style.top  = `${y}px`;

    target.appendChild(ripple);

    // keep it clean if user spam taps
    const all = target.querySelectorAll(".ripple");
    if (all.length > 6) {
      for (let i = 0; i < all.length - 6; i++) all[i].remove();
    }

    ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
  }

  document.addEventListener("pointerdown", (e) => {
    const t = e.target.closest(".ripple-target");
    if (!t) return;
    spawnRipple(t, e.clientX, e.clientY);
  }, { passive:true });

  // ===== LocalStorage =====
  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_SETTINGS);
      if (!raw) return { ...defaultSettings };
      return { ...defaultSettings, ...JSON.parse(raw) };
    } catch {
      return { ...defaultSettings };
    }
  }

  function saveSettings() {
    localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings));
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_HISTORY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.slice(0, 200) : [];
    } catch {
      return [];
    }
  }

  function saveHistory() {
    localStorage.setItem(STORAGE_HISTORY, JSON.stringify(history));
  }

  // ===== Version compare =====
  function compareVersions(a, b) {
    const pa = String(a).split(".").map(n => parseInt(n, 10) || 0);
    const pb = String(b).split(".").map(n => parseInt(n, 10) || 0);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
      const da = pa[i] ?? 0;
      const db = pb[i] ?? 0;
      if (da > db) return 1;
      if (da < db) return -1;
    }
    return 0;
  }

  function handleVersionSafety() {
    let upgraded = false;
    let firstInstall = false;

    const stored = localStorage.getItem(META_VERSION_KEY);

    if (!stored) {
      firstInstall = true;
      localStorage.setItem(META_VERSION_KEY, APP_VERSION);
      migrateOldKeysIfNeeded();
      return { upgraded, firstInstall };
    }

    const cmp = compareVersions(APP_VERSION, stored);
    if (cmp > 0) {
      upgraded = true;
      backupStableData(stored);
      migrateOldKeysIfNeeded();
      localStorage.setItem(META_VERSION_KEY, APP_VERSION);
      return { upgraded, firstInstall };
    }

    if (cmp < 0) {
      resetAllData(); // downgrade safety
      localStorage.setItem(META_VERSION_KEY, APP_VERSION);
      return { upgraded, firstInstall };
    }

    return { upgraded, firstInstall };
  }

  function backupStableData(prevVer) {
    try {
      const s = localStorage.getItem(STORAGE_SETTINGS);
      const h = localStorage.getItem(STORAGE_HISTORY);
      if (s) localStorage.setItem(`calc_backup_${prevVer}_settings`, s);
      if (h) localStorage.setItem(`calc_backup_${prevVer}_history`, h);
    } catch {}
  }

  function migrateOldKeysIfNeeded() {
    const haveStable = localStorage.getItem(STORAGE_SETTINGS) || localStorage.getItem(STORAGE_HISTORY);
    if (haveStable) return;

    for (const o of OLD_KEYS) {
      const oldS = localStorage.getItem(o.settings);
      const oldH = localStorage.getItem(o.history);
      if (oldS || oldH) {
        if (oldS) localStorage.setItem(STORAGE_SETTINGS, oldS);
        if (oldH) localStorage.setItem(STORAGE_HISTORY, oldH);
        const oldW = localStorage.getItem(o.welcome);
        if (oldW) localStorage.setItem(STORAGE_WELCOME, oldW);
        break;
      }
    }
  }

  function resetAllData() {
    try {
      localStorage.removeItem(STORAGE_SETTINGS);
      localStorage.removeItem(STORAGE_HISTORY);
      localStorage.removeItem(STORAGE_WELCOME);
    } catch {}
  }

  // ===== Display building (sci typing) =====
  function isOp(ch){ return ["+","-","*","/"].includes(ch); }

  function normalizeDispForView(d) {
    return String(d)
      .replace(/\*/g, "×")
      .replace(/\//g, "÷")
      .replace(/([+\-])/g, " $1 ")
      .replace(/×/g, " × ")
      .replace(/÷/g, " ÷ ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function syncScreenFromExpr() {
    const show = exprDisp ? normalizeDispForView(exprDisp) : "0";
    setScreen(show);
  }

  function clearAll() {
    exprRaw = "";
    exprDisp = "";
    lastWasEquals = false;
    lastResultIsSci = false;
    lastResultDisp = "";
    setPrev("");
    setScreen("0");
  }

  function del() {
    if (!exprRaw) return;
    exprRaw = exprRaw.slice(0, -1);
    if (exprDisp) exprDisp = exprDisp.slice(0, -1);

    if (!exprRaw) {
      exprDisp = "";
      setScreen("0");
      return;
    }
    syncScreenFromExpr();
  }

  // ===== Input rules =====
  const MAX_LEN = 60;

  function canAppendRaw(value) {
    if (exprRaw.length >= MAX_LEN) return false;

    const last = exprRaw.slice(-1);
    const ops = ["+", "-", "*", "/"];

    if (!exprRaw && ["+", "*", "/", "%"].includes(value)) return false;

    if (ops.includes(last) && ops.includes(value)) {
      exprRaw = exprRaw.slice(0, -1);
      if (exprDisp) exprDisp = exprDisp.slice(0, -1);
      return true;
    }

    if (value === ".") {
      const seg = exprRaw.split(/[\+\-\*\/\(\)]/).pop();
      if (seg.includes(".")) return false;
      if (!seg && (!exprRaw || /[\+\-\*\/\(]$/.test(exprRaw))) {
        exprRaw += "0";
        exprDisp += "0";
      }
    }

    if (value === "%") {
      if (!exprRaw) return false;
      if (/[\+\-\*\/\(\.]$/.test(exprRaw)) return false;
      if (last === "%") return false;
    }

    if (value === ")") {
      if (unmatchedOpenParens(exprRaw) <= 0) return false;
      if (!exprRaw || /[\+\-\*\/\(]$/.test(exprRaw)) return false;
    }

    if (value === "(") {
      if (/[0-9%)]$/.test(exprRaw)) {
        exprRaw += "*";
        exprDisp += "*";
      }
    }

    return true;
  }

  function append(value) {
    value = sanitize(value);
    if (!value) return;

    if (lastWasEquals && /[0-9.(]/.test(value)) {
      exprRaw = "";
      exprDisp = "";
      lastWasEquals = false;
      lastResultIsSci = false;
      lastResultDisp = "";
      setPrev("");
    }

    if (!canAppendRaw(value)) return;

    exprRaw += value;

    // keep sci prefix while typing ops after equals
    if (lastResultIsSci && exprDisp === lastResultDisp && isOp(value)) {
      exprDisp = lastResultDisp + value;
    } else if (lastResultIsSci && exprDisp.startsWith(lastResultDisp) && exprDisp.length >= lastResultDisp.length) {
      exprDisp += value;
    } else {
      exprDisp = exprRaw;
    }

    lastWasEquals = false;
    syncScreenFromExpr();
  }

  // ===== History =====
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[c]));
  }

  function closePanels() {
    settingsSide.classList.remove("open");
    historySide.classList.remove("open");
    panel = "none";
    showBackdrop(false);
  }

  function renderHistoryList(targetEl) {
    if (!targetEl) return;
    targetEl.innerHTML = "";

    if (history.length === 0) {
      const empty = document.createElement("div");
      empty.className = "h-item ripple-target";
      empty.innerHTML = `
        <div class="h-exp">No history yet</div>
        <div class="h-res placeholder">—</div>
      `;
      targetEl.appendChild(empty);
      return;
    }

    for (const h of history) {
      const row = document.createElement("div");
      row.className = "h-item ripple-target";
      row.innerHTML = `
        <div class="h-exp">${escapeHtml(h.exp)}</div>
        <div class="h-res">${escapeHtml(h.res)}</div>
      `;
      row.addEventListener("click", async () => {
        await tapFX(10);

        exprRaw = sanitize(h.res === "Infinity!" ? "" : h.res);
        exprDisp = exprRaw;
        lastWasEquals = true;

        setPrev(`${h.exp} =`);
        setScreen(h.res);

        if (!isLandscape() && panel === "history") closePanels();
      });
      targetEl.appendChild(row);
    }
  }

  function renderHistory() {
    renderHistoryList(historyListSide);
    renderHistoryList(historyListInline);
  }

  function pushHistory(expSmall, resultShown) {
    const item = { exp: expSmall, res: String(resultShown), t: Date.now() };
    history.unshift(item);
    history = history.slice(0, 200);
    saveHistory();
    renderHistory();
  }

  // ===== Dialog Queue + Focus Safety =====
  let dialogState = "closed";
  const dialogQueue = [];
  let lastFocusEl = null;

  function enqueueDialog(payload) {
    return new Promise((resolve) => {
      dialogQueue.push({ payload, resolve });
      processDialogQueue();
    });
  }

  function processDialogQueue() {
    if (dialogState !== "closed") return;
    const next = dialogQueue.shift();
    if (!next) return;
    openDialog(next.payload, next.resolve);
  }

  function setPageInert(on) {
    if (on) {
      pageRoot.setAttribute("inert", "");
      pageRoot.setAttribute("aria-hidden", "true");
    } else {
      pageRoot.removeAttribute("inert");
      pageRoot.removeAttribute("aria-hidden");
    }
  }

  function openDialog(payload, resolve) {
    dialogState = "open";
    lastFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    dlgTitle.textContent = payload.title || "";
    dlgBody.innerHTML = payload.bodyHtml || "";

    dlgActions.innerHTML = "";
    dlgActions.className = "dlg-actions";
    if (payload.buttons.length === 1) dlgActions.classList.add("one");
    if (payload.buttons.length === 2) dlgActions.classList.add("two");

    payload.buttons.forEach((b) => {
      const btn = document.createElement("button");
      btn.className = "dlg-btn ripple-target";
      btn.type = "button";
      btn.textContent = b.label;
      btn.addEventListener("click", async () => {
        await tapFX(12);
        closeDialog(b.value, resolve);
      });
      dlgActions.appendChild(btn);
    });

    // 1.0.0: Reflow trick so chained dialogs ALWAYS animate in
    dialogBox.classList.remove("closing");
    dialogRoot.hidden = false;
    dialogRoot.classList.remove("show");
    void dialogBox.offsetWidth; // force reflow to reset transitions

    setPageInert(true);

    requestAnimationFrame(() => {
      dialogRoot.classList.add("show");
      setTimeout(() => dlgActions.querySelector("button")?.focus(), 0);
    });
  }

  function closeDialog(resultValue, resolve) {
    if (dialogState !== "open") return;
    dialogState = "closing";

    const active = document.activeElement;
    if (active && dialogRoot.contains(active) && typeof active.blur === "function") active.blur();

    dialogBox.classList.add("closing");
    dialogRoot.classList.remove("show");

    setTimeout(() => {
      setPageInert(false);

      const fallbackFocus = menuBtn || document.body;
      if (lastFocusEl && document.contains(lastFocusEl)) lastFocusEl.focus({ preventScroll: true });
      else if (fallbackFocus && typeof fallbackFocus.focus === "function") fallbackFocus.focus({ preventScroll: true });

      dialogRoot.hidden = true;
      dialogBox.classList.remove("closing");

      if (typeof resolve === "function") resolve(resultValue);

      setTimeout(() => {
        dialogState = "closed";
        processDialogQueue();
      }, DIALOG_GAP_MS);
    }, DIALOG_ANIM_MS);
  }

  window.addEventListener("keydown", (e) => {
    if (dialogState !== "open") return;
    if (e.key === "Escape") {
      e.preventDefault();
      const btns = [...dlgActions.querySelectorAll("button")];
      const cancel = btns.find(b => b.textContent.toLowerCase() === "cancel");
      (cancel || btns[btns.length - 1])?.click();
    }
  });

  function showAlert(title, messageHtml) {
    return enqueueDialog({ title, bodyHtml: messageHtml, buttons: [{ label: "OK", value: true }] });
  }

  function showConfirm(title, messageHtml) {
    return enqueueDialog({
      title,
      bodyHtml: messageHtml,
      buttons: [{ label: "Cancel", value: false }, { label: "OK", value: true }]
    });
  }

  // ===== Panels =====
  function showBackdrop(show) {
    backdrop.classList.toggle("show", !!show);
  }

  function openSettings() {
    settingsSide.classList.add("open");
    historySide.classList.remove("open");
    panel = "settings";
    showBackdrop(true);
    updateStorageMetersSoon();
  }

  function openHistory() {
    historySide.classList.add("open");
    settingsSide.classList.remove("open");
    panel = "history";
    showBackdrop(true);
  }

  function switchPanel(target) {
    if (isLandscape() && target === "history") return;

    if (panel === target) { closePanels(); return; }

    if (panel === "none") {
      target === "settings" ? openSettings() : openHistory();
      return;
    }

    settingsSide.classList.remove("open");
    historySide.classList.remove("open");
    showBackdrop(true);
    panel = "none";

    setTimeout(() => {
      target === "settings" ? openSettings() : openHistory();
    }, PANEL_SWITCH_GAP_MS);
  }

  menuBtn.addEventListener("click", async () => { await tapFX(10); switchPanel("settings"); });
  historyBtn.addEventListener("click", async () => { await tapFX(10); switchPanel("history"); });

  settingsClose.addEventListener("click", async () => { await tapFX(10); closePanels(); });
  historyClose.addEventListener("click", async () => { await tapFX(10); closePanels(); });

  backdrop.addEventListener("click", async () => { await tapFX(8); closePanels(); });

  // ===== Settings binds =====
  optVibrate.checked  = !!settings.vibration;
  optAutoFont.checked = !!settings.autoFont;
  optSounds.checked   = !!settings.sounds;

  optVibrate.addEventListener("change", async () => {
    settings.vibration = optVibrate.checked;
    saveSettings();
    await tapFX(20);
    updateStorageMetersSoon();
  });

  optAutoFont.addEventListener("change", async () => {
    settings.autoFont = optAutoFont.checked;
    saveSettings();
    if (settings.autoFont) autoFitFont();
    else screenEl.style.fontSize = "";
    await tapFX(12);
    updateStorageMetersSoon();
  });

  optSounds.addEventListener("change", async () => {
    settings.sounds = optSounds.checked;
    saveSettings();
    await tapFX(10);
    updateStorageMetersSoon();
  });

  optLight.addEventListener("change", () => {
    settings.lightMode = false;
    optLight.checked = false;
    saveSettings();
    document.body.classList.remove("light");
    updateStorageMetersSoon();
  });

  async function showWhatsNewThenNotice() {
    await showAlert("What's New?", WHATS_NEW_HTML);
    await sleep(CHAIN_WAIT_MS);
    await showAlert("NOTICE", NOTICE_HTML);
  }

  whatsNewBtn.addEventListener("click", async () => {
    await tapFX(10);
    await showWhatsNewThenNotice();
  });

  async function handleResetSettings() {
    await tapFX(12);
    const ok = await showConfirm("Confirm", `<div>Reset settings back to default?</div>`);
    if (!ok) return;

    settings = { ...defaultSettings, lightMode:false };
    saveSettings();

    optVibrate.checked  = settings.vibration;
    optAutoFont.checked = settings.autoFont;
    optSounds.checked   = settings.sounds;
    optLight.checked = false;
    document.body.classList.remove("light");

    if (settings.autoFont) autoFitFont();
    updateStorageMetersSoon();

    await sleep(CHAIN_WAIT_MS);
    await showAlert("Alert", `<div>Settings is now back to default...</div>`);
  }
  resetSettingsBtn.addEventListener("click", handleResetSettings);

  // ===== Layout =====
  function applyLayout() {
    if (isLandscape()) {
      if (panel === "history") closePanels();
      historyInline.style.display = "block";
      if (panel !== "settings") showBackdrop(false);
    } else {
      historyInline.style.display = "none";
    }
    if (settings.autoFont) autoFitFont();
  }
  window.addEventListener("resize", applyLayout);

  // ===== Evaluation + History formatting =====
  function formatResultForScreen(val) {
    if (val === Infinity || val === -Infinity) return "Infinity!";
    if (Number.isNaN(val)) return "Error";

    const abs = Math.abs(val);
    if (Number.isFinite(abs) && abs >= 1e10) return toSciNoPlus(val, 1);

    if (Number.isFinite(val)) {
      const rounded = Math.round((val + Number.EPSILON) * 1e12) / 1e12;
      return String(rounded);
    }
    return String(val);
  }

  function expSmallTextFromDisp() {
    const view = normalizeDispForView(exprDisp || exprRaw || "");
    return view || "--";
  }

  async function equals() {
    if (!exprRaw) return;

    try {
      const rawRes = safeEvaluate(exprRaw);

      if (rawRes === Infinity || rawRes === -Infinity) {
        setPrev(`${expSmallTextFromDisp()} =`);
        setScreen("Infinity!");
        pushHistory(expSmallTextFromDisp(), "Infinity!");
        exprRaw = "";
        exprDisp = "";
        lastWasEquals = true;
        lastResultIsSci = false;
        await showAlert("Infinity!", INFINITY_HTML);
        updateStorageMetersSoon();
        return;
      }

      const shown = formatResultForScreen(rawRes);
      const expSmall = expSmallTextFromDisp();

      setPrev(`${expSmall} =`);
      setScreen(shown);
      pushHistory(expSmall, shown);

      lastWasEquals = true;

      const rawNumeric = sanitize(String(rawRes));

      if (shouldUseSci(rawRes)) {
        lastResultIsSci = true;
        lastResultDisp = shown;     // e.g. "2.4e14"
        exprRaw = rawNumeric;       // eval stays full
        exprDisp = lastResultDisp;  // display stays short
      } else {
        lastResultIsSci = false;
        lastResultDisp = "";
        exprRaw = rawNumeric;
        exprDisp = rawNumeric;
      }

      updateStorageMetersSoon();
    } catch {
      setPrev(expSmallTextFromDisp());
      setScreen("Error");
      exprRaw = "";
      exprDisp = "";
      lastWasEquals = false;
      lastResultIsSci = false;
    }
  }

  // ===== Clear actions =====
  async function clearSavedDataHistoryOnly() {
    history = [];
    saveHistory();
    renderHistory();
  }

  async function clearCacheOnly() {
    if (!("caches" in window)) return;
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    } catch {}
  }

  async function handleClearSavedData() {
    await tapFX(12);
    const ok = await showConfirm("Confirm", `<div>Do you want to Clear Saved Data?</div>`);
    if (!ok) return;

    await clearSavedDataHistoryOnly();
    updateStorageMetersSoon();

    await sleep(CHAIN_WAIT_MS);
    await showAlert("Alert", `<div>Cleared Saved Data</div>`);
  }

  async function handleClearCache() {
    await tapFX(12);
    const ok = await showConfirm("Confirm", `<div>Do you want to Clear Cache?</div>`);
    if (!ok) return;

    await clearCacheOnly();
    updateStorageMetersSoon();

    await sleep(CHAIN_WAIT_MS);
    await showAlert("Alert", `<div>Cleared Cache</div>`);
  }

  clearHistorySide.addEventListener("click", handleClearSavedData);
  clearHistoryInline.addEventListener("click", handleClearSavedData);

  clearCacheSide.addEventListener("click", handleClearCache);
  clearCacheInline.addEventListener("click", handleClearCache);

  // ===== 1.0.0 Touchscreen: multi-touch + glide typing =====
  // Tracks touch pointers and last-triggered button per pointer.
  const touchTrack = new Map(); // pointerId -> { lastBtn: HTMLElement|null }

  function triggerKeyButton(btn) {
    if (!btn) return;

    const action = btn.dataset.action;
    const value  = btn.dataset.value;

    if (action === "clear") { clearAll(); return; }
    if (action === "del") { del(); return; }
    if (action === "equals") { equals(); return; }
    if (value) { append(value); return; }
  }

  function buttonAtPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const btn = el.closest("button");
    if (!btn) return null;
    if (!keysEl.contains(btn)) return null;
    return btn;
  }

  // pointerdown triggers instantly (no click delay)
  keysEl.addEventListener("pointerdown", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    // Prevent unwanted selection/scroll on touch
    if (e.pointerType === "touch") e.preventDefault();

    await tapFX(10);
    triggerKeyButton(btn);

    if (e.pointerType === "touch") {
      touchTrack.set(e.pointerId, { lastBtn: btn });
      try { keysEl.setPointerCapture(e.pointerId); } catch {}
    }
  });

  // glide: as finger drags across keys, trigger new key once
  keysEl.addEventListener("pointermove", async (e) => {
    if (e.pointerType !== "touch") return;
    const st = touchTrack.get(e.pointerId);
    if (!st) return;

    const btn = buttonAtPoint(e.clientX, e.clientY);
    if (!btn) return;

    if (st.lastBtn !== btn) {
      st.lastBtn = btn;
      await tapFX(6);
      triggerKeyButton(btn);
    }
  });

  function endPointer(e) {
    if (e.pointerType === "touch") {
      touchTrack.delete(e.pointerId);
      try { keysEl.releasePointerCapture(e.pointerId); } catch {}
    }
  }

  keysEl.addEventListener("pointerup", endPointer);
  keysEl.addEventListener("pointercancel", endPointer);

  // ===== Keyboard support =====
  window.addEventListener("keydown", async (e) => {
    if (dialogState !== "closed") return;

    const k = e.key;
    if (k === "Escape") { e.preventDefault(); await tapFX(10); clearAll(); return; }
    if (k === "Backspace") { e.preventDefault(); await tapFX(10); del(); return; }
    if (k === "Enter" || k === "=") { e.preventDefault(); await tapFX(12); equals(); return; }

    const allowed = "0123456789+-*/().%";
    if (allowed.includes(k)) {
      e.preventDefault();
      await tapFX(8);
      append(k);
    }
  });

  // ===== Storage meters (Saved=history+settings, Cache=CacheStorage) =====
  function formatKB(bytes) {
    const kb = bytes / 1024;
    return `${kb.toFixed(2)} KB`;
  }

  function bytesOfString(str) {
    return new Blob([str]).size;
  }

  function getSavedLocalBytes() {
    let total = 0;
    try {
      const sVal = localStorage.getItem(STORAGE_SETTINGS) ?? "";
      const hVal = localStorage.getItem(STORAGE_HISTORY) ?? "";
      total += bytesOfString(STORAGE_SETTINGS) + bytesOfString(sVal);
      total += bytesOfString(STORAGE_HISTORY) + bytesOfString(hVal);
    } catch {}
    return total;
  }

  async function getCacheStorageBytes() {
    if (!("caches" in window)) return 0;

    let total = 0;
    try {
      const names = await caches.keys();
      for (const name of names) {
        const cache = await caches.open(name);
        const reqs = await cache.keys();

        const chunkSize = 6;
        for (let i = 0; i < reqs.length; i += chunkSize) {
          const slice = reqs.slice(i, i + chunkSize);
          const parts = await Promise.all(slice.map(async (req) => {
            try {
              const res = await cache.match(req);
              if (!res) return 0;
              const buf = await res.clone().arrayBuffer();
              return buf.byteLength;
            } catch { return 0; }
          }));
          total += parts.reduce((a, b) => a + b, 0);
        }
      }
    } catch { return 0; }
    return total;
  }

  async function updateStorageMeters() {
    const savedBytes = getSavedLocalBytes();
    const cacheBytes = await getCacheStorageBytes();
    savedDataVal.textContent = formatKB(savedBytes);
    cacheDataVal.textContent = formatKB(cacheBytes);
  }

  let meterTimer = null;
  function updateStorageMetersSoon() {
    if (meterTimer) clearTimeout(meterTimer);
    meterTimer = setTimeout(() => {
      updateStorageMeters();
      meterTimer = null;
    }, 150);
  }

  // ===== Init =====
  renderHistory();
  setPrev("");
  setScreen("0");
  applyLayout();
  updateStorageMetersSoon();

  // ===== 1.0.0: Intro overlay flow =====
  async function hideIntroOverlay() {
    if (!introOverlay) return;
    introOverlay.classList.add("hide");
    await sleep(320);
    introOverlay.style.display = "none";
  }

  async function runStartupDialogs() {
    // On upgrade or first install show What's New + Notice
    if (upgradeState.upgraded || upgradeState.firstInstall) {
      await showWhatsNewThenNotice();
      localStorage.setItem(STORAGE_WELCOME, "1");
      return;
    }

    // otherwise first-time welcome flow
    const seen = localStorage.getItem(STORAGE_WELCOME);
    if (!seen) {
      await showWhatsNewThenNotice();
      localStorage.setItem(STORAGE_WELCOME, "1");
    }
  }

  // Wait for full load: then fade out intro, then show dialogs (as requested)
  window.addEventListener("load", async () => {
    await hideIntroOverlay();
    await sleep(80);
    await runStartupDialogs();
  }, { once: true });

})();
