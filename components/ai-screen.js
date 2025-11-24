// components/ai-screen.js - iOS Glossy AI Screen with Category Heatmap
import { EventBus } from "../js/event-bus.js";
import { getMonthTransactions } from "../js/state.js";

class AIScreen extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this.current = new Date();
    this.tx = [];
    this.categoryData = {};
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
    root.addEventListener("touchstart", (e) => this._onTouchStart(e), { passive: true });
    root.addEventListener("touchmove", (e) => this._onTouchMove(e), { passive: true });
    root.addEventListener("touchend", (e) => this._onTouchEnd(e), { passive: true });
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

    const content = this.shadowRoot.getElementById("aiContent");
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

  async _loadMonth(year, month) {
    try {
      const yearMonth = `${year}-${String(month + 1).padStart(2, "0")}`;
      this.tx = await getMonthTransactions(yearMonth);
      this._calculateCategoryData();
      this._render();
    } catch (e) {
      console.error("Failed to load AI screen:", e);
    }
  }

  _calculateCategoryData() {
    const data = {};
    
    for (const t of this.tx) {
      const cat = t.catName || "Uncategorized";
      if (!data[cat]) {
        data[cat] = {
          name: cat,
          total: 0,
          count: 0,
          avgAmount: 0,
          lastTransaction: null,
        };
      }
      data[cat].total += Number(t.amount || 0);
      data[cat].count++;
      data[cat].lastTransaction = t.date;
    }

    for (const cat in data) {
      data[cat].avgAmount = data[cat].total / data[cat].count;
    }

    this.categoryData = data;
  }

  _getHeatmapColor(value, min, max) {
    if (max === min) return "#06b6d4";

    const normalized = (value - min) / (max - min);
    
    // Gradient: Cold (cyan) -> Warm (orange/red)
    if (normalized < 0.33) {
      return `hsl(186, 100%, ${70 - normalized * 20}%)`;
    } else if (normalized < 0.66) {
      return `hsl(45, 100%, ${60 - (normalized - 0.33) * 20}%)`;
    } else {
      return `hsl(10, 100%, ${50 - (normalized - 0.66) * 20}%)`;
    }
  }

  _renderCategoryHeatmap() {
    const categories = Object.values(this.categoryData).sort(
      (a, b) => b.total - a.total
    );

    if (categories.length === 0) {
      return `<div class="empty-state">
        <div class="empty-icon">📊</div>
        <div class="empty-text">No transactions this month</div>
      </div>`;
    }

    const totals = categories.map((c) => c.total);
    const min = Math.min(...totals);
    const max = Math.max(...totals);

    return categories
      .map((cat) => {
        const color = this._getHeatmapColor(cat.total, min, max);
        const percent = ((cat.total - min) / (max - min)) * 100;

        return `
          <div class="heatmap-item">
            <div class="heatmap-header">
              <span class="cat-name">${this._esc(cat.name)}</span>
              <span class="cat-count">${cat.count} txn</span>
            </div>
            <div class="heatmap-bar-wrapper">
              <div class="heatmap-bar" style="
                width: ${percent}%;
                background: ${color};
              "></div>
            </div>
            <div class="heatmap-stats">
              <span class="total">₹${Math.abs(Math.round(cat.total))}</span>
              <span class="avg">Avg: ₹${Math.abs(Math.round(cat.avgAmount))}</span>
            </div>
          </div>
        `;
      })
      .join("");
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

  _esc(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  _render() {
    const monthLabel = this.current.toLocaleString(undefined, {
      month: "long",
      year: "numeric",
    });
    const totalSpent = this.tx.reduce((s, t) => s + Number(t.amount || 0), 0);

    const aiContent = this.shadowRoot.getElementById("aiContent");
    if (!aiContent) return;

    aiContent.innerHTML = `
      <div class="month-selector">
        <span class="month-name">${monthLabel}</span>
        <span class="swipe-hint">← Swipe to change →</span>
      </div>

      <div class="summary-card">
        <div class="summary-content">
          <div class="summary-stat">
            <div class="stat-label">Total Spent</div>
            <div class="stat-value">${this._fmtCurrency(totalSpent)}</div>
          </div>
          <div class="summary-stat">
            <div class="stat-label">Categories</div>
            <div class="stat-value">${Object.keys(this.categoryData).length}</div>
          </div>
          <div class="summary-stat">
            <div class="stat-label">Transactions</div>
            <div class="stat-value">${this.tx.length}</div>
          </div>
        </div>
      </div>

      <div class="heatmap-section">
        <h2 class="section-title">Category Heatmap</h2>
        <p class="section-subtitle">Spending intensity by category</p>
        <div class="heatmap-container">
          ${this._renderCategoryHeatmap()}
        </div>
      </div>

      <div class="insights-section">
        <h2 class="section-title">Quick Insights</h2>
        <div class="insights-grid">
          ${this._renderInsights()}
        </div>
      </div>
    `;
  }

  _renderInsights() {
    const categories = Object.values(this.categoryData).sort(
      (a, b) => b.total - a.total
    );

    if (categories.length === 0) return "";

    const topCategory = categories[0];
    const avgTransaction =
      this.tx.reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0) /
      this.tx.length;
    const highestTransaction = Math.max(
      ...this.tx.map((t) => Math.abs(Number(t.amount || 0)))
    );

    return `
      <div class="insight-card">
        <div class="insight-icon">🎯</div>
        <div class="insight-content">
          <div class="insight-title">Top Category</div>
          <div class="insight-value">${this._esc(topCategory.name)}</div>
          <div class="insight-detail">${this._fmtCurrency(topCategory.total)}</div>
        </div>
      </div>

      <div class="insight-card">
        <div class="insight-icon">📊</div>
        <div class="insight-content">
          <div class="insight-title">Average Transaction</div>
          <div class="insight-value">${this._fmtCurrency(avgTransaction)}</div>
          <div class="insight-detail">${this.tx.length} transactions</div>
        </div>
      </div>

      <div class="insight-card">
        <div class="insight-icon">💰</div>
        <div class="insight-content">
          <div class="insight-title">Highest Transaction</div>
          <div class="insight-value">${this._fmtCurrency(highestTransaction)}</div>
          <div class="insight-detail">Single transaction</div>
        </div>
      </div>
    `;
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 16px;
          padding-bottom: 100px;
          box-sizing: border-box;
          background: linear-gradient(135deg, #0a0e27 0%, #0f1425 100%);
          color: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, sans-serif;
          width: 100%;
          position: relative;
          min-height: 100vh;
        }

        /* iOS Glossy Background */
        :host::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 20% -10%, rgba(37, 99, 235, 0.15), transparent 55%),
            radial-gradient(circle at 80% 90%, rgba(6, 182, 212, 0.08), transparent 55%);
          pointer-events: none;
          z-index: -1;
        }

        .wrap {
          max-width: 980px;
          margin: 0 auto;
        }

        /* Month Selector */
        .month-selector {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0 16px;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.15);
        }

        .month-name {
          font-size: 18px;
          font-weight: 800;
          color: #e8eeff;
          letter-spacing: -0.02em;
        }

        .swipe-hint {
          font-size: 11px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* iOS Glossy Summary Card */
        .summary-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 24px;
          padding: 24px;
          margin-bottom: 28px;
          backdrop-filter: blur(20px);
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          position: relative;
          overflow: hidden;
        }

        .summary-card::before {
          content: '';
          position: absolute;
          top: -40%;
          right: -40%;
          width: 120%;
          height: 120%;
          background: radial-gradient(circle, rgba(6, 182, 212, 0.2), transparent 70%);
          pointer-events: none;
        }

        .summary-content {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          position: relative;
          z-index: 1;
        }

        .summary-stat {
          text-align: center;
        }

        .stat-label {
          font-size: 12px;
          color: #cbd5e1;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
          font-weight: 600;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 800;
          color: #f8fafc;
          background: linear-gradient(135deg, #e8eeff, #cbd5e1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Heatmap Section */
        .heatmap-section {
          margin-bottom: 28px;
        }

        .section-title {
          font-size: 20px;
          font-weight: 800;
          color: #f8fafc;
          margin: 0 0 4px 0;
          letter-spacing: -0.02em;
        }

        .section-subtitle {
          font-size: 12px;
          color: #94a3b8;
          margin: 0 0 16px 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .heatmap-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .heatmap-item {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01));
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 16px;
          backdrop-filter: blur(10px);
          animation: slideIn 0.4s ease forwards;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .heatmap-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .cat-name {
          font-size: 14px;
          font-weight: 700;
          color: #e8eeff;
        }

        .cat-count {
          font-size: 11px;
          color: #94a3b8;
          background: rgba(148, 163, 184, 0.1);
          padding: 4px 8px;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .heatmap-bar-wrapper {
          width: 100%;
          height: 24px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .heatmap-bar {
          height: 100%;
          border-radius: 8px;
          transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 0 12px currentColor;
        }

        .heatmap-stats {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #cbd5e1;
        }

        .total {
          font-weight: 700;
          color: #f8fafc;
        }

        .avg {
          color: #94a3b8;
        }

        /* Insights Section */
        .insights-section {
          margin-bottom: 28px;
        }

        .insights-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
        }

        .insight-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.01));
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          padding: 16px;
          backdrop-filter: blur(10px);
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .insight-card:hover {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.04));
          transform: translateY(-4px);
        }

        .insight-icon {
          font-size: 28px;
          line-height: 1;
        }

        .insight-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .insight-title {
          font-size: 11px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .insight-value {
          font-size: 16px;
          font-weight: 800;
          color: #f8fafc;
        }

        .insight-detail {
          font-size: 10px;
          color: #475569;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #94a3b8;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        .empty-text {
          font-size: 14px;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .summary-content {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .insights-grid {
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          }

          .stat-value {
            font-size: 20px;
          }
        }
      </style>

      <div class="wrap">
        <div id="aiContent"></div>
      </div>
    `;
  }
}

customElements.define("ai-screen", AIScreen);
