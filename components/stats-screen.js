// components/stats-screen.js
import { EventBus } from "../js/event-bus.js";
import { getMonthTransactions } from "../js/state.js";

class StatsScreen extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this.current = new Date();
    this.tx = [];
    this.categoryStats = [];
    this._touch = { x: 0, y: 0, start: 0 };
    this._isAnimating = false;

    this.render();
  }

  connectedCallback() {
    this._loadMonth(this.current.getFullYear(), this.current.getMonth());

    this._txUpdatedHandler = () =>
      this._loadMonth(this.current.getFullYear(), this.current.getMonth());

    EventBus.on("tx-updated", this._txUpdatedHandler);
    EventBus.on("tx-added", this._txUpdatedHandler);
    EventBus.on("tx-deleted", this._txUpdatedHandler);
    EventBus.on("db-loaded", this._txUpdatedHandler);

    // Touch events for swipe
    this._bind();
  }

  disconnectedCallback() {
    try {
      EventBus.off("tx-updated", this._txUpdatedHandler);
      EventBus.off("tx-added", this._txUpdatedHandler);
      EventBus.off("tx-deleted", this._txUpdatedHandler);
      EventBus.off("db-loaded", this._txUpdatedHandler);
    } catch (e) {}
  }

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
  }

  _onTouchStart(e) {
    const t = e.touches[0];
    this._touch.start = t.clientX;
    this._touch.x = t.clientX;
  }

  _onTouchMove(e) {
    const t = e.touches[0];
    this._touch.x = t.clientX;
  }

  _onTouchEnd() {
    if (this._isAnimating) return;
    const dx = this._touch.x - this._touch.start;
    const thresh = 60;

    if (dx < -thresh) {
      this._changeMonth(-1);
    } else if (dx > thresh) {
      this._changeMonth(1);
    }

    this._touch = { x: 0, y: 0, start: 0 };
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

    const content = this.shadowRoot.getElementById("statsContent");
    if (content) {
      content.style.opacity = "0";
      content.style.transform = `translateX(${dir * 20}px)`;
    }

    setTimeout(() => {
      this._loadMonth(d.getFullYear(), d.getMonth());

      setTimeout(() => {
        if (content) {
          content.style.transition = "all 0.3s ease";
          content.style.opacity = "1";
          content.style.transform = "translateX(0)";
        }

        setTimeout(() => {
          if (content) content.style.transition = "";
          this._isAnimating = false;
        }, 300);
      }, 50);
    }, 150);

    if (navigator.vibrate) navigator.vibrate(10);
  }

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

  async _loadMonth(y, m) {
    const yearMonth = `${y}-${String(m + 1).padStart(2, "0")}`;

    try {
      this.tx = await getMonthTransactions(yearMonth);
      this._calculateStats();
      this._render();
    } catch (e) {
      console.error("Failed to load stats:", e);
      this.tx = [];
      this.categoryStats = [];
      this._render();
    }
  }

  _calculateStats() {
    const categoryMap = new Map();

    for (const t of this.tx) {
      const cat = t.catName || "Uncategorized";
      const emoji = t.emoji || "🏷️";
      const amount = Number(t.amount || 0);

      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, {
          name: cat,
          emoji: emoji,
          total: 0,
          count: 0,
          percentage: 0,
        });
      }

      const entry = categoryMap.get(cat);
      entry.total += amount;
      entry.count += 1;
    }

    const total = this.tx.reduce((s, t) => s + Number(t.amount || 0), 0);

    this.categoryStats = Array.from(categoryMap.values())
      .map((cat) => ({
        ...cat,
        percentage: total > 0 ? (cat.total / total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 14px;
          box-sizing: border-box;
          background: #020617;
          color: #E8EEFF;
          font-family: Inter, system-ui;
          overflow-y: auto;
          height: 100%;
          position: relative;
        }

        :host::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(circle at 20% -10%, rgba(37,99,235,0.20), transparent 55%),
                      radial-gradient(circle at bottom, rgba(15,23,42,0.85), #020617 80%);
          z-index: -1;
        }

        .wrap {
          max-width: 980px;
          margin: 0 auto;
        }

        /* Summary Card */
        .summary {
          padding: 20px;
          border-radius: 20px;
          background: linear-gradient(165deg, #091320, #0B162A);
          border: 1px solid rgba(148,163,184,0.16);
          box-shadow: 0 14px 28px rgba(0,0,0,0.55),
                      inset 0 0 12px rgba(59,130,246,0.10);
          margin-bottom: 20px;
          position: relative;
          overflow: hidden;
        }

        .summary::before {
          content: '';
          position: absolute;
          top: -40%;
          right: -40%;
          width: 120%;
          height: 120%;
          background: radial-gradient(circle at top right, rgba(59,130,246,0.30), transparent 65%);
          opacity: 0.7;
          pointer-events: none;
        }

        .month-name {
          font-size: 15px;
          font-weight: 600;
          color: #A9C4FF;
          margin-bottom: 8px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 16px;
        }

        .stat-item {
          text-align: center;
        }

        .stat-value {
          font-size: 20px;
          font-weight: 700;
          color: #F6F8FF;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 11px;
          color: #90A8D4;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Swipe Hint */
        .swipe-hint {
          text-align: center;
          font-size: 11px;
          color: #8098C6;
          margin: 6px 0 16px;
          opacity: 0.75;
        }

        /* Chart Card */
        .chart-card {
          padding: 20px;
          border-radius: 20px;
          background: linear-gradient(165deg, #0B1525, #0D1A2F);
          border: 1px solid rgba(148,163,184,0.12);
          box-shadow: 0 8px 16px rgba(0,0,0,0.4);
          margin-bottom: 20px;
        }

        .chart-title {
          font-size: 14px;
          font-weight: 600;
          color: #C8D7FF;
          margin-bottom: 16px;
        }

        .chart-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 260px;
          position: relative;
        }

        .donut-chart {
          width: 220px;
          height: 220px;
          position: relative;
        }

        .donut-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }

        .donut-total {
          font-size: 24px;
          font-weight: 700;
          color: #F6F8FF;
        }

        .donut-label {
          font-size: 11px;
          color: #94a3b8;
          margin-top: 4px;
        }

        /* Category List */
        .categories-card {
          padding: 20px;
          border-radius: 20px;
          background: linear-gradient(165deg, #0B1525, #0D1A2F);
          border: 1px solid rgba(148,163,184,0.12);
          box-shadow: 0 8px 16px rgba(0,0,0,0.4);
          margin-bottom: 20px;
        }

        .category-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .category-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 12px;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.08);
          transition: all 0.2s ease;
        }

        .category-item:hover {
          background: rgba(15, 23, 42, 0.9);
          border-color: rgba(148, 163, 184, 0.15);
          transform: translateX(4px);
        }

        .category-emoji {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(59, 130, 246, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }

        .category-info {
          flex: 1;
          min-width: 0;
        }

        .category-name {
          font-size: 14px;
          font-weight: 600;
          color: #EDF3FF;
          margin-bottom: 4px;
        }

        .category-count {
          font-size: 11px;
          color: #94a3b8;
        }

        .category-right {
          text-align: right;
        }

        .category-amount {
          font-size: 16px;
          font-weight: 700;
          color: #FCA5A5;
          margin-bottom: 4px;
        }

        .category-percentage {
          font-size: 11px;
          color: #94a3b8;
        }

        .category-bar {
          height: 4px;
          background: rgba(148, 163, 184, 0.1);
          border-radius: 2px;
          overflow: hidden;
          margin-top: 8px;
        }

        .category-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981, #059669);
          border-radius: 2px;
          transition: width 0.5s ease;
        }

        /* Empty State */
        .empty {
          padding: 60px 20px;
          text-align: center;
          color: #879BC7;
        }

        .empty-icon {
          font-size: 48px;
          opacity: 0.4;
          margin-bottom: 16px;
        }

        .empty-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .empty-subtitle {
          font-size: 13px;
          color: #9CA3AF;
        }

        @media (max-width: 480px) {
          .stats-grid {
            gap: 12px;
          }

          .stat-value {
            font-size: 18px;
          }

          .donut-chart {
            width: 200px;
            height: 200px;
          }
        }
      </style>

      <div class="wrap" id="statsContent">
        <div class="summary">
          <div class="month-name" id="monthName">Month</div>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value" id="totalSpent">₹0</div>
              <div class="stat-label">Total Spent</div>
            </div>
            <div class="stat-item">
              <div class="stat-value" id="avgPerDay">₹0</div>
              <div class="stat-label">Avg/Day</div>
            </div>
            <div class="stat-item">
              <div class="stat-value" id="txCount">0</div>
              <div class="stat-label">Transactions</div>
            </div>
          </div>
        </div>

        <div class="swipe-hint">Swipe to change month</div>

        <div id="contentArea"></div>
      </div>
    `;
  }

  _render() {
    const monthName = this.shadowRoot.getElementById("monthName");
    const totalSpent = this.shadowRoot.getElementById("totalSpent");
    const avgPerDay = this.shadowRoot.getElementById("avgPerDay");
    const txCount = this.shadowRoot.getElementById("txCount");
    const contentArea = this.shadowRoot.getElementById("contentArea");

    const monthLabel = this.current.toLocaleString(undefined, {
      month: "long",
      year: "numeric",
    });
    monthName.textContent = monthLabel;

    const total = this.tx.reduce((s, t) => s + Number(t.amount || 0), 0);
    const daysInMonth = new Date(
      this.current.getFullYear(),
      this.current.getMonth() + 1,
      0
    ).getDate();
    const avg = total / daysInMonth;

    totalSpent.textContent = this._fmtCurrency(total);
    avgPerDay.textContent = this._fmtCurrency(avg);
    txCount.textContent = this.tx.length;

    if (!this.categoryStats.length) {
      contentArea.innerHTML = `
        <div class="empty">
          <div class="empty-icon">📊</div>
          <div class="empty-title">No data this month</div>
          <div class="empty-subtitle">Add transactions to see stats</div>
        </div>
      `;
      return;
    }

    // Render chart and categories
    contentArea.innerHTML = `
      <div class="chart-card">
        <div class="chart-title">Spending by Category</div>
        <div class="chart-container">
          ${this._renderDonutChart()}
        </div>
      </div>

      <div class="categories-card">
        <div class="chart-title">Category Breakdown</div>
        <div class="category-list">
          ${this._renderCategoryList()}
        </div>
      </div>
    `;
  }

  _renderDonutChart() {
    const total = this.categoryStats.reduce((s, c) => s + c.total, 0);
    const colors = [
      "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
      "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16"
    ];

    let currentAngle = -90;
    const paths = this.categoryStats
      .map((cat, i) => {
        const percentage = (cat.total / total) * 100;
        const angle = (percentage / 100) * 360;
        const endAngle = currentAngle + angle;

        const startRad = (currentAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;

        const x1 = 110 + 80 * Math.cos(startRad);
        const y1 = 110 + 80 * Math.sin(startRad);
        const x2 = 110 + 80 * Math.cos(endRad);
        const y2 = 110 + 80 * Math.sin(endRad);

        const largeArc = angle > 180 ? 1 : 0;

        const path = `
          M 110 110
          L ${x1} ${y1}
          A 80 80 0 ${largeArc} 1 ${x2} ${y2}
          Z
        `;

        currentAngle = endAngle;

        return `<path d="${path}" fill="${colors[i % colors.length]}" opacity="0.9" />`;
      })
      .join("");

    return `
      <svg class="donut-chart" viewBox="0 0 220 220">
        ${paths}
        <circle cx="110" cy="110" r="60" fill="#0B1525" />
      </svg>
      <div class="donut-center">
        <div class="donut-total">${this._fmtCurrency(total)}</div>
        <div class="donut-label">Total</div>
      </div>
    `;
  }

  _renderCategoryList() {
    return this.categoryStats
      .map(
        (cat) => `
        <div class="category-item">
          <div class="category-emoji">${cat.emoji}</div>
          <div class="category-info">
            <div class="category-name">${this._esc(cat.name)}</div>
            <div class="category-count">${cat.count} transaction${
          cat.count !== 1 ? "s" : ""
        }</div>
            <div class="category-bar">
              <div class="category-bar-fill" style="width: ${cat.percentage}%"></div>
            </div>
          </div>
          <div class="category-right">
            <div class="category-amount">${this._fmtCurrency(cat.total)}</div>
            <div class="category-percentage">${cat.percentage.toFixed(1)}%</div>
          </div>
        </div>
      `
      )
      .join("");
  }

  _esc(s = "") {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }
}

customElements.define("stats-screen", StatsScreen);