/* Tasbih Counter — counts, targets and daily totals, saved in this browser only. */
(function () {
  "use strict";
  var $ = S3.$, $$ = S3.$$;
  var KEY = "tasbih.v1";

  var PRESETS = [
    { ar: "سُبْحَانَ اللهِ", tr: "SubhanAllah", en: "Glory be to Allah", t: 33 },
    { ar: "الْحَمْدُ لِلَّهِ", tr: "Alhamdulillah", en: "All praise is due to Allah", t: 33 },
    { ar: "اللهُ أَكْبَرُ", tr: "Allahu Akbar", en: "Allah is the Greatest", t: 33 },
    { ar: "لَا إِلَهَ إِلَّا اللهُ", tr: "La ilaha illallah", en: "There is no god but Allah", t: 100 },
    { ar: "أَسْتَغْفِرُ اللهَ", tr: "Astaghfirullah", en: "I seek Allah's forgiveness", t: 100 },
    { ar: "سُبْحَانَ اللهِ وَبِحَمْدِهِ", tr: "SubhanAllahi wa bihamdihi", en: "Glory and praise be to Allah", t: 100 },
    { ar: "سُبْحَانَ اللهِ الْعَظِيمِ", tr: "SubhanAllahil-Azim", en: "Glory be to Allah, the Most Great", t: 100 },
    { ar: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ", tr: "La hawla wa la quwwata illa billah", en: "There is no power and no strength except with Allah", t: 100 },
    { ar: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ", tr: "Allahumma salli ala Muhammad", en: "O Allah, send blessings upon Muhammad", t: 100 },
    { ar: "حَسْبِيَ اللهُ وَنِعْمَ الْوَكِيلُ", tr: "Hasbiyallahu wa ni'mal-wakil", en: "Allah is enough for me, and He is the best disposer of affairs", t: 100 },
    { ar: "سُبْحَانَ اللهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللهُ، وَاللهُ أَكْبَرُ", tr: "SubhanAllah, walhamdulillah, wa la ilaha illallah, wallahu akbar", en: "Glory be to Allah, praise be to Allah, there is no god but Allah, and Allah is the Greatest", t: 100 },
    { ar: "لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ", tr: "La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamd, wa huwa ala kulli shay'in qadir", en: "There is no god but Allah alone, without partner; His is the dominion and His is the praise, and He has power over all things", t: 100 }
  ];

  // ---------- core logic (pure; vibration is injected so it can be tested) ----------
  function makeCounter(p, id) { return { id: id, ar: p.ar, tr: p.tr || "", en: p.en || "", target: p.t == null ? 33 : p.t, count: 0 }; }
  // One tap. Returns {hit} where hit means the target (or a multiple of it) was just reached.
  function tap(c, fx) {
    c.count++;
    var hit = c.target > 0 && c.count % c.target === 0;
    if (hit && fx.vibrateAtTarget && fx.vibrate) fx.vibrate([90, 70, 90]);
    else if (fx.tick && fx.vibrate) fx.vibrate(12);
    return { hit: hit };
  }
  function untap(c) { if (c.count > 0) { c.count--; return true; } return false; }
  function progress(c) {   // {inRound, rounds, frac} for the ring and labels
    if (!(c.target > 0)) return { inRound: c.count, rounds: 0, frac: 0 };
    var rounds = Math.floor(c.count / c.target), inRound = c.count % c.target;
    if (inRound === 0 && c.count > 0) { rounds--; inRound = c.target; }
    return { inRound: inRound, rounds: rounds, frac: inRound / c.target };
  }
  function dayKey(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function addHist(hist, day, id, delta) {
    var h = hist[day] || (hist[day] = { total: 0, by: {} });
    var cur = h.by[id] || 0, next = Math.max(0, cur + delta);
    h.total += next - cur; h.by[id] = next;
    if (!h.by[id]) delete h.by[id];
    if (!h.total) delete hist[day];
  }
  function pruneHist(hist, today, keepDays) {
    var cut = new Date(today.getFullYear(), today.getMonth(), today.getDate() - keepDays);
    Object.keys(hist).forEach(function (k) { if (k < dayKey(cut)) delete hist[k]; });
  }
  function parseTarget(v) {
    v = String(v || "").replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 0x660; }).trim();
    return /^\d{1,6}$/.test(v) && +v > 0 ? +v : null;
  }

  // ---------- state ----------
  var sv = S3.store(KEY) || {};
  var st = {
    counters: Array.isArray(sv.counters) && sv.counters.length ? sv.counters : [makeCounter(PRESETS[0], "c1")],
    active: sv.active, hist: sv.hist && typeof sv.hist === "object" ? sv.hist : {},
    vib: sv.vib !== false, tick: !!sv.tick, nextId: sv.nextId || 2
  };
  pruneHist(st.hist, new Date(), 400);
  function cur() { return st.counters.filter(function (c) { return c.id === st.active; })[0] || st.counters[0]; }
  st.active = cur().id;
  var save = S3.debounce(function () { S3.store(KEY, st); }, 250);
  var canVibrate = typeof navigator.vibrate === "function";
  var fx = { vibrate: canVibrate ? function (p) { try { navigator.vibrate(p); } catch (e) { /* ignore */ } } : null };

  // ---------- render ----------
  var CIRC = 2 * Math.PI * 54;
  function renderMain() {
    var c = cur(), p = progress(c);
    $("#d-ar").textContent = c.ar;
    $("#d-tr").textContent = c.tr;
    $("#d-mean").textContent = c.en;
    $("#count").textContent = c.target > 0 ? p.inRound.toLocaleString() : c.count.toLocaleString();
    $("#of").textContent = c.target > 0 ? "of " + c.target : "no target";
    $("#round").textContent = c.target > 0 && c.count >= c.target ? "Total " + c.count.toLocaleString() + " · round " + (p.rounds + 1) : c.target > 0 ? "" : "";
    var ring = $("#ring");
    ring.style.strokeDasharray = CIRC.toFixed(2);
    ring.style.strokeDashoffset = (CIRC * (1 - (c.target > 0 ? p.frac : 0))).toFixed(2);
    $("#tap").classList.toggle("done", c.target > 0 && p.inRound === c.target);
    $("#tap").setAttribute("aria-label", "Count " + c.count + (c.target > 0 ? " of " + c.target : "") + ". Tap to add one.");
    $$("#target button").forEach(function (b) { b.setAttribute("aria-pressed", String(+b.dataset.v === c.target)); });
    $("#custom").value = [0, 33, 99, 100].indexOf(c.target) < 0 ? c.target : "";
    $("#vib").checked = st.vib; $("#tick").checked = st.tick;
    $("#hint").textContent = (st.vib || st.tick) && !canVibrate ? "This device or browser can't vibrate (iPhones can't). Counting still works." : "";
  }
  function renderList() {
    var list = $("#list"); list.innerHTML = "";
    st.counters.forEach(function (c) {
      var row = S3.h("div", { "class": "tb-item" + (c.id === st.active ? " on" : "") }, [
        S3.h("button", { "class": "tb-pick", type: "button", "data-id": c.id, "aria-pressed": String(c.id === st.active) }, [
          S3.h("span", { "class": "tb-item-ar", lang: "ar", dir: "rtl", text: c.ar }),
          S3.h("span", { "class": "tb-item-n", text: c.count.toLocaleString() + (c.target > 0 ? " / " + c.target : "") })
        ]),
        S3.h("button", { "class": "btn icon ghost tb-del", type: "button", "data-del": c.id, "aria-label": "Delete counter", title: "Delete", html: S3.icon("trash") })
      ]);
      list.appendChild(row);
    });
  }
  function renderHist() {
    var today = new Date(), tk = dayKey(today), h = st.hist[tk] || { total: 0 }, week = 0, all = 0, best = 0;
    Object.keys(st.hist).forEach(function (k) { all += st.hist[k].total; best = Math.max(best, st.hist[k].total); });
    var bars = $("#bars"); bars.innerHTML = "";
    var days = [];
    for (var i = 13; i >= 0; i--) {
      var d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i), k = dayKey(d), v = st.hist[k] ? st.hist[k].total : 0;
      if (i < 7) week += v;
      days.push({ d: d, v: v });
    }
    var max = Math.max.apply(null, days.map(function (x) { return x.v; }).concat([1]));
    days.forEach(function (x, i) {
      var label = x.d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) + ": " + x.v.toLocaleString();
      bars.appendChild(S3.h("div", { "class": "tb-bar" + (i === 13 ? " today" : ""), title: label, "aria-label": label }, [
        S3.h("i", { style: "height:" + Math.max(x.v ? 6 : 2, Math.round(x.v / max * 100)) + "%" }),
        S3.h("span", { text: x.d.toLocaleDateString(undefined, { weekday: "narrow" }) })
      ]));
    });
    var stats = $("#h-stats"); stats.innerHTML = "";
    [[h.total, "today · اليوم"], [week, "last 7 days · ٧ أيام"], [all, "all saved · الكل"]].forEach(function (s) {
      stats.appendChild(S3.h("div", { "class": "stat" }, [S3.h("b", { text: s[0].toLocaleString() }), S3.h("span", { text: s[1] })]));
    });
  }
  function renderAll() { renderMain(); renderList(); renderHist(); }

  // ---------- actions ----------
  function doTap() {
    var c = cur(), r = tap(c, { vibrate: fx.vibrate, vibrateAtTarget: st.vib, tick: st.tick });
    addHist(st.hist, dayKey(new Date()), c.id, 1);
    renderMain(); renderList(); renderHist(); save();
    var btn = $("#tap");
    btn.classList.remove("pulse"); void btn.offsetWidth; btn.classList.add("pulse");
    if (r.hit) { S3.toast("Target reached · تمّ العدد " + c.target); S3.done(); }
  }
  function doUndo() { var c = cur(); if (untap(c)) { addHist(st.hist, dayKey(new Date()), c.id, -1); renderAll(); save(); } }
  // Two-step confirm without a modal: first click arms the button for 3 seconds.
  function armed(btn, labelEl, text, run) {
    var t = null, orig = labelEl.innerHTML;
    btn.addEventListener("click", function () {
      if (t) { clearTimeout(t); t = null; labelEl.innerHTML = orig; btn.classList.remove("danger"); run(); return; }
      labelEl.textContent = text; btn.classList.add("danger");
      t = setTimeout(function () { t = null; labelEl.innerHTML = orig; btn.classList.remove("danger"); }, 3000);
    });
  }
  armed($("#reset"), $("#reset-l"), "Tap again to reset · اضغط مجدداً", function () { cur().count = 0; renderAll(); save(); });
  armed($("#h-clear"), $("#h-clear-l"), "Tap again to clear", function () { st.hist = {}; renderHist(); save(); });

  $("#tap").addEventListener("click", doTap);
  $("#undo").addEventListener("click", doUndo);
  document.addEventListener("keydown", function (e) {
    var a = document.activeElement, free = !a || a === document.body || a === $("#tap");
    if (!free || e.ctrlKey || e.metaKey || e.altKey) return;
    if ((e.key === " " || e.key === "Enter") && a !== $("#tap")) { e.preventDefault(); doTap(); }
    else if (e.key === "Backspace" || e.key === "-") { e.preventDefault(); doUndo(); }
  });
  $$("#target button").forEach(function (b) {
    b.addEventListener("click", function () { cur().target = +b.dataset.v; renderAll(); save(); });
  });
  $("#custom").addEventListener("change", function () {
    var t = parseTarget(this.value);
    if (t) { cur().target = t; renderAll(); save(); } else if (this.value.trim()) S3.toast("Enter a whole number like 7 or 1000", "error");
  });
  $("#vib").addEventListener("change", function () { st.vib = this.checked; if (st.vib && fx.vibrate) fx.vibrate(40); renderMain(); save(); });
  $("#tick").addEventListener("change", function () { st.tick = this.checked; renderMain(); save(); });

  // counters list
  $("#list").addEventListener("click", function (e) {
    var del = e.target.closest("[data-del]"), pick = e.target.closest("[data-id]");
    if (del) {
      var id = del.dataset.del, c = st.counters.filter(function (x) { return x.id === id; })[0];
      if (st.counters.length === 1) { S3.toast("Keep at least one counter", "error"); return; }
      if (!del.classList.contains("danger")) { del.classList.add("danger"); del.title = "Click again to delete"; S3.toast("Click the bin again to delete “" + c.tr + "”"); setTimeout(function () { del.classList.remove("danger"); }, 3000); return; }
      st.counters = st.counters.filter(function (x) { return x.id !== id; });
      if (st.active === id) st.active = st.counters[0].id;
      renderAll(); save(); return;
    }
    if (pick) { st.active = pick.dataset.id; renderAll(); save(); }
  });
  function addCounter(p) {
    var c = makeCounter(p, "c" + st.nextId++);
    st.counters.push(c); st.active = c.id; $("#new").hidden = true; renderAll(); save();
    $("#tap").focus();
  }
  $("#add").addEventListener("click", function () { $("#new").hidden = !$("#new").hidden; if (!$("#new").hidden) $("#own").focus(); });
  $("#new-close").addEventListener("click", function () { $("#new").hidden = true; });
  $("#own-add").addEventListener("click", function () {
    var t = $("#own").value.trim();
    if (!t) { S3.toast("Write your dhikr first", "error"); $("#own").focus(); return; }
    addCounter({ ar: t.slice(0, 300), tr: "", en: "", t: cur().target || 33 }); $("#own").value = "";
  });
  $("#own").addEventListener("keydown", function (e) { if (e.key === "Enter") $("#own-add").click(); });
  PRESETS.forEach(function (p, i) {
    $("#presets").appendChild(S3.h("button", { "class": "tb-preset", type: "button", "data-p": i }, [
      S3.h("span", { "class": "tb-preset-ar", lang: "ar", dir: "rtl", text: p.ar }),
      S3.h("span", { "class": "tb-preset-tr", text: p.tr + " · " + p.en })
    ]));
  });
  $("#presets").addEventListener("click", function (e) { var b = e.target.closest("[data-p]"); if (b) addCounter(PRESETS[+b.dataset.p]); });

  $("#h-csv").addEventListener("click", function () {
    var names = {}; st.counters.forEach(function (c) { names[c.id] = c.tr || c.ar; });
    var rows = [["date", "total", "breakdown"]];
    Object.keys(st.hist).sort().forEach(function (k) {
      var by = st.hist[k].by; rows.push([k, st.hist[k].total, Object.keys(by).map(function (id) { return (names[id] || "deleted counter") + ": " + by[id]; }).join("; ")]);
    });
    if (rows.length === 1) { S3.toast("No history yet", "error"); return; }
    S3.download("﻿" + rows.map(function (r) { return r.map(function (x) { return '"' + String(x).replace(/"/g, '""') + '"'; }).join(","); }).join("\n"), "tasbih-history.csv", "text/csv;charset=utf-8");
    S3.done();
  });

  // Screen wake lock (asked only when the button is clicked)
  var lock = null, wantLock = false;
  function setWake(on) { $("#wake").setAttribute("aria-pressed", String(on)); $("#wake-l").textContent = on ? "Screen stays on" : "Keep screen on"; }
  function requestLock() {
    if (!("wakeLock" in navigator)) { S3.toast("This browser can't keep the screen on", "error"); wantLock = false; return; }
    navigator.wakeLock.request("screen").then(function (l) {
      lock = l; setWake(true);
      l.addEventListener("release", function () { lock = null; if (!wantLock) setWake(false); });
    }, function () { wantLock = false; setWake(false); S3.toast("Couldn't keep the screen on", "error"); });
  }
  $("#wake").addEventListener("click", function () {
    if (wantLock) { wantLock = false; if (lock) lock.release(); setWake(false); return; }
    wantLock = true; requestLock();
  });
  document.addEventListener("visibilitychange", function () { if (wantLock && !lock && document.visibilityState === "visible") requestLock(); });

  renderAll();

  window.S3_DEMO = function () {
    st.counters = [makeCounter(PRESETS[0], "d1"), makeCounter(PRESETS[1], "d2"), makeCounter(PRESETS[2], "d3"), makeCounter(PRESETS[4], "d4")];
    st.counters[0].count = 33; st.counters[1].count = 21; st.counters[3].count = 64; st.active = "d2";
    var today = new Date(); st.hist = {};
    [120, 0, 233, 99, 160, 310, 140, 0, 99, 200, 133, 250, 180, 54].forEach(function (v, i) {
      if (v) st.hist[dayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 13 + i))] = { total: v, by: { d1: v } };
    });
    renderAll();
  };

  // Returns true, or a list of failed checks.
  window.S3_SELFTEST = function () {
    var fails = [], calls = [];
    function eq(a, b, what) { if (JSON.stringify(a) !== JSON.stringify(b)) fails.push(what + ": got " + JSON.stringify(a)); }
    var spy = function (p) { calls.push(p); };
    var c = makeCounter({ ar: "x", t: 33 }, "t"), opts = { vibrate: spy, vibrateAtTarget: true, tick: false }, hits = 0;
    for (var i = 0; i < 32; i++) if (tap(c, opts).hit) hits++;
    eq([c.count, hits, calls.length], [32, 0, 0], "32 taps, no vibration yet");
    eq(tap(c, opts).hit, true, "33rd tap hits the target");
    eq(calls, [[90, 70, 90]], "one gentle vibration at 33");
    eq(progress(c), { inRound: 33, rounds: 0, frac: 1 }, "ring full at 33");
    tap(c, opts); eq(progress(c), { inRound: 1, rounds: 1, frac: 1 / 33 }, "round two starts at 34");
    for (i = 0; i < 32; i++) tap(c, opts);
    eq([c.count, calls.length], [66, 2], "second vibration at 66");
    opts.vibrateAtTarget = false; calls = []; c.count = 98; c.target = 99; tap(c, opts);
    eq(calls.length, 0, "vibration off means no call");
    opts.tick = true; calls = []; tap(c, opts); eq(calls, [12], "tick on each tap");
    opts.vibrateAtTarget = true; opts.tick = false; calls = [];
    var inf = makeCounter({ ar: "y", t: 0 }, "u");
    for (i = 0; i < 500; i++) tap(inf, opts);
    eq([inf.count, calls.length, progress(inf).inRound], [500, 0, 500], "no target never vibrates");
    var seven = makeCounter({ ar: "z", t: 7 }, "v"); for (i = 0; i < 21; i++) tap(seven, opts);
    eq(calls.length, 3, "custom target 7 hits three times in 21");
    tap(c, { vibrate: null, vibrateAtTarget: true }); // no vibrate API: must not throw
    var z = makeCounter({ ar: "z", t: 33 }, "w"); eq([untap(z), z.count], [false, 0], "undo stops at zero");
    var h = {}; for (i = 0; i < 5; i++) addHist(h, "2026-10-26", "a", 1);
    addHist(h, "2026-10-26", "b", 3); addHist(h, "2026-10-26", "a", -1); addHist(h, "2026-10-26", "b", -10);
    eq(h, { "2026-10-26": { total: 4, by: { a: 4 } } }, "history totals");
    addHist(h, "2026-10-25", "a", 1); addHist(h, "2026-10-25", "a", -1); eq(Object.keys(h), ["2026-10-26"], "empty day removed");
    var old = { "2024-01-01": { total: 1, by: {} }, "2026-10-20": { total: 2, by: {} } }; pruneHist(old, new Date(2026, 9, 26), 400);
    eq(Object.keys(old), ["2026-10-20"], "old history pruned");
    eq(dayKey(new Date(2026, 0, 5)), "2026-01-05", "day key");
    eq([parseTarget("٣٣"), parseTarget("0"), parseTarget("abc"), parseTarget(" 1000 ")], [33, null, null, 1000], "custom target parsing");
    return fails.length ? fails.slice(0, 6) : true;
  };
})();
