/* Portfolio interactions. Ported from VengeanceUI patterns (spotlight navbar, stats counter,
   stagger text, border beam) to plain JS so the static multi-page site needs no build.
   Content is never rewritten: scripts only wrap, reveal, animate and navigate. */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var svg = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>"; };
  var ICON = {
    sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    moon: svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
    up: svg('<path d="M12 19V5M5 12l7-7 7 7"/>'),
    x: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
    l: svg('<path d="M15 6l-6 6 6 6"/>'),
    r: svg('<path d="M9 6l6 6-6 6"/>')
  };

  /* Theme */
  var saved = store.get("az-theme-v2");
  if (saved === "light" || saved === "dark") root.setAttribute("data-az", saved);
  var isDark = function () {
    var t = root.getAttribute("data-az");
    if (t) return t === "dark";
    return false; /* light is the default; dark only when chosen */
  };

  if (!reduce) root.classList.add("motion");

  function init() {
    var bar = $(".topbar"), nav = $(".topnav");

    /* Theme toggle */
    if (nav) {
      var tb = doc.createElement("button");
      tb.type = "button"; tb.className = "theme-btn";
      var paint = function () { tb.innerHTML = isDark() ? ICON.sun : ICON.moon; tb.setAttribute("aria-label", isDark() ? "Switch to light theme" : "Switch to dark theme"); };
      paint();
      tb.addEventListener("click", function () { var next = isDark() ? "light" : "dark"; root.setAttribute("data-az", next); store.set("az-theme-v2", next); paint(); });
      nav.appendChild(tb);

      /* Spotlight following the pointer, settling on the active link */
      nav.addEventListener("pointermove", function (e) { var r = nav.getBoundingClientRect(); nav.style.setProperty("--spot-x", (e.clientX - r.left) + "px"); });
      nav.addEventListener("pointerleave", function () {
        var a = $("a.active", nav), r = nav.getBoundingClientRect();
        if (a) { var ar = a.getBoundingClientRect(); nav.style.setProperty("--spot-x", (ar.left - r.left + ar.width / 2) + "px"); }
        else nav.style.setProperty("--spot-x", "-200px");
      });
      $$("a", nav).forEach(function (a) { a.classList.add("lh-nav"); });
    }

    /* Progress bar, sticky bar border, back to top */
    var prog = doc.createElement("div"); prog.className = "progress"; prog.setAttribute("aria-hidden", "true"); doc.body.appendChild(prog);
    var top = doc.createElement("button"); top.type = "button"; top.className = "to-top"; top.setAttribute("aria-label", "Back to top"); top.innerHTML = ICON.up;
    top.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); });
    doc.body.appendChild(top);

    var spine = $(".spine"), flow = $(".flow");
    var ticking = false;
    function onScroll() {
      ticking = false;
      var y = window.scrollY, h = root.scrollHeight - innerHeight;
      prog.style.setProperty("--p", h > 0 ? Math.min(1, y / h) : 0);
      if (bar) bar.classList.toggle("scrolled", y > 8);
      top.classList.toggle("show", y > innerHeight * 1.2);
      if (spine && flow) {
        var r = flow.getBoundingClientRect();
        var f = (innerHeight * 0.6 - r.top) / r.height;
        spine.style.setProperty("--fill", Math.max(0, Math.min(1, f)).toFixed(4));
      }
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();

    /* Stagger the main headline word by word (text unchanged; screen readers get the whole line) */
    var h1 = $(".intro h1, .cs-hero h1");
    if (h1 && !reduce) {
      var label = h1.textContent.replace(/\s+/g, " ").trim();
      var i = 0;
      (function wrap(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            var frag = doc.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach(function (w) {
              if (!w) return;
              if (/^\s+$/.test(w)) { frag.appendChild(doc.createTextNode(" ")); return; }
              var o = doc.createElement("span"); o.className = "st-w";
              var s = doc.createElement("span"); s.textContent = w; s.style.setProperty("--i", i++);
              o.appendChild(s); frag.appendChild(o);
            });
            n.parentNode.replaceChild(frag, n);
          } else if (n.nodeType === 1) wrap(n);
        });
      })(h1);
      h1.setAttribute("aria-label", label);
      $$(".st-w", h1).forEach(function (w) { w.setAttribute("aria-hidden", "true"); });
      requestAnimationFrame(function () { requestAnimationFrame(function () { h1.classList.add("st-on"); }); });
    }

    /* Count up the leading number of each impact stat (VengeanceUI stats-counter) */
    $$(".impact strong").forEach(function (el) {
      var t = el.firstChild;
      if (!t || t.nodeType !== 3) return;
      var m = t.textContent.match(/^(\d[\d,]*)(.*)$/s);
      if (!m) return;
      var target = parseInt(m[1].replace(/,/g, ""), 10), rest = m[2], comma = m[1].indexOf(",") > -1;
      if (reduce || target < 2) return;
      var fmt = function (v) { return comma ? v.toLocaleString("en-US") : String(v); };
      el.setAttribute("aria-label", el.textContent);
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return; io.disconnect();
        var t0 = performance.now(), dur = 1200;
        (function step(now) {
          var k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
          t.textContent = fmt(Math.round(target * e)) + rest;
          if (k < 1) requestAnimationFrame(step);
        })(t0);
      }, { threshold: 0.6 });
      t.textContent = fmt(0) + rest;
      io.observe(el);
    });

    /* Scroll reveal */
    if (!reduce && "IntersectionObserver" in window) {
      var items = $$(".node, .term, .group > .node-top, .group > .lede, .filters, .proj, .panel, .rail-sec, .sec-head, .cs-sec > *, .meta, .impact > div, .hero-img, .related a, .next");
      var seen = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); seen.unobserve(e.target); } });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
      items.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < innerHeight * 0.95) return; /* already on screen: leave visible */
        el.setAttribute("data-reveal", "");
        seen.observe(el);
      });
      $$(".impact > div").forEach(function (d, k) { d.style.setProperty("--d", k * 90 + "ms"); });
    }

    /* Copy buttons */
    var toast = doc.createElement("div"); toast.className = "toast"; toast.setAttribute("role", "status"); doc.body.appendChild(toast);
    var tt;
    var say = function (msg) { toast.textContent = msg; toast.classList.add("show"); clearTimeout(tt); tt = setTimeout(function () { toast.classList.remove("show"); }, 1800); };
    $$("[data-copy]").forEach(function (b) {
      b.addEventListener("click", function () {
        var v = b.getAttribute("data-copy");
        var done = function () { b.textContent = "Copied"; say("Copied " + v); setTimeout(function () { b.textContent = "Copy"; }, 1600); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(done, function () { say(v); });
        else say(v);
      });
    });

    homePage();
    casePage(say);
  }

  function homePage() {
    var subflow = $(".subflow");
    if (!subflow) return;
    var cards = $$(".proj", subflow);

    /* Whole card opens its case study; border beam on hover */
    cards.forEach(function (c) {
      var a = $(".cta a", c);
      if (!a) return;
      c.classList.add("beam");
      c.addEventListener("click", function (e) {
        if (e.target.closest("a")) return;
        if (String(window.getSelection && window.getSelection())) return;
        if (e.metaKey || e.ctrlKey) window.open(a.href, "_blank"); else a.click();
      });
    });

    /* Rail of case studies, newest first, built from the cards themselves */
    var railSec = $("#work"), rail = $(".rail");
    if (railSec && rail) {
      cards.filter(function (c) { return $(".cta a", c); }).reverse().forEach(function (c) {
        var a = doc.createElement("a"), img = $(".thumb img", c);
        a.href = $(".cta a", c).getAttribute("href");
        a.innerHTML = '<div class="ri"></div><div class="rt"><span></span><b></b></div>';
        if (img) { var im = doc.createElement("img"); im.src = img.getAttribute("src"); im.alt = ""; im.loading = "lazy"; $(".ri", a).appendChild(im); }
        $(".rt span", a).textContent = $(".client", c).textContent;
        $(".rt b", a).textContent = $("h4", c).textContent;
        rail.appendChild(a);
      });
      railSec.hidden = false;
      var prev = $(".rp", railSec), next = $(".rn", railSec);
      var step = function () { var f = rail.querySelector("a"); return f ? f.getBoundingClientRect().width + 16 : 300; };
      var upd = function () { prev.disabled = rail.scrollLeft < 4; next.disabled = rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 4; };
      prev.addEventListener("click", function () { rail.scrollBy({ left: -step() * 2, behavior: "smooth" }); });
      next.addEventListener("click", function () { rail.scrollBy({ left: step() * 2, behavior: "smooth" }); });
      rail.addEventListener("scroll", upd, { passive: true }); window.addEventListener("resize", upd); upd();
    }

    /* Domain filters */
    var box = $(".filters");
    if (box) {
      var defs = [["all", "All projects"], ["case", "With case study"], ["auto", "Automotive"], ["health", "Healthcare"], ["fin", "Fintech, SaaS & web"], ["social", "Consumer & social"]];
      var count = function (k) { return cards.filter(function (c) { return k === "all" || (k === "case" ? !!$(".cta a", c) : c.getAttribute("data-domain") === k); }).length; };
      defs.forEach(function (d) {
        var b = doc.createElement("button"); b.type = "button"; b.setAttribute("data-f", d[0]); b.setAttribute("aria-pressed", d[0] === "all" ? "true" : "false");
        b.innerHTML = "<span></span><i></i>"; b.firstChild.textContent = d[1]; b.lastChild.textContent = count(d[0]);
        box.appendChild(b);
      });
      box.addEventListener("click", function (e) {
        var b = e.target.closest("button"); if (!b) return;
        var k = b.getAttribute("data-f");
        $$("button", box).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        subflow.classList.toggle("filtered", k !== "all");
        cards.forEach(function (c) {
          var on = k === "all" || (k === "case" ? !!$(".cta a", c) : c.getAttribute("data-domain") === k);
          c.classList.toggle("off", !on);
          if (on) c.classList.add("in");
        });
      });
    }

    /* Active section in the nav */
    var links = $$(".topnav a[href^='#']");
    var secs = links.map(function (a) { return $(a.getAttribute("href")); }).filter(Boolean);
    if (secs.length) {
      var spy = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          links.forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id); });
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      secs.forEach(function (s) { spy.observe(s); });
    }
  }

  function casePage() {
    var toc = $(".toc");
    if (!toc) return;
    var links = $$("a[href^='#']", toc);

    /* Mobile: the same contents as a sticky chip row */
    var chips = doc.createElement("nav"); chips.className = "toc-chips"; chips.setAttribute("aria-label", "On this page");
    links.forEach(function (a) { var c = a.cloneNode(true); chips.appendChild(c); });
    var body = $(".cs-body"); if (body) body.parentNode.insertBefore(chips, body);
    var chipLinks = $$("a", chips);

    var secs = links.map(function (a) { return $(a.getAttribute("href")); }).filter(Boolean);
    var setActive = function (id) {
      links.concat(chipLinks).forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === "#" + id); });
      var ac = chips.querySelector("a.active");
      if (ac && getComputedStyle(chips).display !== "none") chips.scrollTo({ left: ac.offsetLeft - 16, behavior: reduce ? "auto" : "smooth" });
    };
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: "-30% 0px -60% 0px" });
    secs.forEach(function (s) { spy.observe(s); });

    /* Lightbox for every screen on the page */
    var imgs = $$(".hero-img img, figure .frame img, .pair img").filter(function (im) { return !im.closest(".frame.wide"); });
    if (!imgs.length) return;
    var lb, cur = 0, lastFocus;
    var capOf = function (im) {
      var f = im.closest("figure"); var c = f && $("figcaption", f);
      return c ? c.textContent.trim() : (im.alt || "");
    };
    function show(k) {
      cur = (k + imgs.length) % imgs.length;
      var im = imgs[cur];
      $(".lb-stage img", lb).src = im.currentSrc || im.src;
      $(".lb-stage img", lb).alt = im.alt || "";
      $(".lb-cap", lb).textContent = capOf(im);
      $(".lb-count", lb).textContent = (cur + 1) + " / " + imgs.length;
    }
    function close() {
      if (!lb) return;
      lb.classList.remove("open");
      var el = lb; lb = null;
      setTimeout(function () { el.remove(); }, reduce ? 0 : 220);
      doc.body.style.overflow = "";
      doc.removeEventListener("keydown", key);
      if (lastFocus) lastFocus.focus();
    }
    function key(e) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") show(cur + 1);
      else if (e.key === "ArrowLeft") show(cur - 1);
      else if (e.key === "Tab") {
        var f = $$("button", lb); var i = f.indexOf(doc.activeElement);
        e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    }
    function open(k) {
      lastFocus = doc.activeElement;
      lb = doc.createElement("div"); lb.className = "lb"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true"); lb.setAttribute("aria-label", "Screen viewer");
      lb.innerHTML = '<div class="lb-top"><span class="lb-count"></span><button type="button" class="close" aria-label="Close">' + ICON.x + '</button></div>' +
        '<div class="lb-stage"><img alt=""></div><p class="lb-cap"></p>' +
        '<button type="button" class="nav prev" aria-label="Previous screen">' + ICON.l + '</button>' +
        '<button type="button" class="nav next" aria-label="Next screen">' + ICON.r + '</button>';
      doc.body.appendChild(lb);
      show(k);
      doc.body.style.overflow = "hidden";
      requestAnimationFrame(function () { lb.classList.add("open"); });
      $(".close", lb).addEventListener("click", close);
      $(".prev", lb).addEventListener("click", function () { show(cur - 1); });
      $(".next", lb).addEventListener("click", function () { show(cur + 1); });
      lb.addEventListener("click", function (e) { if (e.target === lb || e.target.classList.contains("lb-stage")) close(); });
      var sx = null;
      lb.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
      lb.addEventListener("touchend", function (e) { if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1)); sx = null; });
      doc.addEventListener("keydown", key);
      $(".close", lb).focus();
    }
    imgs.forEach(function (im, k) {
      im.classList.add("zoomable");
      im.setAttribute("tabindex", "0");
      im.setAttribute("role", "button");
      im.setAttribute("aria-label", "View full size: " + (im.alt || "screen"));
      im.addEventListener("click", function () { open(k); });
      im.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(k); } });
    });
  }

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init); else init();
})();
