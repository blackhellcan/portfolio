/* Site motion, built on GSAP + ScrollTrigger.
   Hero fade, scroll reveals, the About quote, count-up stats, image parallax and card tilt.
   Content is never changed: if GSAP fails to load or the viewer prefers reduced motion,
   everything simply shows, static. */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var gsap = window.gsap, ST = window.ScrollTrigger;
  function done() { root.classList.remove("gs"); }
  if (!gsap || !ST || reduce) { done(); return; }
  gsap.registerPlugin(ST);
  root.classList.add("gsap");

  /* Run a tween without fighting the element's own CSS transitions, then hand control back to CSS */
  function calm(els) { els.forEach(function (el) { el.style.transition = "none"; }); }
  function release(els) { els.forEach(function (el) { el.style.transition = ""; gsap.set(el, { clearProps: "transform,opacity" }); }); }

  /* 1. Hero: one soft fade-in, no word-by-word */
  function hero() {
    var els = $$(".hello > *, .cs-hero > *");
    if (!els.length) { done(); return; }
    calm(els);
    gsap.fromTo(els, { autoAlpha: 0, y: 12 }, {
      autoAlpha: 1, y: 0, duration: .7, ease: "power2.out", stagger: .06, delay: .05,
      onStart: done, onComplete: function () { release(els); }
    });
  }

  /* 2. Scroll reveals: sections and cards fade and rise in as they enter */
  function reveals() {
    var sel = ".sec-title, .offer-card, .cs-card, .col > *, .about-copy > *, .more > *, .jobs > *, .ai-card, .connect > *, .car, "
      + ".node, .term, .group > .node-top, .group > .lede, .filters, .proj, .panel, .rail-sec, .sec-head, .cs-sec > *, .related a, .next";
    var hero = $$(".hello, .cs-hero");
    var els = $$(sel).filter(function (el) {
      if (el.closest(".azc-panel")) return false;
      if (hero.some(function (h) { return h.contains(el); })) return false;
      return el.getBoundingClientRect().top > innerHeight * .92; /* already on screen: leave as is */
    });
    els = els.filter(function (el, i) { return els.indexOf(el) === i && !els.some(function (o) { return o !== el && o.contains(el); }); });
    if (!els.length) return;
    gsap.set(els, { autoAlpha: 0, y: 34 });
    ST.batch(els, {
      start: "top 92%", once: true,
      onEnter: function (batch) {
        calm(batch);
        gsap.to(batch, { autoAlpha: 1, y: 0, duration: .85, ease: "power3.out", stagger: .08, overwrite: true, onComplete: function () { release(batch); } });
      }
    });
    var photo = doc.querySelector(".about-photo");
    if (photo && photo.getBoundingClientRect().top > innerHeight * .92) {
      gsap.set(photo, { autoAlpha: 0, y: 30, rotation: -4 });
      ST.create({ trigger: photo, start: "top 90%", once: true, onEnter: function () {
        calm([photo]);
        gsap.to(photo, { autoAlpha: 1, y: 0, rotation: 4, duration: 1, ease: "power3.out", onComplete: function () { release([photo]); gsap.set(photo, { clearProps: "rotation" }); } });
      } });
    }
  }

  /* 3. About quote: words appear one by one, each flashing a soft pastel */
  function quote() {
    var q = doc.querySelector(".about-quote blockquote");
    if (!q) return;
    var text = q.textContent.trim();
    q.setAttribute("aria-label", text); q.textContent = "";
    var cs = getComputedStyle(root), words = [];
    text.split(/\s+/).forEach(function (w, i) {
      if (i) q.appendChild(doc.createTextNode(" "));
      var s = doc.createElement("span"); s.className = "w"; s.setAttribute("aria-hidden", "true"); s.textContent = w;
      q.appendChild(s); words.push(s);
    });
    var tint = function (i) { return cs.getPropertyValue("--w" + (i % 5 + 1)).trim() || "rgba(0,0,0,.06)"; };
    gsap.set(words, { autoAlpha: 0 });
    var tl = gsap.timeline({ paused: true });
    tl.to(words, { autoAlpha: 1, duration: .25, stagger: .09, ease: "none" })
      .fromTo(words, { backgroundColor: function (i) { return tint(i); } }, { backgroundColor: "rgba(0,0,0,0)", duration: .8, stagger: .09, ease: "power1.out" }, "<");
    ST.create({ trigger: q, start: "top 80%", once: true, onEnter: function () { tl.play(); } });
  }

  /* 4. Stats count up: "30% fewer", "1,000+ users" */
  function counters() {
    $$(".impact strong").forEach(function (el) {
      var t = el.firstChild;
      if (!t || t.nodeType !== 3) return;
      var m = t.textContent.match(/^(\d[\d,]*)([\s\S]*)$/);
      if (!m) return;
      var target = parseInt(m[1].replace(/,/g, ""), 10), rest = m[2], comma = m[1].indexOf(",") > -1;
      if (target < 2) return;
      el.setAttribute("aria-label", el.textContent);
      var fmt = function (v) { return (comma ? Math.round(v).toLocaleString("en-US") : String(Math.round(v))) + rest; };
      var o = { v: 0 };
      t.textContent = fmt(0);
      ST.create({ trigger: el, start: "top 90%", once: true, onEnter: function () {
        gsap.to(o, { v: target, duration: 1.4, ease: "power2.out", delay: .25, onUpdate: function () { t.textContent = fmt(o.v); } });
      } });
    });
  }

  /* 5. Parallax: case study images drift gently inside their frames */
  function parallax() {
    $$(".hero-img img, figure .frame img").forEach(function (img) {
      if (img.closest(".car, .carousel, .phones")) return;
      var box = img.parentElement;
      box.classList.add("gs-par");
      gsap.fromTo(img, { yPercent: -4, scale: 1.1 }, {
        yPercent: 4, scale: 1.1, ease: "none",
        scrollTrigger: { trigger: box, start: "top bottom", end: "bottom top", scrub: .6 }
      });
    });
  }

  /* 6. Card tilt: case study cards lean slightly toward the cursor */
  function tilt() {
    if (!(window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches)) return;
    $$(".cs-card, .more .proj").forEach(function (card) {
      card.classList.add("gs-tilt");
      gsap.set(card, { transformPerspective: 900 });
      var rx = gsap.quickTo(card, "rotationX", { duration: .5, ease: "power3.out" });
      var ry = gsap.quickTo(card, "rotationY", { duration: .5, ease: "power3.out" });
      var ty = gsap.quickTo(card, "y", { duration: .5, ease: "power3.out" });
      card.addEventListener("pointerenter", function () { gsap.set(card, { transformPerspective: 900 }); });
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        ry(x * 6); rx(-y * 5); ty(-6);
      });
      card.addEventListener("pointerleave", function () { rx(0); ry(0); ty(0); });
    });
  }

  function init() {
    hero(); reveals(); quote(); counters(); parallax(); tilt();
    addEventListener("load", function () { ST.refresh(); });
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init); else init();
})();
