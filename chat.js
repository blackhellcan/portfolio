/* Chat overlay: "Chat with Azhar". Local FAQ mode by default; set WORKER_URL to use a backend. */
const WORKER_URL = "";
(function () {
  "use strict";
  var doc = document, KEY = "azChatVisitor", TIMEOUT = 20000;
  var kb = null, kbPromise = null, visitor = loadVisitor(), msgs = [], busy = false, started = false, answers = 0, pending = "", askedName = false, askedCompany = false, askKind = "", seen = [];
  var sid = (function () {
    try { var s = sessionStorage.getItem("azChatSid"); if (s) return s; } catch (e) {}
    var id = "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    try { sessionStorage.setItem("azChatSid", id); } catch (e) {}
    return id;
  })();
  function clarity() { if (typeof window.clarity === "function") try { window.clarity.apply(window, arguments); } catch (e) {} }
  function el(tag, cls, text) { var n = doc.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function loadVisitor() {
    var v = {};
    try { v = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) {}
    return { name: String(v.name || ""), company: String(v.company || ""), declinedName: !!v.declinedName, declinedCompany: !!v.declinedCompany };
  }
  function saveVisitor() { try { localStorage.setItem(KEY, JSON.stringify(visitor)); } catch (e) {} }
  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>';
  var SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
  var CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  /* ---------- DOM ---------- */
  var launcher = el("button", "azc-launcher"); launcher.type = "button";
  launcher.setAttribute("aria-label", "Chat with me"); launcher.setAttribute("aria-haspopup", "dialog"); launcher.setAttribute("aria-expanded", "false");
  launcher.innerHTML = '<span class="azc-ava"><img src="img-web/azhar.webp" alt="" width="44" height="44"><i></i></span>';
  var panel = el("section", "azc-panel"); panel.id = "azc-panel"; panel.hidden = true;
  panel.setAttribute("role", "dialog"); panel.setAttribute("aria-labelledby", "azc-title"); panel.tabIndex = -1;
  var head = el("header", "azc-head"), ht = el("div", "azc-ht");
  var title = el("h2", null, "Chat with Azhar"); title.id = "azc-title";
  ht.appendChild(title); ht.appendChild(el("p", null, "AI version of me · online"));
  var hava = el("span", "azc-ava azc-ava-lg"); hava.innerHTML = '<img src="img-web/azhar.webp" alt="" width="40" height="40"><i></i>';
  var hl = el("div", "azc-hl"); hl.appendChild(hava); hl.appendChild(ht);
  var closeBtn = el("button", "azc-close"); closeBtn.type = "button"; closeBtn.setAttribute("aria-label", "Close chat"); closeBtn.innerHTML = CLOSE;
  head.appendChild(hl); head.appendChild(closeBtn);

  var chat = el("div", "azc-chat");
  var list = el("div", "azc-list"); list.setAttribute("aria-live", "polite"); list.setAttribute("role", "log"); list.tabIndex = 0; list.setAttribute("aria-label", "Conversation");
  var chips = el("div", "azc-chips");
  var form = el("form", "azc-form");
  var input = el("input"); input.type = "text"; input.maxLength = 500; input.placeholder = "Ask a question…"; input.setAttribute("aria-label", "Your question"); input.autocomplete = "off";
  var sendBtn = el("button", "azc-send"); sendBtn.type = "submit"; sendBtn.setAttribute("aria-label", "Send"); sendBtn.innerHTML = SEND;
  form.appendChild(input); form.appendChild(sendBtn);
  var foot = el("p", "azc-foot");
  foot.appendChild(doc.createTextNode("Details here may not be 100% accurate. For more, reach me on "));
  var fTel = el("a", null, "call"); fTel.href = "tel:+919769211554"; foot.appendChild(fTel);
  foot.appendChild(doc.createTextNode(" or "));
  var fMail = el("a", null, "email"); fMail.href = "mailto:mazhar.shaikh91@outlook.in"; foot.appendChild(fMail);
  foot.appendChild(doc.createTextNode("."));
  chat.appendChild(list); chat.appendChild(chips); chat.appendChild(form); chat.appendChild(foot);
  panel.appendChild(head); panel.appendChild(chat);

  /* ---------- rendering ---------- */
  function renderRich(parent, text) {
    var re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*(.+?)\*\*|(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)]|mailto:[^\s<>"']+[^\s<>"'.,;:!?)]|[\w.+-]+@[\w-]+\.[\w.-]*\w)/g, last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) parent.appendChild(doc.createTextNode(text.slice(last, m.index)));
      if (m[1] != null) { var L = el("a", "azc-cta", m[1]); siteLink(L, m[2]); parent.appendChild(L); }
      else if (m[3] != null) parent.appendChild(el("strong", null, m[3]));
      else {
        var u = m[4], a = el("a", null, u.replace(/^mailto:/, ""));
        a.href = /^(https?:|mailto:)/.test(u) ? u : "mailto:" + u; a.target = "_blank"; a.rel = "noopener";
        parent.appendChild(a);
      }
      last = re.lastIndex;
    }
    if (last < text.length) parent.appendChild(doc.createTextNode(text.slice(last)));
  }
  var SITE = "https://blackhellcan.github.io/portfolio/";
  function pageOf(p) { p = String(p || "").split("#")[0].split("?")[0].replace(/^.*\//, ""); return p || "index.html"; }
  function siteLink(a, href) {
    if (href.indexOf(SITE) !== 0) { a.href = href; a.target = "_blank"; a.rel = "noopener"; return; }
    var rel = href.slice(SITE.length) || "index.html", hash = rel.indexOf("#") > -1 ? rel.slice(rel.indexOf("#") + 1) : "";
    a.href = rel;
    a.addEventListener("click", function (e) {
      clarity("event", "chat_link");
      if (pageOf(rel) !== pageOf(location.pathname)) { saveLog(true); return; }
      var t = hash && doc.getElementById(hash); if (!t) return;
      e.preventDefault();
      if (window.innerWidth < 600) close();
      t.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
      try { history.replaceState(null, "", "#" + hash); } catch (er) {}
    });
  }
  function saveLog(openState) {
    try { sessionStorage.setItem("azChatLog", JSON.stringify({ msgs: msgs, answers: answers, askedName: askedName, askedCompany: askedCompany, seen: seen, open: openState == null ? !panel.hidden : openState })); } catch (e) {}
  }
  function loadLog() { try { return JSON.parse(sessionStorage.getItem("azChatLog") || "null"); } catch (e) { return null; } }
  function addMsg(role, text) {
    var b = el("div", "azc-msg azc-" + role);
    if (role === "bot") {
      var ul = null;
      String(text).split(/\n+/).forEach(function (line) {
        var li = /^\s*(?:[-*•]|\d+[.)])\s+(.*)$/.exec(line);
        if (li) { if (!ul) { ul = el("ul"); b.appendChild(ul); } var it = el("li"); renderRich(it, li[1]); ul.appendChild(it); }
        else if (line.trim()) { ul = null; var d = el("p"); renderRich(d, line.trim()); b.appendChild(d); }
      });
    }
    else b.textContent = text;
    list.appendChild(b); list.scrollTop = list.scrollHeight; return b;
  }
  function typing() {
    var b = el("div", "azc-msg azc-bot azc-typing"); b.setAttribute("aria-label", "Assistant is typing"); b.setAttribute("role", "status");
    b.innerHTML = "<i></i><i></i><i></i>"; list.appendChild(b); list.scrollTop = list.scrollHeight;
    if (WORKER_URL) setTimeout(function () { if (b.isConnected) { b.appendChild(el("span", "azc-think", "Thinking")); list.scrollTop = list.scrollHeight; } }, 1400);
    return b;
  }

  /* ---------- local answers ---------- */
  function norm(s) { return " " + String(s).toLowerCase().replace(/[^\p{L}\p{N}\s+#]/gu, " ").replace(/\s+/g, " ").trim() + " "; }
  function has(t, term) { return t.indexOf(" " + norm(term).trim() + " ") !== -1; }
  var ASK = /\b(do you know|does he know|can he|can you|learn|know|knows|experience (with|in|on)|worked (on|with|in)|familiar|proficient|use|uses|skills?|tools?|software|industry|industries|domain|certified|certifications?|platform|product|language)\b/;
  var STOP = /^(a|an|the|any|his|her|he|she|azhar|azhars|you|your|their|some|this|that|these|those|work|working|it|them|of|and|or|to)$/;
  function subjectOf(q) {
    var m = /\b(?:with|in|on|using|of|use|uses|know|knows|learn|learns)\s+(.+)$/i.exec(String(q).replace(/[?!.,;]+\s*$/, ""));
    if (!m) return "";
    return m[1].split(/\s+/).filter(function (w) { return w && !STOP.test(w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")); }).slice(0, 4).join(" ").replace(/[?!.,;]+$/, "");
  }
  var SECT = [
    ["learned", /\b(didn.?t go|go(ne)? wrong|went wrong|fail|mistake|setback|didn.?t work|not to plan)/],
    ["hard", /\b(hard|difficult|challeng|constraint|tricky|obstacle)/],
    ["decisions", /\b(thinking|pivot|chang|decision|decide|choice|chose|trade ?off|why did you)/],
    ["role", /\b(role|your part|what did you do|who did|your team|team size|led)\b/],
    ["problem", /\b(short version|summary|summari[sz]e|overview|problem|brief|context|about (this|it))/],
    ["reflection", /\b(learn|lesson|reflect|differently|takeaway|improve|next)/],
    ["impact", /\b(impact|results?|outcomes?|metrics?|numbers|success|launch|ended up|how many users)\b/],
    ["process", /\b(process|approach|research|method|workshop|steps|how did you|left out|cut|prioriti)/],
    ["solution", /\b(solution|final design|screens?|features?|what (do|did) (users|riders|vendors|customers|investors|learners) see|what did you (build|design|make))\b/]];
  function curCase() { var id = pageOf(location.pathname).replace(/\.html$/, ""); return kb && kb.page_ctx && kb.page_ctx[id] ? id : ""; }
  function pageAnswer(q) {
    var cid = curCase(); if (!cid) return null;
    var t = norm(q), own = "cs-" + cid.replace(/^case-/, ""), other = (kb.faq || []).some(function (f) {
      return /^cs-/.test(f.id) && f.id !== own && !(own === "cs-youngartiste" && f.id === "cs-ya") && (f.keywords || []).some(function (w) { return has(t, w); }); });
    if (other) return null;
    var secs = kb.page_ctx[cid].sections;
    for (var i = 0; i < SECT.length; i++) {
      var sid = SECT[i][0]; if (!SECT[i][1].test(t)) continue;
      if (sid === "reflection" && !secs.reflection) sid = "learned";
      var sec = secs[sid]; if (!sec || (!sec.lead && !(sec.points || []).length)) continue;
      var out = ["**" + sec.h + "**"]; if (sec.lead) out.push(sec.lead);
      (sec.points || []).slice(0, 4).forEach(function (p) { out.push("- " + p); });
      out.push("[Jump to this section](" + SITE + cid + ".html#" + (sec.anchor || sid) + ")");
      return out.join("\n");
    }
    return null;
  }
  function localAnswer(q) {
    var t = norm(q), k = kb || {}, thing = subjectOf(q);
    if (k.learnable_reply && thing && ASK.test(t) && !(k.known || []).some(function (w) { return has(t, w); }))
      return k.learnable_reply.replace(/\{thing\}/g, thing);
    var pa = pageAnswer(q); if (pa) return pa;
    var st = norm(thing), best = null, bs = 0;
    (k.faq || []).forEach(function (f) {
      var s = 0; (f.keywords || []).forEach(function (w) { if (has(t, w)) s += thing && has(st, w) ? 2 : 1; });
      if (s > bs) { bs = s; best = f; }
    });
    if (best) return best.answer;
    return k.fallback || "I'm not sure about that one. Try the email link on the contact section.";
  }
  function setVisitor(v) {
    var changed = false;
    ["name", "company"].forEach(function (k) {
      if (v && typeof v[k] === "string" && v[k].trim() && v[k].trim() !== visitor[k]) { visitor[k] = v[k].trim().slice(0, 120); changed = true; if (k === "company") clarity("set", "chat_company", visitor.company); }
    });
    if (changed) saveVisitor();
  }
  async function remoteAnswer() {
    var ac = new AbortController(), timer = setTimeout(function () { ac.abort(); }, TIMEOUT);
    try {
      var r = await fetch(WORKER_URL + "/chat", { method: "POST", headers: { "Content-Type": "application/json" }, signal: ac.signal,
        body: JSON.stringify({ session: sid, visitor: { name: visitor.name, company: visitor.company }, page: location.pathname, messages: msgs }) });
      var d = await r.json();
      if (!r.ok || d.error || !d.reply) throw new Error(d.error || "bad response");
      setVisitor(d.visitor);
      return d.reply;
    } finally { clearTimeout(timer); }
  }

  /* Optional visitor details, asked politely in local mode only */
  var DECLINE = /^(i would |i d |id )?(no|nope|skip|rather not|prefer not|not now|later|no thanks|no thank you)\b/;
  var QWORD = /^(what|how|why|does|do|can|is|are|where|when|which|who|tell)\b/i;
  function takeAnswer(text, kind) {
    if (DECLINE.test(norm(text).trim())) { visitor[kind === "name" ? "declinedName" : "declinedCompany"] = true; saveVisitor(); return kb.ask_declined || "No problem at all. Ask me anything else."; }
    if (/\?/.test(text) || QWORD.test(text.trim())) return null;
    var v = text.trim(), prev;
    do { prev = v; v = v.replace(/^(i['\u2019]?m|i am|my name is|this is|it['\u2019]?s|i work at|we are|we['\u2019]re|from|at)\s+/i, ""); } while (v !== prev);
    v = v.replace(/[.!,;]+$/, "").trim();
    if (!v || v.split(/\s+/).length > 5) return null;
    visitor[kind] = v.slice(0, 120); saveVisitor();
    if (kind === "company") clarity("set", "chat_company", v);
    var tpl = kind === "name" ? (kb.thanks_name || "Nice to meet you, {name}!") : (kb.thanks_company || "Thanks, {company} sounds great.");
    return tpl.replace(/\{name\}/g, visitor.name).replace(/\{company\}/g, visitor.company);
  }
  function maybeAsk() {
    if (answers >= 2 && !visitor.name && !visitor.declinedName && !askedName) { askedName = true; askKind = "name"; return kb.ask_name || "By the way, what's your name?"; }
    if (answers >= 4 && !visitor.company && !visitor.declinedCompany && !askedCompany) { askedCompany = true; askKind = "company"; return kb.ask_company || "Which company are you with? Totally optional."; }
    return "";
  }
  function say(text) { addMsg("bot", text); msgs.push({ role: "assistant", content: text }); saveLog(); }
  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function wait(ms) { return new Promise(function (r) { setTimeout(r, REDUCED ? Math.min(ms, 300) : ms); }); }
  function paceFor(t) { return Math.min(2400, 750 + String(t || "").length * 5 + Math.random() * 350); }
  async function typeThen(text, since) { var left = paceFor(text) - (Date.now() - since); if (left > 0) await wait(left); }

  async function send(text) {
    text = text.trim(); if (!text || busy) return;
    busy = true; sendBtn.disabled = true; input.value = ""; chips.hidden = true;
    addMsg("user", text); msgs.push({ role: "user", content: text }); saveLog();
    clarity("event", "chat_message");
    var t0 = Date.now(); await wait(250); var t = typing(), reply = null, local = false, ask = pending; pending = "";
    if (ask) { await kbPromise; reply = takeAnswer(text, ask); if (reply != null) { await typeThen(reply, t0); t.remove(); say(reply); busy = false; sendBtn.disabled = false; input.focus(); return; } }
    if (WORKER_URL) { try { reply = await remoteAnswer(); } catch (e) { reply = null; } }
    if (reply == null) { local = true; await kbPromise; reply = localAnswer(text); }
    await typeThen(reply, t0); t.remove(); say(reply); answers++;
    busy = false; sendBtn.disabled = false; input.focus();
    var q = local ? maybeAsk() : "", n = msgs.length;
    if (q) {
      await wait(500); if (msgs.length !== n || busy) { if (askKind === "name") askedName = false; else askedCompany = false; return; }
      var t2 = typing(); await wait(900); t2.remove();
      if (msgs.length !== n || busy) { if (askKind === "name") askedName = false; else askedCompany = false; return; }
      pending = askKind; say(q);
    }
  }

  /* ---------- flow ---------- */
  function loadKb() {
    if (kbPromise) return kbPromise;
    kbPromise = fetch("chat-kb.json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { kb = j; }).catch(function () { kb = {}; });
    return kbPromise;
  }
  async function start() {
    if (!started) {
      started = true; await loadKb();
      var saved = loadLog();
      if (saved && saved.msgs && saved.msgs.length) {
        msgs = saved.msgs; answers = saved.answers || 0; askedName = !!saved.askedName; askedCompany = !!saved.askedCompany; seen = saved.seen || [];
        msgs.forEach(function (m) { addMsg(m.role === "user" ? "user" : "bot", m.content); });
        if (msgs.some(function (m) { return m.role === "user"; })) chips.hidden = true;
      } else {
        var w = (kb.welcome || "Hi! Ask me anything about Azhar.");
        addMsg("bot", w.replace(/\s*\{name\}/g, visitor.name ? " " + visitor.name.split(/\s+/)[0] : ""));
      }
      var cid = curCase();
      ((cid && kb.page_suggestions) || kb.suggestions || []).forEach(function (s) {
        var c = el("button", "azc-chip", s); c.type = "button"; c.addEventListener("click", function () { send(s); }); chips.appendChild(c);
      });
      if (cid && seen.indexOf(cid) === -1) {
        seen.push(cid); chips.hidden = false;
        if (kb.page_intro) say(kb.page_intro.replace(/\{title\}/g, kb.page_ctx[cid].title));
      }
    }
    input.focus();
  }
  function open() {
    if (!panel.hidden) return;
    panel.hidden = false; launcher.hidden = true; launcher.setAttribute("aria-expanded", "true");
    requestAnimationFrame(function () { panel.classList.add("azc-on"); });
    clarity("event", "chat_open"); start().then(function () { saveLog(true); });
  }
  function close() {
    if (panel.hidden) return;
    panel.classList.remove("azc-on"); panel.hidden = true; launcher.hidden = false; launcher.setAttribute("aria-expanded", "false");
    saveLog(false); launcher.focus();
  }
  launcher.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  doc.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) { e.preventDefault(); close(); } });
  form.addEventListener("submit", function (e) { e.preventDefault(); send(input.value); });
  function mount() { doc.body.appendChild(launcher); doc.body.appendChild(panel); var s = loadLog(); if (s && s.open) open(); }
  if (doc.body) mount(); else doc.addEventListener("DOMContentLoaded", mount);
})();
