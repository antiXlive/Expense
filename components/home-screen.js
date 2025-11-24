// components/home-screen.js - OPTIMIZED
import { EventBus } from "../js/event-bus.js";
import { getMonthTransactions } from "../js/state.js";

class HomeScreen extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this.current = new Date();
    this.tx = [];
    this.grouped = [];
    this._touch = { x: 0, y: 0, start: 0, end: 0 };
    this._isAnimating = false;
    this._longPressTimer = null;
    this._onScrollBound = null;
    this._currentYearMonth = null; // Track current loaded month

    this.render();
  }

  connectedCallback() {
    this._bind();
    this._loadMonth(this.current.getFullYear(), this.current.getMonth());

    // Optimized: Only reload if data actually changed
    this._txUpdatedHandler = (data) => {
      // If we receive a specific transaction, check if it's in current month
      if (data && data.date) {
        const txYearMonth = data.date.substring(0, 7);
        if (txYearMonth === this._currentYearMonth) {
          this._loadMonth(this.current.getFullYear(), this.current.getMonth());
        }
      } else {
        // Generic update, reload current month
        this._loadMonth(this.current.getFullYear(), this.current.getMonth());
      }
    };

    EventBus.on("tx-updated", this._txUpdatedHandler);
    EventBus.on("tx-added", this._txUpdatedHandler);
    EventBus.on("tx-deleted", this._txUpdatedHandler);
    EventBus.on("db-loaded", this._txUpdatedHandler);

    // Parallax scroll
    this._onScrollBound = this._onScroll.bind(this);
    this.addEventListener("scroll", this._onScrollBound, { passive: true });
  }

  disconnectedCallback() {
    try {
      EventBus.off("tx-updated", this._txUpdatedHandler);
      EventBus.off("tx-added", this._txUpdatedHandler);
      EventBus.off("tx-deleted", this._txUpdatedHandler);
      EventBus.off("db-loaded", this._txUpdatedHandler);
    } catch (e) {}

    if (this._onScrollBound) {
      this.removeEventListener("scroll", this._onScrollBound);
      this._onScrollBound = null;
    }

    if (this._longPressTimer) clearTimeout(this._longPressTimer);
  }

  // Helpers
  _fmtCurrency(n) {
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(n);
    } catch {
      return "₹" + Math.round(n);
    }
  }

  _dateKey(iso) {
    return iso.slice(0, 10);
  }

  _labelFromKey(key) {
    const date = new Date(key);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) return "Today";
    if (date.getTime() === yesterday.getTime()) return "Yesterday";

    return date
      .toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(",", "");
  }

  /**
   * OPTIMIZED: Uses cached monthly queries from state.js
   */
  async _loadMonth(y, m) {
    const yearMonth = `${y}-${String(m + 1).padStart(2, "0")}`; // "2025-01"
    this._currentYearMonth = yearMonth;

    try {
      console.time(`📊 Load ${yearMonth}`);
      
      // ✅ NEW: Use optimized cached query
      const txs = await getMonthTransactions(yearMonth);
      
      // Sort by date (newest first)
      this.tx = txs.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      console.timeEnd(`📊 Load ${yearMonth}`);
      console.log(`✅ Loaded ${this.tx.length} transactions for ${yearMonth}`);
      
      this._groupByDate();
      this._render();
    } catch (e) {
      console.error("Failed to load month:", e);
      this.tx = [];
      this.grouped = [];
      this._render();
    }
  }

  _groupByDate() {
    const map = new Map();

    for (const t of this.tx) {
      const key = this._dateKey(t.date);
      if (!map.has(key))
        map.set(key, { dateKey: key, label: "", items: [], total: 0 });

      const g = map.get(key);
      g.items.push(t);
      g.total += Number(t.amount || 0);
    }

    this.grouped = Array.from(map.values())
      .sort((a, b) => new Date(b.dateKey) - new Date(a.dateKey))
      .map((g) => ({ ...g, label: this._labelFromKey(g.dateKey) }));
  }

  // Touch & long press
  _bind() {
    const root = this.shadowRoot;

    root.addEventListener("touchstart", (e) => this._onTouchStart(e), {
      passive: true,
    });
    root.addEventListener("touchmove", (e) => this._onTouchMove(e), {
      passive: true,
    });
    root.addEventListener("touchend", (e) => this._onTouchEnd(e), {
      passive: true,
    });

    root.addEventListener("click", (e) => {
      const el = e.target.closest("[data-action]");
      if (!el) return;

      const id = Number(el.dataset.id);
      const tx = this.tx.find((t) => Number(t.id) === id);

      this._createRipple(e, el);
      EventBus.emit("open-entry-sheet", tx || {});
    });
  }

  _onTouchStart(e) {
    const t = e.touches[0];
    this._touch.start = t.clientX;
    this._touch.x = t.clientX;
    this._touch.y = t.clientY;

    const txItem = e.target.closest(".tx-item");
    if (txItem && txItem.dataset.id) this._setupLongPress(txItem);
  }

  _onTouchMove(e) {
    const t = e.touches[0];
    const dx = Math.abs(t.clientX - this._touch.start);
    const dy = Math.abs(t.clientY - this._touch.y);

    if (dx > 10 || dy > 10) this._cancelLongPress();

    this._touch.x = t.clientX;
    this._touch.y = t.clientY;
  }

  _onTouchEnd() {
    this._cancelLongPress();

    // swipe between months
    if (this._isAnimating) return;
    const dx = this._touch.x - this._touch.start;
    const thresh = 60; // px

    if (dx < -thresh) {
      // swipe left => previous month
      this._changeMonth(-1);
    } else if (dx > thresh) {
      // swipe right => next month
      this._changeMonth(1);
    }

    this._touch = { x: 0, y: 0, start: 0, end: 0 };
  }

  _changeMonth(dir) {
    if (this._isAnimating) return;
    this._isAnimating = true;

    const d = new Date(
      this.current.getFullYear(),
      this.current.getMonth() + dir,
      1
    );
    this.current = d;

    const daysList = this.shadowRoot.getElementById("daysList");
    if (daysList) {
      daysList.style.opacity = "0";
      daysList.style.transform = `translateX(${dir * 20}px)`;
    }

    setTimeout(() => {
      this._loadMonth(d.getFullYear(), d.getMonth());

      setTimeout(() => {
        if (daysList) {
          daysList.style.transition = "all 0.3s ease";
          daysList.style.opacity = "1";
          daysList.style.transform = "translateX(0)";
        }

        setTimeout(() => {
          if (daysList) daysList.style.transition = "";
          this._isAnimating = false;
        }, 300);
      }, 50);
    }, 150);

    if (navigator.vibrate) navigator.vibrate(10);
    EventBus.emit("month-changed", { year: d.getFullYear(), month: d.getMonth() });
  }

  _setupLongPress(el) {
    this._cancelLongPress();

    el.classList.add("pressing");

    this._longPressTimer = setTimeout(() => {
      const id = Number(el.dataset.id);
      const tx = this.tx.find((t) => Number(t.id) === id);

      if (navigator.vibrate) navigator.vibrate(50);

      if (tx && confirm(`Delete "${tx.note || tx.catName}"?`)) {
        el.classList.add("deleting");
        EventBus.emit("tx-delete", tx.id);
      }

      el.classList.remove("pressing");
    }, 700);
  }

  _cancelLongPress() {
    if (this._longPressTimer) clearTimeout(this._longPressTimer);
    this._longPressTimer = null;

    this.shadowRoot
      .querySelectorAll(".tx-item.pressing")
      .forEach((el) => el.classList.remove("pressing"));
  }

  // Ripple effect
  _createRipple(e, el) {
    const rect = el.getBoundingClientRect();
    const ripple = document.createElement("span");

    ripple.className = "ripple";
    ripple.style.left = e.clientX - rect.left + "px";
    ripple.style.top = e.clientY - rect.top + "px";

    el.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }

  // Scroll parallax / effects
  _onScroll() {
    const y = this.scrollTop || 0;
    const summary = this.shadowRoot.querySelector(".summary");
    if (!summary) return;

    const clamped = Math.min(y, 140);
    const translate = clamped * 0.25;
    const scale = 1 - clamped / 1200;
    const opacity = 1 - Math.min(clamped / 400, 0.2);

    summary.style.transform = `translateY(${translate}px) scale(${scale})`;
    summary.style.opacity = opacity;
  }

  // -----------------------------------------
  // RENDER ROOT + STYLE BLOCK
  // -----------------------------------------
  render() {
    this.shadowRoot.innerHTML = `
      <style>
/* ROOT */
:host {
  display: block;
  padding: 14px;
  box-sizing: border-box;
  background: #020617;
  color: #E8EEFF;
  font-family: Inter, system-ui;
  width: 100%;
  position: relative;
}

/* Background vignette */
:host::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 20% -10%, rgba(37, 99, 235, 0.20), transparent 55%),
    radial-gradient(circle at bottom, rgba(15, 23, 42, 0.85), #020617 80%);
  z-index: -1;
}

.wrap { 
  max-width:980px; 
  margin:0 auto; 
}

/* ============================
   SUMMARY CARD
============================= */
.summary{
  padding:18px 20px;
  border-radius:20px;
  background:linear-gradient(165deg,#091320,#0B162A);
  border:1px solid rgba(148,163,184,0.16);
  box-shadow:
    0 14px 28px rgba(0,0,0,0.55),
    inset 0 0 12px rgba(59,130,246,0.10);
  margin-bottom:20px;
  position:relative;
  overflow:hidden;
}

/* shimmer */
.summary::before{
  content:'';
  position:absolute;
  top:-40%; right:-40%;
  width:120%; height:120%;
  background:radial-gradient(circle at top right,rgba(59,130,246,0.30),transparent 65%);
  opacity:0.7;
  pointer-events:none;
}

.month-name{
  font-size:15px;
  font-weight:600;
  color:#A9C4FF;
}
.total{
  font-size:28px;
  font-weight:700;
  margin-top:6px;
  color:#F6F8FF;
}
.meta{
  margin-top:8px;
  font-size:12px;
  color:#90A8D4;
  display:flex;
  gap:6px;
  align-items:center;
}

/* ============================
   SWIPE HINT
============================= */
.swipe-hint{
  text-align:center;
  font-size:11px;
  color:#8098C6;
  margin:6px 0 12px;
  opacity:.75;
}

/* ============================
   DAY HEADER (FIXED GAP)
============================= */

.day-header{
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:6px 4px;
  margin-top:16px;
  margin-bottom:2px;
  border-bottom:1px solid rgba(255,255,255,0.06);
  font-size:13px;

  position:sticky;
  top:0;
  z-index:10;
  backdrop-filter:blur(8px);
  background:rgba(2,6,23,0.88);

  height:32px;
}

.day-label{
  font-size:13px;
  font-weight:600;
  color:#C8D7FF;
  line-height:1;
}

.day-total{
  font-size:13px;
  font-weight:600;
  color:#FCA5A5;
  line-height:1;
  margin-right:4px;
  display:flex;
  align-items:center;
}

/* Today highlight */
.day-header.today .day-label{
  color:#A3CCFF;
  text-shadow:0 0 8px rgba(59,130,246,0.35);
}
.day-header.today{
  border-bottom-color:rgba(96,165,250,0.35);
}

/* ============================
   TRANSACTION LIST
============================= */

.tx-list{
  display:flex;
  flex-direction:column;
  gap:6px;
  margin-top:4px;
  margin-bottom:10px;
}

/* ============================
   TRANSACTION ITEM
============================= */

.tx-item{
  padding:8px 12px;
  border-radius:12px;
  background:#0D1525;
  border:1px solid rgba(255,255,255,0.05);

  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:10px;

  box-shadow:
    0 2px 4px rgba(0,0,0,0.40),
    0 6px 12px rgba(0,0,0,0.30);

  position:relative;

  opacity:0;
  transform:translateY(7px);
  animation:txIn .28s ease forwards;

  transition:
    background .18s ease,
    box-shadow .18s ease,
    transform .14s ease;
}

/* Entry animation */
@keyframes txIn{
  from{opacity:0;transform:translateY(8px);}
  to{opacity:1;transform:translateY(0);}
}

/* Hover */
.tx-item:hover{
  background:#111C31;
  box-shadow:
    0 4px 8px rgba(0,0,0,0.55),
    0 10px 20px rgba(0,0,0,0.40);
  transform:translateY(-1px);
}

/* Press */
.tx-item:active{
  transform:scale(.97);
  background:#0B1320;
}

/* LEFT SIDE */
.tx-left{
  display:flex;
  align-items:center;
  gap:10px;
  min-width:0;
  flex:1;
}

/* Emoji badge */
.tx-emoji{
  width:24px;
  height:24px;
  border-radius:7px;
  background:rgba(59,130,246,0.16);
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:14px;
  color:#dce8ff;
  flex-shrink:0;
}

/* TEXT META */
.tx-meta{
  display:flex;
  flex-direction:column;
  gap:1px;
  min-width:0;
}

.tx-cat{
  font-size:13px;
  font-weight:600;
  color:#EDF3FF;
}

.tx-subcat{
  font-size:11px;
  font-weight:500;
  color:#A5B9D9;
}

.tx-note{
  font-size:10px;
  color:#9CAAC7;
  opacity:.8;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}

/* AMOUNT */
.tx-amt{
  font-size:14px;
  font-weight:600;
  white-space:nowrap;
  color:#FCA5A5;
  margin-right:4px;
}
.tx-amt.negative{
  color:#fb7185;
}

/* Long press */
.tx-item.pressing{
  background:#2a1c22;
  border-color:rgba(255,90,90,0.5);
  box-shadow:0 0 10px rgba(255,70,70,0.25);
}

/* Ripple */
.ripple{
  position:absolute;
  width:10px;height:10px;
  border-radius:50%;
  background:rgba(150,200,255,0.40);
  transform:scale(0);
  animation:cleanRipple .45s ease-out forwards;
}
@keyframes cleanRipple{
  to{transform:scale(9);opacity:0;}
}

/* EMPTY STATE */
.empty{
  padding:40px;
  text-align:center;
  color:#879BC7;
}
.empty-icon{
  font-size:44px;
  opacity:.4;
  margin-bottom:12px;
}
.empty-title{
  font-size:15px;
  font-weight:600;
  margin-bottom:4px;
}
.empty-subtitle{
  font-size:12px;
  color:#9CA3AF;
}

@media(min-width:880px){
  .wrap{padding:0 6px;}
}
</style>

      <div class="wrap">
        <div class="summary">
          <div>
            <div class="month-name" id="monthName">Month</div>
            <div class="total" id="monthTotal">₹0</div>
            <div class="meta">
              <span id="txCount"></span>
              <span>•</span>
              <span id="topCat"></span>
            </div>
          </div>
          <div>
            <svg class="mini-chart" id="miniChart" viewBox="0 0 160 60"></svg>
          </div>
        </div>

        <div class="swipe-hint">Swipe to change month • Long press to delete</div>

        <div id="daysList"></div>

        <div class="empty" id="emptyState" style="display:none;">
          <div class="empty-icon">💸</div>
          <div class="empty-title">No transactions this month</div>
          <div class="empty-subtitle">Tap + to add your first one</div>
        </div>
      </div>
    `;
  }

  //
  // FINAL RENDERING OF DAY HEADERS + LISTS
  //
  _render() {
    const monthName = this.shadowRoot.getElementById("monthName");
    const monthTotalEl = this.shadowRoot.getElementById("monthTotal");
    const txCount = this.shadowRoot.getElementById("txCount");
    const topCat = this.shadowRoot.getElementById("topCat");
    const miniChart = this.shadowRoot.getElementById("miniChart");
    const daysList = this.shadowRoot.getElementById("daysList");
    const emptyState = this.shadowRoot.getElementById("emptyState");

    const monthLabel = this.current.toLocaleString(undefined, {
      month: "long",
      year: "numeric",
    });
    monthName.textContent = monthLabel;

    const total = this.tx.reduce((s, t) => s + Number(t.amount || 0), 0);
    monthTotalEl.textContent = this._fmtCurrency(total);
    txCount.textContent = `${this.tx.length} transaction${
      this.tx.length !== 1 ? "s" : ""
    }`;
    topCat.textContent = `Top: ${this._topCategoryText()}`;

    const daily = this.grouped.map((g) => g.total).slice(0, 12).reverse();
    miniChart.innerHTML = this._renderMiniChart(daily);

    // handle empty month
    daysList.innerHTML = "";
    if (!this.grouped.length) {
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";

    // Day headers + transaction cards
    for (const g of this.grouped) {
      // Day header
      const header = document.createElement("div");
      header.className = "day-header";
      if (g.label === "Today") header.classList.add("today");

      header.innerHTML = `
        <span class="day-label">${g.label}</span>
        <span class="day-total">${this._fmtCurrency(g.total)}</span>
      `;
      daysList.appendChild(header);

      // Transactions under this day
      const txWrapper = document.createElement("div");
      txWrapper.className = "tx-list";

      txWrapper.innerHTML = g.items
        .map(
          (t) => `
        <div class="tx-item" data-action="open-tx" data-id="${t.id}" tabindex="0">
          <div class="tx-left">
            <div class="tx-emoji">${t.emoji || "🧾"}</div>
            <div class="tx-meta">
              <div class="tx-cat">${this._esc(t.catName || "Uncategorized")}</div>
              ${t.subName ? `<div class="tx-subcat">${this._esc(t.subName)}</div>` : ""}
              ${t.note ? `<div class="tx-note">${this._esc(t.note)}</div>` : ""}
            </div>
          </div>
          <div class="tx-amt ${Number(t.amount) < 0 ? "negative" : ""}">
            ${this._fmtCurrency(Number(t.amount || 0))}
          </div>
        </div>
      `
        )
        .join("");

      daysList.appendChild(txWrapper);
    }
  }

  _topCategoryText() {
    const map = new Map();

    for (const t of this.tx) {
      const k = t.catName || "Uncategorized";
      map.set(k, (map.get(k) || 0) + Number(t.amount || 0));
    }

    const arr = [...map.entries()].sort((a, b) => b[1] - a[1]);
    if (!arr.length) return "—";

    const [name, val] = arr[0];
    return `${name} (${this._fmtCurrency(val)})`;
  }

  _renderMiniChart(values) {
    if (!values.length) return "";

    const w = 160,
      h = 60,
      pad = 6;
    const max = Math.max(...values, 1);
    const step = w / values.length;

    let html = `
      <defs>
        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:rgba(16,185,129,0.8);" />
          <stop offset="100%" style="stop-color:rgba(16,185,129,0.3);" />
        </linearGradient>
      </defs>
    `;

    values.forEach((v, i) => {
      const barW = Math.max(4, Math.floor(step * 0.7));
      const x = Math.floor(i * step) + Math.floor((step - barW) / 2);
      const barH = Math.round((v / max) * (h - pad * 2));
      const y = h - pad - barH;

      html += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="4" fill="url(#chartGradient)" />`;
    });

    return html;
  }

  _esc(s = "") {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }
}

customElements.define("home-screen", HomeScreen);