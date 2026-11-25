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
  if (!gsap || !ST || reduce) { return; }
  gsap.registerPlugin(ST);
  root.classList.add("gsap");

  /* Run a tween without fighting the element's own CSS transitions, then hand control back to CSS */
  function calm(els) { els.forEach(function (el) { el.style.transition = "none"; }); }
  function release(els) { els.forEach(function (el) { el.style.transition = ""; gsap.set(el, { clearProps: "transform,opacity" }); }); }

  /* 1. Hero fade is plain CSS (soft.css) so the first screen never waits for GSAP */

  /* 2. Scroll reveals: sections and cards fade and rise in as they enter */
  function reveals() {
    var sel = ".how-note, .col > *, .certs-lede, .cert-card, .cert-next, .about-copy > *, .more > *, .jobs > *, .ai-card, .connect > *, .car, "
      + ".node, .term, .group > .node-top, .group > .lede, .filters, .proj, .panel, .rail-sec, .sec-head, .cs-sec > *, .related a, .next";
    var hero = $$(".hello, .cs-hero");
    var els = $$(sel).filter(function (el) {
      if (el.closest(".azc-panel, .sec-title, #about .about-top, #contact")) return false;
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

  /* 5. Parallax: case study images drift gently as you scroll (the whole frame moves, so nothing is cropped) */
  function parallax() {
    $$(".hero-img, figure .frame").forEach(function (box) {
      if (box.closest(".car, .carousel, .phones")) return;
      gsap.fromTo(box, { y: 18 }, {
        y: -18, ease: "none",
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


  /* 7. Section titles: words rise out of a mask, one after another */
  function titles() {
    $$(".sec-title").forEach(function (h) {
      var text = h.textContent.trim(); if (!text) return;
      h.setAttribute("aria-label", text); h.textContent = "";
      var inner = [];
      text.split(/\s+/).forEach(function (w, i) {
        if (i) h.appendChild(doc.createTextNode(" "));
        var o = doc.createElement("span"); o.className = "gs-mask"; o.setAttribute("aria-hidden", "true");
        var s = doc.createElement("span"); s.textContent = w; o.appendChild(s); h.appendChild(o); inner.push(s);
      });
      gsap.set(inner, { yPercent: 115, rotation: 4 });
      ST.create({ trigger: h, start: "top 88%", once: true, onEnter: function () {
        gsap.to(inner, { yPercent: 0, rotation: 0, duration: 1, ease: "power4.out", stagger: .07 });
      } });
    });
  }

  /* 8. Offer cards flip up from below, in a wave */
  function offerCards() {
    var cards = $$(".offer-card");
    if (!cards.length) return;
    gsap.set(cards, { autoAlpha: 0, y: 90, rotationX: -28, transformPerspective: 1000, transformOrigin: "50% 100%" });
    ST.batch(cards, { start: "top 90%", once: true, onEnter: function (b) {
      gsap.to(b, { autoAlpha: 1, y: 0, rotationX: 0, duration: 1.1, ease: "power3.out", stagger: .12, onComplete: function () { gsap.set(b, { clearProps: "transform,opacity,visibility" }); } });
    } });
  }

  /* 9. Case study cards: the image wipes open and settles, then the text follows */
  function caseCards() {
    $$(".cs-card").forEach(function (card, i) {
      var box = card.querySelector(".cs-img"), img = box && box.querySelector("img");
      var text = $$(".cs-pills, strong, .cs-desc", card);
      if (!box || !img) return;
      card.classList.add("bg-wait");
      gsap.set(box, { clipPath: "inset(100% 0% 0% 0% round 28px)" });
      gsap.set(img, { scale: 1.3 });
      gsap.set(text, { autoAlpha: 0, y: 24 });
      ST.create({ trigger: card, start: "top 85%", once: true, onEnter: function () {
        var d = (i % 2) * .15;
        gsap.to(box, { clipPath: "inset(0% 0% 0% 0% round 28px)", duration: 1.2, ease: "power4.inOut", delay: d, onComplete: function () { gsap.set(box, { clearProps: "clipPath" }); } });
        gsap.to(img, { scale: 1, duration: 1.6, ease: "power3.out", delay: d, onComplete: function () { gsap.set(img, { clearProps: "transform" }); } });
        gsap.delayedCall(d + .8, function () { card.classList.add("bg-in"); });  /* image first, then its container */
        gsap.to(text, { autoAlpha: 1, y: 0, duration: .8, ease: "power3.out", stagger: .08, delay: d + 1 });
      } });
    });
  }

  /* 10. How I work: on large screens the section holds still while scrolling walks through the four steps */
  function howScroll() {
    var sec = doc.getElementById("how"), wrap = sec && sec.querySelector(".how-tabs");
    var tabs = $$(".hw-tab");
    if (!wrap || tabs.length < 2) return;
    var panels = sec.querySelector(".hw-panels");
    gsap.set(tabs, { autoAlpha: 0, x: -60 }); gsap.set(panels, { autoAlpha: 0, x: 60 });
    ST.create({ trigger: sec, start: "top 60%", once: true, onEnter: function () {
      gsap.to(tabs, { autoAlpha: 1, x: 0, duration: .9, ease: "power3.out", stagger: .1, onComplete: function () { gsap.set(tabs, { clearProps: "transform" }); } });
      gsap.to(panels, { autoAlpha: 1, x: 0, duration: 1, ease: "power3.out", delay: .2, onComplete: function () { gsap.set(panels, { clearProps: "transform" }); } });
    } });
    var mm = gsap.matchMedia();
    mm.add("(min-width: 900px) and (min-height: 640px)", function () {
      var cur = -1, n = tabs.length;
      var st = ST.create({
        trigger: sec, start: "top 84px", end: "+=" + (n * 55) + "%", pin: true, anticipatePin: 1,
        onUpdate: function (s) {
          var i = Math.min(n - 1, Math.floor(s.progress * n));
          if (i !== cur) { cur = i; tabs[i].dispatchEvent(new CustomEvent("hw:pick")); }
        }
      });
      sec.classList.add("hw-pinned");
      var go = tabs.map(function (t, i) {
        var f = function () { if (st.isActive) scrollTo({ top: st.start + (st.end - st.start) * (i + .5) / n, behavior: "smooth" }); };
        t.addEventListener("click", f); return f;
      });
      return function () { sec.classList.remove("hw-pinned"); tabs.forEach(function (t, i) { t.removeEventListener("click", go[i]); }); };
    });
  }


  /* 11. About: the section holds while its text fills from light to dark, the leading words lit in the accent colour */
  function aboutFill() {
    var top = doc.querySelector("#about .about-top");
    var ps = $$("#about .about-copy p");
    if (!top || !ps.length) return;
    var words = [];
    ps.forEach(function (p) {
      var text = p.textContent; p.setAttribute("aria-label", text.trim()); p.textContent = "";
      text.trim().split(/\s+/).forEach(function (w, i) {
        if (i) p.appendChild(doc.createTextNode(" "));
        var s = doc.createElement("span"); s.className = "fw"; s.setAttribute("aria-hidden", "true"); s.textContent = w;
        p.appendChild(s); words.push(s);
      });
    });
    root.classList.add("about-fill");
    var cs = getComputedStyle(root), ink = cs.getPropertyValue("--ink").trim(), acc = cs.getPropertyValue("--accent").trim();
    var tl = gsap.timeline({ paused: true });
    tl.to(words, { color: function () { return acc; }, duration: .3, stagger: .06, ease: "none" })
      .to(words, { color: function () { return ink; }, duration: .3, stagger: .06, ease: "none" }, .5);
    var mm = gsap.matchMedia();
    mm.add("(min-width: 900px) and (min-height: 700px)", function () {
      ST.create({ trigger: top, start: "center center", end: "+=100%", pin: true, scrub: .5, animation: tl, anticipatePin: 1 });
    });
    mm.add("(max-width: 899px), (max-height: 699px)", function () {
      ST.create({ trigger: top, start: "top 75%", end: "bottom 35%", scrub: .5, animation: tl });
    });
    /* clear the inline colours on theme change so dark mode reads */
    new MutationObserver(function () {
      var c2 = getComputedStyle(root); ink = c2.getPropertyValue("--ink").trim(); acc = c2.getPropertyValue("--accent").trim();
      tl.invalidate(); ST.refresh();
    }).observe(root, { attributes: true, attributeFilter: ["data-az"] });
  }


  /* 12. Let's Connect: the whole section slides up from the bottom as you scroll to it */
  function connectSlide() {
    var c = doc.getElementById("contact");
    if (!c) return;
    gsap.fromTo(c, { y: 220 }, { y: 0, ease: "power2.out", scrollTrigger: { trigger: c, start: "top bottom", end: "bottom bottom", scrub: .6 } });
  }


  function init() {
    titles(); reveals(); offerCards(); caseCards(); howScroll(); aboutFill(); connectSlide(); quote(); counters(); parallax(); tilt();
    addEventListener("load", function () { ST.refresh(); });
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init); else init();
})();
