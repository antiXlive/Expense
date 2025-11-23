// components/home-screen.js
import { EventBus } from "../js/event-bus.js";
import { db } from "../js/db.js";

// Home screen component — minimal, gradient summary card, swipe-only month nav, daily grouped list
class HomeScreen extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.current = new Date(); // view month
    this.tx = [];
    this.grouped = []; // [{dateKey:'2025-11-12', label:'12 Nov 2025', total:1234, items:[]}, ...]
    this._touch = { x: 0, y: 0, start: 0, end: 0 };
    this.render();
  }

  connectedCallback() {
    this._bind();
    this._loadMonth(this.current.getFullYear(), this.current.getMonth());
    // refresh when db changes (other parts of app can emit)
    EventBus.on("data-changed", () => this._loadMonth(this.current.getFullYear(), this.current.getMonth()));
    EventBus.on("navigate", (p) => {
      // close any expanded things if navigation occurs
      // noop for now
    });
  }

  disconnectedCallback() {
    try {
      EventBus.off("data-changed");
    } catch (e) {}
  }

  // ---------- helpers ----------
  _fmtCurrency(n){ 
    try{ return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n); }
    catch(e){ return "₹"+Math.round(n); }
  }
  _dateKey(iso){ return iso.slice(0,10); } // assume iso like YYYY-MM-DD...
  _labelFromKey(key){
    const d = new Date(key);
    const opts = { day:'2-digit', month:'short', year:'numeric' };
    return d.toLocaleDateString(undefined, opts).replace(',', '');
  }

  async _loadMonth(y,m){
    // load TX for that month
    const start = new Date(y,m,1);
    const end = new Date(y,m+1,1);
    try{
      // load all transactions and filter clientside (Dexie simple)
      const all = await db.transactions.toArray();
      const txs = (Array.isArray(all) ? all : []).filter(t=>{
        const d = new Date(t.date);
        return d >= start && d < end;
      }).sort((a,b)=> new Date(b.date) - new Date(a.date)); // newest first

      this.tx = txs;
      this._groupByDate();
      this._render();
    }catch(e){
      console.error("home: load error",e);
      this.tx = [];
      this.grouped = [];
      this._render();
    }
  }

  _groupByDate(){
    const map = new Map();
    for(const t of this.tx){
      const key = this._dateKey(t.date || (new Date()).toISOString());
      if(!map.has(key)) map.set(key, { dateKey:key, items:[], total:0 });
      const g = map.get(key);
      g.items.push(t);
      g.total += Number(t.amount || 0);
    }
    // convert to array sorted descending by date (latest first)
    this.grouped = Array.from(map.values()).sort((a,b)=> new Date(b.dateKey) - new Date(a.dateKey))
      .map(g => ({ ...g, label: this._labelFromKey(g.dateKey) }));
  }

  // ---------- UI & events ----------
  _bind(){
    const root = this.shadowRoot;
    root.addEventListener('touchstart', (e)=> this._onTouchStart(e), {passive:true});
    root.addEventListener('touchmove', (e)=> this._onTouchMove(e), {passive:true});
    root.addEventListener('touchend', (e)=> this._onTouchEnd(e), {passive:true});

    // click handlers delegated
    root.addEventListener('click', (e)=>{
      const el = e.target.closest('[data-action]');
      if(!el) return;
      const act = el.dataset.action;
      if(act === 'open-entry') EventBus.emit('open-entry-sheet', {});
      if(act === 'prev-month') this._changeMonth(-1);
      if(act === 'next-month') this._changeMonth(1);
      if(act === 'open-tx') {
        const id = Number(el.dataset.id);
        const tx = this.tx.find(t=>Number(t.id)===id);
        EventBus.emit('open-entry-sheet', tx || {});
      }
    });
  }

  _onTouchStart(e){
    const t = e.touches[0];
    this._touch.start = t.clientX;
    this._touch.x = t.clientX;
    this._touch.y = t.clientY;
  }
  _onTouchMove(e){
    const t = e.touches[0];
    this._touch.x = t.clientX;
    this._touch.y = t.clientY;
  }
  _onTouchEnd(){
    const dx = this._touch.x - this._touch.start;
    const thresh = 60; // px
    if(dx < -thresh) { // swipe left => PREVIOUS month (as you wanted)
      this._changeMonth(-1);
    } else if (dx > thresh) { // swipe right => NEXT month
      this._changeMonth(1);
    }
    this._touch = { x:0,y:0,start:0,end:0 };
  }

  _changeMonth(dir){
    const d = new Date(this.current.getFullYear(), this.current.getMonth() + dir, 1);
    this.current = d;
    this._loadMonth(d.getFullYear(), d.getMonth());
    // small visual feedback: emit event so tab-bar maybe highlight
    EventBus.emit('month-changed', { year: d.getFullYear(), month: d.getMonth() });
  }

  // ---------- render ----------
  render(){
    this.shadowRoot.innerHTML = `
      <style>
        :host{display:block;padding:18px;box-sizing:border-box;color:var(--text,#e6eef9);font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}
        .wrap{max-width:980px;margin:0 auto}
        .summary{
          background:linear-gradient(135deg,#2563eb,#06b6d4);
          color:#fff;padding:18px;border-radius:14px;box-shadow:0 12px 30px rgba(2,6,23,0.6);
          display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px;
        }
        .sum-left{display:flex;flex-direction:column}
        .month-name{font-weight:700;font-size:18px}
        .total{font-size:28px;font-weight:800;margin-top:6px}
        .meta{font-size:12px;opacity:0.95;margin-top:6px}
        .mini-chart{width:160px;height:48px}
        .days{margin-top:8px}
        .day-block{background:linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01));border-radius:10px;padding:12px;margin-bottom:10px}
        .day-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
        .date-left{font-weight:700}
        .date-right{font-weight:700}
        .tx-item{display:flex;justify-content:space-between;gap:12px;padding:8px 6px;border-radius:8px}
        .tx-meta{display:flex;gap:8px;align-items:center}
        .tx-cat{font-weight:600}
        .tx-note{opacity:0.75;font-size:13px}
        .tx-amt{white-space:nowrap;font-weight:700}
        .empty{padding:28px;text-align:center;color:rgba(255,255,255,0.6)}
        .swipe-hint{font-size:12px;opacity:0.7;margin-top:8px;text-align:center}
        .controls{display:none; /* swipe-only chosen */ }
        @media(min-width:880px){ .wrap{padding-left:6px;padding-right:6px} }
      </style>

      <div class="wrap">
        <div class="summary" role="region" aria-label="Month summary">
          <div class="sum-left">
            <div class="month-name" id="monthName">Month</div>
            <div class="total" id="monthTotal">₹0</div>
            <div class="meta" id="monthMeta">0 tx • Top: —</div>
          </div>
          <div>
            <svg class="mini-chart" id="miniChart" viewBox="0 0 160 48" preserveAspectRatio="none" aria-hidden="true"></svg>
          </div>
        </div>

        <div class="swipe-hint">Swipe left to go to previous month, swipe right for next month</div>

        <div class="days" id="daysList" aria-live="polite"></div>
        <div class="empty" id="emptyState" style="display:none">No transactions this month. Tap + to add one.</div>
      </div>
    `;
  }

  _render(){
    // update summary
    const monthName = this.shadowRoot.getElementById('monthName');
    const monthTotalEl = this.shadowRoot.getElementById('monthTotal');
    const monthMeta = this.shadowRoot.getElementById('monthMeta');
    const miniChart = this.shadowRoot.getElementById('miniChart');
    const daysList = this.shadowRoot.getElementById('daysList');
    const emptyState = this.shadowRoot.getElementById('emptyState');

    const y = this.current.getFullYear(), m = this.current.getMonth();
    const monthLabel = this.current.toLocaleString(undefined,{month:'long', year:'numeric'});
    monthName.textContent = monthLabel;

    // compute totals & top category
    const total = this.tx.reduce((s,t)=> s + Number(t.amount || 0), 0);
    monthTotalEl.textContent = this._fmtCurrency(total);
    monthMeta.textContent = `${this.tx.length} tx • Top: ${this._topCategoryText()}`;

    // mini chart: bar per day (take up to 12 bars)
    const daily = this.grouped.map(g=>g.total).slice(0,12).reverse(); // older left to right
    miniChart.innerHTML = this._renderMiniChart(daily);

    // days list
    daysList.innerHTML = '';
    if(!this.grouped || this.grouped.length===0){
      emptyState.style.display = 'block';
      return;
    } else emptyState.style.display = 'none';

    for(const g of this.grouped){
      const day = document.createElement('div');
      day.className = 'day-block';
      day.innerHTML = `
        <div class="day-head">
          <div class="date-left">${g.label}</div>
          <div class="date-right">${this._fmtCurrency(g.total)}</div>
        </div>
        <div class="tx-list">
          ${g.items.map(t=>`
            <div class="tx-item" data-action="open-tx" data-id="${t.id}" tabindex="0" role="button" aria-label="Open transaction">
              <div class="tx-meta">
                <div class="tx-cat">${this._esc(t.catName || '—')}</div>
                <div class="tx-note">${this._esc(t.note || '')}</div>
              </div>
              <div class="tx-amt">${this._fmtCurrency(Number(t.amount||0))}</div>
            </div>
          `).join('')}
        </div>
      `;
      daysList.appendChild(day);
    }
  }

  _topCategoryText(){
    // aggregate by catName
    const map = new Map();
    for(const t of this.tx){
      const k = t.catName || 'Uncategorized';
      map.set(k, (map.get(k)||0) + Number(t.amount || 0));
    }
    const arr = Array.from(map.entries()).sort((a,b)=>b[1]-a[1]);
    if(arr.length===0) return '—';
    const [name,val] = arr[0];
    return `${name} • ${this._fmtCurrency(val)}`;
  }

  _renderMiniChart(values){
    if(!values || values.length===0) return '';
    const w = 160, h = 48, pad = 4;
    const max = Math.max(...values,1);
    const step = w / values.length;
    // draw simple rects
    let html = '';
    values.forEach((v,i)=>{
      const barW = Math.max(4, Math.floor(step*0.6));
      const x = Math.floor(i*step) + Math.floor((step-barW)/2);
      const barH = Math.round((v/max) * (h - pad*2));
      const y = h - pad - barH;
      html += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="3" fill="rgba(35, 190, 144, 0.69)"></rect>`;
    });
    return html;
  }

  _esc(s=''){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
}

customElements.define('home-screen', HomeScreen);
