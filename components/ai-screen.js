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

    async render() {
        // Load external CSS once and reuse for all instances
        if (!AIScreen.sharedCSS) {
            const cssURL = new URL("./ai-screen.css", import.meta.url);
            const cssText = await fetch(cssURL).then(r => r.text());
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(cssText);
            AIScreen.sharedCSS = sheet;
        }

        this.shadowRoot.adoptedStyleSheets = [AIScreen.sharedCSS];

        this.shadowRoot.innerHTML = `
            <div class="glossy-container">
                <div class="content-wrapper">
                    <div id="aiContent"></div>
                </div>
            </div>
        `;
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
        } catch (e) { }
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

        if (dx < -thresh) this._changeMonth(-1);
        else if (dx > thresh) this._changeMonth(1);

        this._touch = { x: 0, y: 0, start: 0 };
    }

    _changeMonth(dir) {
        if (this._isAnimating) return;
        this._isAnimating = true;

        const d = new Date(this.current.getFullYear(), this.current.getMonth() + dir, 1);
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
                data[cat] = { name: cat, total: 0, count: 0, avgAmount: 0, lastTransaction: null };
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

        if (normalized < 0.33) return `hsl(186, 100%, ${70 - normalized * 20}%)`;
        if (normalized < 0.66) return `hsl(45, 100%, ${60 - (normalized - 0.33) * 20}%)`;
        return `hsl(10, 100%, ${50 - (normalized - 0.66) * 20}%)`;
    }

    _renderCategoryHeatmap() {
        const categories = Object.values(this.categoryData).sort((a, b) => b.total - a.total);
        if (categories.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">📊</div>
                    <div class="empty-text">No transactions this month</div>
                </div>`;
        }

        const totals = categories.map(c => c.total);
        const min = Math.min(...totals);
        const max = Math.max(...totals);

        return categories.map(cat => {
            const color = this._getHeatmapColor(cat.total, min, max);
            const percent = ((cat.total - min) / (max - min)) * 100;

            return `
                <div class="heatmap-item">
                    <div class="heatmap-header">
                        <span class="cat-name">${this._esc(cat.name)}</span>
                        <span class="cat-count">${cat.count} txn</span>
                    </div>
                    <div class="heatmap-bar-wrapper">
                        <div class="heatmap-bar" style="width:${percent}%; background:${color};"></div>
                    </div>
                    <div class="heatmap-stats">
                        <span class="total">₹${Math.abs(Math.round(cat.total))}</span>
                        <span class="avg">Avg: ₹${Math.abs(Math.round(cat.avgAmount))}</span>
                    </div>
                </div>`;
        }).join("");
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

    _renderInsights() {
        const categories = Object.values(this.categoryData).sort((a, b) => b.total - a.total);
        if (categories.length === 0) return "";

        const top = categories[0];
        const avg =
            this.tx.reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0) / this.tx.length;
        const max = Math.max(...this.tx.map(t => Math.abs(Number(t.amount || 0))));

        return `
            <div class="insight-card">
                <div class="insight-icon">🎯</div>
                <div class="insight-content">
                    <div class="insight-title">Top Category</div>
                    <div class="insight-value">${this._esc(top.name)}</div>
                    <div class="insight-detail">${this._fmtCurrency(top.total)}</div>
                </div>
            </div>

            <div class="insight-card">
                <div class="insight-icon">📊</div>
                <div class="insight-content">
                    <div class="insight-title">Average Transaction</div>
                    <div class="insight-value">${this._fmtCurrency(avg)}</div>
                    <div class="insight-detail">${this.tx.length} transactions</div>
                </div>
            </div>

            <div class="insight-card">
                <div class="insight-icon">💰</div>
                <div class="insight-content">
                    <div class="insight-title">Highest Transaction</div>
                    <div class="insight-value">${this._fmtCurrency(max)}</div>
                    <div class="insight-detail">Single transaction</div>
                </div>
            </div>`;
    }

    _render() {
        const monthLabel = this.current.toLocaleString(undefined, {
            month: "long",
            year: "numeric",
        });

        const totalSpent = this.tx.reduce((s, t) => s + Number(t.amount || 0), 0);

        const html = `
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

        this.shadowRoot.getElementById("aiContent").innerHTML = html;
    }
}

customElements.define("ai-screen", AIScreen);
