/* Interactions for the soft theme: mobile menu and carousels
   (phone-screen groups and key decisions) with arrows, dots, swipe and keyboard. */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var ARROW = { l: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
                r: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' };

  /* How I work: left list of steps, details of the chosen one on the right */
  function howTabs() {
    var tabs = $$(".hw-tab");
    if (!tabs.length) return;
    function pick(t, focus) {
      tabs.forEach(function (b) {
        var on = b === t, p = doc.getElementById(b.getAttribute("aria-controls"));
        b.setAttribute("aria-selected", on ? "true" : "false"); b.tabIndex = on ? 0 : -1;
        if (p) p.classList.toggle("on", on);
      });
      if (focus) t.focus();
    }
    tabs.forEach(function (b, i) {
      b.addEventListener("click", function () { pick(b); });
      b.addEventListener("hw:pick", function () { pick(b); });
      b.addEventListener("keydown", function (e) {
        var k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (e.key === "Home") k = -i; if (e.key === "End") k = tabs.length - 1 - i;
        if (k === undefined) return;
        e.preventDefault(); pick(tabs[(i + k + tabs.length) % tabs.length], true);
      });
    });
    pick(tabs[0]);
  }

  /* Hide the header while scrolling down; show it again on any scroll up */
  function autoHide() {
    var last = window.scrollY, ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY, d = y - last;
        if (y < 120 || d < -4) root.classList.remove("hdr-hide");
        else if (d > 4) root.classList.add("hdr-hide");
        if (Math.abs(d) > 4 || y < 120) last = y;
        ticking = false;
      });
    }, { passive: true });
    doc.addEventListener("focusin", function (e) { if (e.target.closest && e.target.closest(".topbar")) root.classList.remove("hdr-hide"); });
  }

  function menu() {
    var bar = doc.querySelector(".topbar"), nav = doc.querySelector(".topnav");
    if (!bar || !nav) return;
    var b = doc.createElement("button");
    b.type = "button"; b.className = "menu-btn"; b.setAttribute("aria-label", "Menu"); b.setAttribute("aria-expanded", "false");
    b.innerHTML = "<i></i><i></i><i></i>";
    bar.insertBefore(b, nav);
    var set = function (open) { bar.classList.toggle("open", open); b.setAttribute("aria-expanded", String(open)); };
    b.addEventListener("click", function () { set(!bar.classList.contains("open")); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) set(false); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") set(false); });
  }

  function carousel(host, slides, opts) {
    var n = slides.length, i = 0;
    var view = doc.createElement("div"); view.className = "car-view";
    var track = doc.createElement("ul"); track.className = "car-track";
    slides.forEach(function (el, k) {
      var li = doc.createElement("li"); li.className = "car-slide"; li.setAttribute("aria-roledescription", "slide"); li.setAttribute("aria-label", (k + 1) + " of " + n);
      el.removeAttribute("data-reveal"); el.classList.add("in");
      li.appendChild(el); track.appendChild(li);
    });
    view.appendChild(track);
    var mk = function (dir, label) { var b = doc.createElement("button"); b.type = "button"; b.className = "car-btn car-" + dir; b.setAttribute("aria-label", label); b.innerHTML = dir === "prev" ? ARROW.l : ARROW.r; return b; };
    var prev = mk("prev", "Previous"), next = mk("next", "Next");
    host.appendChild(view); host.appendChild(prev); host.appendChild(next);
    var dots = [];
    if (opts.dots) {
      var dw = doc.createElement("div"); dw.className = "car-dots";
      for (var k = 0; k < n; k++) (function (k) {
        var d = doc.createElement("button"); d.type = "button"; d.setAttribute("aria-label", "Go to " + (k + 1) + " of " + n);
        d.addEventListener("click", function () { go(k); }); dw.appendChild(d); dots.push(d);
      })(k);
      host.appendChild(dw);
    }
    host.setAttribute("role", "region"); host.setAttribute("aria-roledescription", "carousel"); host.tabIndex = 0;
    function layout(drag) {
      var li = track.children[i]; if (!li) return;
      var x = (view.clientWidth - li.offsetWidth) / 2 - li.offsetLeft + (drag || 0);
      track.style.transform = "translate3d(" + x + "px,0,0)";
      Array.prototype.forEach.call(track.children, function (s, k) { s.classList.toggle("on", k === i); if (k === i) s.removeAttribute("aria-hidden"); else s.setAttribute("aria-hidden", "true"); });
      dots.forEach(function (d, k) { d.classList.toggle("on", k === i); });
    }
    function go(k) { i = (k % n + n) % n; track.classList.remove("dragging"); layout(); }
    prev.addEventListener("click", function () { go(i - 1); });
    next.addEventListener("click", function () { go(i + 1); });
    host.addEventListener("keydown", function (e) { if (e.key === "ArrowLeft") { go(i - 1); e.preventDefault(); } if (e.key === "ArrowRight") { go(i + 1); e.preventDefault(); } });
    var sx = null, dx = 0, moved = false;
    view.addEventListener("pointerdown", function (e) { if (e.pointerType === "mouse" && e.button !== 0) return; sx = e.clientX; dx = 0; moved = false; });
    window.addEventListener("pointermove", function (e) { if (sx === null) return; dx = e.clientX - sx; if (Math.abs(dx) > 8) { moved = true; track.classList.add("dragging"); layout(dx); } });
    var end = function () { if (sx === null) return; sx = null; if (moved && Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1)); else go(i); };
    window.addEventListener("pointerup", end); window.addEventListener("pointercancel", end);
    view.addEventListener("click", function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    view.addEventListener("dragstart", function (e) { e.preventDefault(); });
    window.addEventListener("resize", function () { track.classList.add("dragging"); layout(); });
    if ("ResizeObserver" in window) new ResizeObserver(function () { track.classList.add("dragging"); layout(); }).observe(view);
    track.classList.add("dragging"); layout();
    requestAnimationFrame(function () { track.classList.remove("dragging"); });
  }

  function carousels() {
    $$(".cs-sec > .phones, .inner > .phones").forEach(function (g) {
      var figs = $$(":scope > figure", g);
      if (figs.length < 3) return;
      g.className = "car car-phones";
      carousel(g, figs, { dots: false });
    });
    $$(".cs-sec").forEach(function (sec) {
      var ds = $$(":scope > .decision", sec);
      if (ds.length < 2) return;
      var host = doc.createElement("div"); host.className = "car car-cards";
      sec.insertBefore(host, ds[0]);
      carousel(host, ds, { dots: true });
    });
  }


  /* Show a shimmer behind each image until it loads, then fade it in */
  function imgLoading() {
    Array.prototype.forEach.call(document.querySelectorAll("main img, .cs-main img, .hero-img img, .cs-card img"), function (img) {
      if (img.complete && img.naturalWidth) return;
      var box = img.parentElement; box.classList.add("img-wait");
      var done = function () { box.classList.remove("img-wait"); img.classList.add("img-in"); };
      img.addEventListener("load", done, { once: true }); img.addEventListener("error", function () { box.classList.remove("img-wait"); }, { once: true });
    });
  }


  /* On phones, the floating chat button would cover the hero buttons, so it waits until they scroll away */
  function chatLinks() {
    var cta = document.querySelector(".hero-cta");
    if (cta && "IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        document.documentElement.classList.toggle("cta-in-view", es[0].isIntersecting);
      }).observe(cta);
    }
  }

  /* Hero: the dot grid brightens around the cursor */
  function heroHook() {
    var hero = document.querySelector(".hello"), grid = hero && hero.querySelector(".hero-grid");
    if (!grid || !window.matchMedia || matchMedia("(prefers-reduced-motion: reduce)").matches || !matchMedia("(pointer: fine)").matches) return;
    var raf = 0;
    hero.addEventListener("pointermove", function (e) {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        var r = hero.getBoundingClientRect();
        grid.style.setProperty("--mx", (e.clientX - r.left) + "px");
        grid.style.setProperty("--my", (e.clientY - r.top) + "px");
        raf = 0;
      });
    });
  }

  /* "Book a call": open Calendly in a popup, loading its files only on the first click */
  function calendly() {
    var loading = null;
    function load() {
      if (loading) return loading;
      loading = new Promise(function (ok, fail) {
        var css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://assets.calendly.com/assets/external/widget.css"; document.head.appendChild(css);
        var js = document.createElement("script"); js.src = "https://assets.calendly.com/assets/external/widget.js"; js.async = true;
        js.onload = ok; js.onerror = fail; document.head.appendChild(js);
      });
      return loading;
    }
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("[data-calendly]"); if (!a) return;
      e.preventDefault();
      var url = a.getAttribute("href");
      a.setAttribute("aria-busy", "true");
      load().then(function () { window.Calendly.initPopupWidget({ url: url }); })
        .catch(function () { window.open(url, "_blank", "noopener"); })
        .then(function () { a.removeAttribute("aria-busy"); });
    });
  }

  function toTop() {
    if (location.hash && location.hash.length > 1) return;
    try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch (e) {}
    var go = function () { window.scrollTo(0, 0); root.scrollTop = 0; doc.body.scrollTop = 0; };
    go(); requestAnimationFrame(go); window.addEventListener("load", go); window.addEventListener("pageshow", go);
    setTimeout(go, 60);
  }

  /* Back-to-top button for long pages */
  function topButton() {
    $$(".to-top").forEach(function (b) { b.remove(); });
    var b = doc.createElement("button"); b.type = "button"; b.className = "top-btn"; b.setAttribute("aria-label", "Back to top");
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
    b.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); });
    doc.body.appendChild(b);
    var f = function () { b.classList.toggle("show", (window.scrollY || root.scrollTop) > 700); };
    window.addEventListener("scroll", f, { passive: true }); f();
  }

  /* Sticky section bar on case studies */
  function sectionBar() {
    var secs = $$(".cs-main > .cs-sec[id]").filter(function (s) { return s.querySelector(":scope > h2"); });
    var hero = doc.querySelector(".cs-hero");
    if (secs.length < 3 || !hero) return;
    var nav = doc.createElement("nav"); nav.className = "secbar"; nav.setAttribute("aria-label", "Sections of this case study");
    var inner = doc.createElement("div"); inner.className = "secbar-in"; nav.appendChild(inner);
    var links = secs.map(function (s) {
      var a = doc.createElement("a"); a.href = "#" + s.id; a.textContent = s.querySelector(":scope > h2").textContent.trim();
      a.addEventListener("click", function (e) {
        e.preventDefault();
        var y = s.getBoundingClientRect().top + (window.scrollY || root.scrollTop) - offset();
        window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
        try { history.replaceState(null, "", "#" + s.id); } catch (err) {}
      });
      inner.appendChild(a); return a;
    });
    doc.body.appendChild(nav);
    function offset() { var bar = doc.querySelector(".topbar"); return (bar ? bar.offsetHeight : 76) + nav.offsetHeight + 28; }
    var cur = -1, tick = false;
    function update() {
      tick = false;
      var y = window.scrollY || root.scrollTop;
      nav.classList.toggle("show", hero.getBoundingClientRect().bottom < 140);
      var line = offset() + 40, k = 0;
      secs.forEach(function (s, i) { if (s.getBoundingClientRect().top <= line) k = i; });
      if (k !== cur) {
        cur = k;
        links.forEach(function (a, i) { a.classList.toggle("on", i === k); if (i === k) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
        var a = links[k]; inner.scrollTo({ left: a.offsetLeft - (inner.clientWidth - a.offsetWidth) / 2, behavior: reduce ? "auto" : "smooth" });
      }
    }
    window.addEventListener("scroll", function () { if (!tick) { tick = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("resize", update); update();
    doc.addEventListener("click", function (e) { var b = e.target.closest(".menu-btn"); if (b) nav.classList.toggle("hide", b.getAttribute("aria-expanded") === "true"); });
  }


  /* Resume menu: two download options */
  function track() {
    doc.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest("a, button") : null;
      if (!a || typeof window.clarity !== "function") return;
      var h = a.getAttribute("href") || "", name = "";
      if (/Resume\.pdf/.test(h)) name = a.classList.contains("nav-cv") ? "resume_download_header" : "resume_download";
      else if (a.classList.contains("cs-card")) name = "open_" + h.replace(/\.html.*$/, "").replace(/-/g, "_");
      else if (/linkedin\.com/.test(h)) name = "linkedin_click";
      else if (/^mailto:/.test(h)) name = "email_click";
      else if (a.closest(".hero-cta") && h === "#work") name = "hero_see_work";
      else if (a.hasAttribute("data-calendly")) name = "book_a_call";
      if (name) window.clarity("event", name);
    }, true);
  }
  function init() { root.classList.add("fx"); toTop(); imgLoading(); heroHook(); chatLinks(); calendly(); autoHide(); howTabs(); menu(); carousels(); topButton(); sectionBar(); track(); }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init); else init();
})();
