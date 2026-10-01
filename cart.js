/* India Selection — sourcing cart (brand-level RFQ, pure frontend)
 * Cart stored in localStorage. Submit opens the buyer's mail client
 * pre-addressed to the sourcing inbox. No backend required.
 */
(function () {
  "use strict";

  var SITE_BASE = "https://india-selection.com/";
  var CART_EMAIL = "bob@india-selection.com";
  var KEY = "is-cart";

  // ---------- helpers ----------
  function isHi() { return document.body.classList.contains("hi"); }
  function t(en, hi) { return isHi() ? hi : en; }

  function escHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c];
    });
  }
  function escAttr(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function getCart() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch (e) { return []; }
  }
  function saveCart(c) {
    localStorage.setItem(KEY, JSON.stringify(c));
    updateBadge();
  }

  function getQty(id) {
    var c = getCart(), x = c.find(function (y) { return y.id === id; });
    return x ? (x.qty || 1) : 0;
  }
  function setQty(id, q) {
    var c = getCart(), x = c.find(function (y) { return y.id === id; });
    if (x) { x.qty = Math.max(1, q); saveCart(c); }
  }
  function setNote(id, n) {
    var c = getCart(), x = c.find(function (y) { return y.id === id; });
    if (x) { x.note = n; saveCart(c); }
  }
  function removeFromCart(id) {
    var c = getCart().filter(function (y) { return y.id !== id; });
    saveCart(c);
  }
  function addToCart(item) {
    var c = getCart();
    var ex = c.find(function (x) { return x.id === item.id; });
    if (ex) { ex.qty = (ex.qty || 1) + 1; }
    else { c.push({ id: item.id, name: item.name, brand: item.brand || "", cat: item.cat, href: item.href, qty: 1, note: "" }); }
    saveCart(c);
  }
  function totalQty() {
    return getCart().reduce(function (s, x) { return s + (x.qty || 1); }, 0);
  }

  // ---------- badge + button sync ----------
  function updateBadge() {
    var tg = document.querySelector(".cart-toggle");
    if (tg) {
      var b = tg.querySelector(".badge");
      if (b) b.textContent = totalQty();
      tg.classList.toggle("has-items", totalQty() > 0);
    }
    syncButtons();
  }
  function syncButtons() {
    var ids = getCart().map(function (x) { return x.id; });
    document.querySelectorAll("[data-add-to-cart]").forEach(function (b) {
      b.classList.toggle("in-cart", ids.indexOf(b.getAttribute("data-id")) >= 0);
    });
  }

  // ---------- header icon ----------
  function injectIcon() {
    if (document.querySelector(".cart-toggle")) return;
    var ref = document.querySelector(".lang-btn");
    var btn = document.createElement("button");
    btn.className = "cart-toggle";
    btn.setAttribute("type", "button");
    btn.setAttribute("aria-label", "Cart");
    btn.innerHTML = '🛒<span class="badge">0</span>';
    btn.addEventListener("click", function (e) { e.preventDefault(); openDrawer(); });
    if (ref && ref.parentNode) { ref.parentNode.insertBefore(btn, ref); }
    else {
      var nav = document.querySelector(".nav-inner") || document.querySelector("header");
      if (nav) nav.appendChild(btn);
    }
  }

  // ---------- drawer ----------
  function buildDrawer() {
    if (document.getElementById("cartDrawer")) return;
    var ov = document.createElement("div");
    ov.className = "cart-overlay";
    ov.id = "cartOverlay";
    ov.addEventListener("click", closeDrawer);
    var dw = document.createElement("aside");
    dw.className = "cart-drawer";
    dw.id = "cartDrawer";
    dw.innerHTML =
      '<div class="ch"><h3 data-en="Your list" data-hi="आपकी सूची">Your list</h3>' +
      '<button class="x" type="button" aria-label="close">×</button></div>' +
      '<div class="clist" id="cartList"></div>' +
      '<div class="cart-foot"><div class="cnt" id="cartCnt"></div>' +
      '<a class="btn-cart" href="cart.html" data-en="View full list & submit" data-hi="पूरी सूची देखें और भेजें">View full list &amp; submit</a></div>';
    document.body.appendChild(ov);
    document.body.appendChild(dw);
    dw.querySelector(".x").addEventListener("click", closeDrawer);
  }
  function renderDrawer() {
    var list = document.getElementById("cartList");
    if (!list) return;
    var cart = getCart();
    if (!cart.length) {
      list.innerHTML = '<div class="cart-empty" data-en="Your list is empty. Add the brands or products you want sourced." data-hi="आपकी सूची खाली है। सोर्स करने के ब्रांड या उत्पाद जोड़ें।">Your list is empty. Add the brands or products you want sourced.</div>';
      var ec = document.getElementById("cartCnt"); if (ec) ec.textContent = "";
      applyCartLang();
      return;
    }
    list.innerHTML = cart.map(function (it) {
      return '<div class="cart-item"><div class="ci-info">' +
        '<div class="ci-name">' + escHtml(it.name) + '</div>' +
        (it.brand && it.brand !== it.name ? '<div class="ci-brand">' + escHtml(it.brand) + '</div>' : '') +
        '<div class="ci-cat">' + escHtml(it.cat || "") + '</div>' +
        '<div class="ci-ctrl"><span class="stepper">' +
        '<button type="button" data-act="dec" data-id="' + escAttr(it.id) + '">−</button>' +
        '<span class="q">' + it.qty + '</span>' +
        '<button type="button" data-act="inc" data-id="' + escAttr(it.id) + '">+</button></span>' +
        '<button type="button" class="rm" data-act="rm" data-id="' + escAttr(it.id) + '">✕</button></div>' +
        '<input class="ci-note" type="text" data-act="note" data-id="' + escAttr(it.id) + '" placeholder="Note (qty, specs…)" value="' + escAttr(it.note || "") + '"/></div></div>';
    }).join("");
    bindItemControls(list);
    var cnt = document.getElementById("cartCnt");
    var n = cart.length, q = totalQty();
    cnt.setAttribute("data-en", n + " product" + (n > 1 ? "s" : "") + " · " + q + " total");
    cnt.setAttribute("data-hi", n + " उत्पाद · " + q + " कुल");
    cnt.textContent = isHi() ? cnt.getAttribute("data-hi") : cnt.getAttribute("data-en");
    applyCartLang();
  }
  function openDrawer() {
    renderDrawer();
    var d = document.getElementById("cartDrawer"), o = document.getElementById("cartOverlay");
    if (d) d.classList.add("open");
    if (o) o.classList.add("open");
  }
  function closeDrawer() {
    var d = document.getElementById("cartDrawer"), o = document.getElementById("cartOverlay");
    if (d) d.classList.remove("open");
    if (o) o.classList.remove("open");
  }

  // ---------- cart page ----------
  function renderCartPage() {
    var root = document.getElementById("cartRoot");
    if (!root) return;
    var cart = getCart();
    if (!cart.length) {
      root.innerHTML = '<div class="cart-empty-page"><p data-en="Your procurement list is empty." data-hi="आपकी सोर्सिंग सूची खाली है।">Your procurement list is empty.</p>' +
        '<p><a href="categories.html" data-en="Browse brands →" data-hi="ब्रांड देखें →">Browse brands →</a></p></div>';
      applyCartLang();
      return;
    }
    var itemsHtml = cart.map(function (it) {
      return '<div class="ci"><div class="ci-main">' +
        '<div class="ci-name">' + escHtml(it.name) + '</div>' +
        (it.brand && it.brand !== it.name ? '<div class="ci-brand">' + escHtml(it.brand) + '</div>' : '') +
        '<div class="ci-cat">' + escHtml(it.cat || "") + '</div>' +
        '<a class="ci-link" href="' + escAttr(it.href) + '" target="_blank" rel="noopener" data-en="Open brand page ↗" data-hi="ब्रांड पेज खोलें ↗">Open brand page ↗</a>' +
        '<div class="ci-ctrl"><span class="stepper">' +
        '<button type="button" data-act="dec" data-id="' + escAttr(it.id) + '">−</button>' +
        '<span class="q">' + it.qty + '</span>' +
        '<button type="button" data-act="inc" data-id="' + escAttr(it.id) + '">+</button></span>' +
        '<button type="button" class="rm" data-act="rm" data-id="' + escAttr(it.id) + '">✕</button></div>' +
        '<input class="ci-note" type="text" data-act="note" data-id="' + escAttr(it.id) + '" placeholder="Note (qty, specs, target price…)" value="' + escAttr(it.note || "") + '"/></div></div>';
    }).join("");
    root.innerHTML =
      '<div class="cart-items">' + itemsHtml + '</div>' +
      '<form class="cart-form" id="cartForm" novalidate>' +
      '<div class="row"><label data-en="Your name" data-hi="आपका नाम">Your name</label>' +
      '<input name="name" type="text" required placeholder="e.g. Zhang Wei"/></div>' +
      '<div class="row"><label data-en="Contact (email / WhatsApp / WeChat)" data-hi="संपर्क (ईमेल / WhatsApp / WeChat)">Contact (email / WhatsApp / WeChat)</label>' +
      '<input name="contact" type="text" required placeholder="+86 / email / WeChat ID"/></div>' +
      '<div class="row"><label data-en="Extra notes" data-hi="अतिरिक्त नोट्स">Extra notes</label>' +
      '<textarea name="notes" placeholder="Target price, delivery, MOQ, certifications…"></textarea></div>' +
      '<p class="hint" data-en="We will email you pricing and lead time. This opens your mail app pre-filled." data-hi="हम ईमेल से कीमत व लीड टाइम भेजेंगे। यह आपका मेल ऐप पूर्व-भरा खोलेगा।">We will email you pricing and lead time. This opens your mail app pre-filled.</p>' +
      '<button type="submit" class="btn-cart" data-en="Submit procurement request" data-hi="सोर्सिंग अनुरोध भेजें">Submit procurement request</button>' +
      '</form>';
    bindItemControls(root);
    var form = document.getElementById("cartForm");
    if (form) form.addEventListener("submit", function (e) { e.preventDefault(); submitByEmail(); });
    applyCartLang();
  }

  function bindItemControls(scope) {
    scope.querySelectorAll('[data-act]').forEach(function (el) {
      el.addEventListener("click", function () {
        var id = el.getAttribute("data-id"), act = el.getAttribute("data-act");
        if (act === "inc") setQty(id, getQty(id) + 1);
        else if (act === "dec") setQty(id, Math.max(1, getQty(id) - 1));
        else if (act === "rm") removeFromCart(id);
        renderDrawer(); renderCartPage(); updateBadge();
      });
    });
    scope.querySelectorAll('[data-act="note"]').forEach(function (el) {
      el.addEventListener("input", function () { setNote(el.getAttribute("data-id"), el.value); });
    });
  }

  function submitByEmail() {
    var cart = getCart();
    if (!cart.length) return;
    var form = document.getElementById("cartForm");
    if (!form) return;
    var name = (form.querySelector('[name="name"]').value || "").trim();
    var contact = (form.querySelector('[name="contact"]').value || "").trim();
    var notes = (form.querySelector('[name="notes"]').value || "").trim();
    if (!name || !contact) {
      alert(isHi() ? "कृपया नाम और संपर्क भरें।" : "Please enter your name and contact.");
      return;
    }
    var L = [];
    L.push(isHi() ? "सोर्सिंग अनुरोध — इंडिया सिलेक्शन" : "Procurement request — India Selection");
    L.push("");
    L.push((isHi() ? "खरीदार: " : "Buyer: ") + name);
    L.push((isHi() ? "संपर्क: " : "Contact: ") + contact);
    if (notes) L.push((isHi() ? "नोट्स: " : "Notes: ") + notes);
    L.push("");
    L.push(isHi() ? "मांगे गए ब्रांड:" : "Requested brands:");
    cart.forEach(function (it, i) {
      var label = it.name + (it.brand && it.brand !== it.name ? " (" + it.brand + ")" : "");
      L.push((i + 1) + ". " + label + " — " +
        (isHi() ? "मात्रा: " : "Qty: ") + it.qty + (it.note ? (" — " + it.note) : ""));
      L.push("   " + SITE_BASE + it.href);
    });
    L.push("");
    L.push(isHi() ? "— india-selection.com कार्ट से भेजा गया" : "— sent from india-selection.com cart");
    var subject = (isHi() ? "सोर्सिंग अनुरोध — " : "Procurement request — ") +
      cart.length + (cart.length > 1 ? (isHi() ? " वस्तुएँ" : " items") : (isHi() ? " वस्तु" : " item"));
    var body = L.join("\n");
    window.location.href = "mailto:" + CART_EMAIL +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);
  }

  // ---------- toast ----------
  var toastTimer = null;
  function toast(msg) {
    var el = document.querySelector(".cart-toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "cart-toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, 1800);
  }

  // ---------- bilingual for dynamically injected cart UI ----------
  function applyCartLang() {
    var nodes = document.querySelectorAll(
      "#cartDrawer [data-en], #cartRoot [data-en], .cart-toggle [data-en], .cart-empty [data-en], .cart-empty-page [data-en]"
    );
    nodes.forEach(function (el) {
      var en = el.getAttribute("data-en"), hi = el.getAttribute("data-hi");
      if (en && hi) el.textContent = isHi() ? hi : en;
    });
  }

  // ---------- bind add buttons ----------
  function bindAdd() {
    document.querySelectorAll("[data-add-to-cart]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        addToCart({
          id: btn.getAttribute("data-id"),
          name: btn.getAttribute("data-name"),
          brand: btn.getAttribute("data-brand") || "",
          cat: btn.getAttribute("data-cat"),
          href: btn.getAttribute("data-href")
        });
        btn.classList.add("in-cart");
        toast(t("Added to your list", "आपकी सूची में जोड़ा गया"));
        openDrawer();
      });
    });
  }

  // ---------- init ----------
  function init() {
    injectIcon();
    buildDrawer();
    bindAdd();
    updateBadge();
    renderDrawer();
    renderCartPage();
    applyCartLang();
    var lt = document.getElementById("langToggle");
    if (lt) lt.addEventListener("click", function () { setTimeout(applyCartLang, 0); });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
