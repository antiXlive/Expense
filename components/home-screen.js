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
    this._isAnimating = false;
    this._longPressTimer = null;
    this.render();
  }

  connectedCallback() {
    this._bind();
    this._loadMonth(this.current.getFullYear(), this.current.getMonth());
    
    // Store handler references for proper cleanup
    this._txUpdatedHandler = () => this._loadMonth(this.current.getFullYear(), this.current.getMonth());
    this._navigateHandler = (p) => {
      // close any expanded things if navigation occurs
    };
    
    // Listen to transaction events from app.js
    EventBus.on("tx-updated", this._txUpdatedHandler);
    EventBus.on("tx-added", this._txUpdatedHandler);
    EventBus.on("tx-deleted", this._txUpdatedHandler);
    EventBus.on("db-loaded", this._txUpdatedHandler);
    EventBus.on("navigate", this._navigateHandler);
  }

  disconnectedCallback() {
    try {
      EventBus.off("tx-updated", this._txUpdatedHandler);
      EventBus.off("tx-added", this._txUpdatedHandler);
      EventBus.off("tx-deleted", this._txUpdatedHandler);
      EventBus.off("db-loaded", this._txUpdatedHandler);
      EventBus.off("navigate", this._navigateHandler);
    } catch (e) {
      console.error("Error cleaning up listeners:", e);
    }
    
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
    }
  }

  // ---------- helpers ----------
  _fmtCurrency(n){ 
    try{ return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n); }
    catch(e){ return "₹"+Math.round(n); }
  }
  
  _dateKey(iso){ return iso.slice(0,10); }
  
  _labelFromKey(key){
    const date = new Date(key);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Reset time for comparison
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    if (date.getTime() === today.getTime()) {
      return 'Today';
    } else if (date.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    }
    
    const opts = { day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString(undefined, opts).replace(',', '');
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

    // Delegated click handler
    root.addEventListener('click', (e)=>{
      const el = e.target.closest('[data-action]');
      if(!el) return;
      const act = el.dataset.action;
      
      if(act === 'open-tx') {
        const id = Number(el.dataset.id);
        const tx = this.tx.find(t=>Number(t.id)===id);
        this._createRipple(e, el);
        EventBus.emit('open-entry-sheet', tx || {});
      }
    });
  }

  _onTouchStart(e){
    const t = e.touches[0];
    this._touch.start = t.clientX;
    this._touch.x = t.clientX;
    this._touch.y = t.clientY;
    
    // Check if touching a transaction item for long press
    const txItem = e.target.closest('.tx-item');
    if (txItem && txItem.dataset.id) {
      this._setupLongPress(txItem);
    }
  }
  
  _onTouchMove(e){
    const t = e.touches[0];
    const dx = Math.abs(t.clientX - this._touch.start);
    const dy = Math.abs(t.clientY - this._touch.y);
    
    // If moved more than 10px, cancel long press
    if (dx > 10 || dy > 10) {
      this._cancelLongPress();
    }
    
    this._touch.x = t.clientX;
    this._touch.y = t.clientY;
  }
  
  _onTouchEnd(){
    this._cancelLongPress();
    
    if (this._isAnimating) return;
    
    const dx = this._touch.x - this._touch.start;
    const thresh = 60; // px
    if(dx < -thresh) { // swipe left => PREVIOUS month
      this._changeMonth(-1);
    } else if (dx > thresh) { // swipe right => NEXT month
      this._changeMonth(1);
    }
    this._touch = { x:0,y:0,start:0,end:0 };
  }

  _setupLongPress(element) {
    this._cancelLongPress();
    
    element.classList.add('pressing');
    
    this._longPressTimer = setTimeout(() => {
      const id = Number(element.dataset.id);
      const tx = this.tx.find(t => Number(t.id) === id);
      
      if (tx) {
        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        
        const message = tx.note 
          ? `Delete "${tx.note}"?` 
          : 'Delete this transaction?';
        
        if (confirm(message)) {
          element.classList.add('deleting');
          EventBus.emit('tx-delete', tx.id);
        }
      }
      
      element.classList.remove('pressing');
    }, 700);
  }

  _cancelLongPress() {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
    
    // Remove pressing class from all items
    this.shadowRoot.querySelectorAll('.tx-item.pressing').forEach(el => {
      el.classList.remove('pressing');
    });
  }

  _createRipple(e, element) {
    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    
    element.style.position = 'relative';
    element.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
  }

  _changeMonth(dir){
    if (this._isAnimating) return;
    this._isAnimating = true;
    
    const d = new Date(this.current.getFullYear(), this.current.getMonth() + dir, 1);
    this.current = d;
    
    // Add slide animation
    const daysList = this.shadowRoot.getElementById('daysList');
    daysList.style.opacity = '0';
    daysList.style.transform = `translateX(${dir * 20}px)`;
    
    setTimeout(() => {
      this._loadMonth(d.getFullYear(), d.getMonth());
      
      // Animate back in
      setTimeout(() => {
        daysList.style.transition = 'all 0.3s ease';
        daysList.style.opacity = '1';
        daysList.style.transform = 'translateX(0)';
        
        setTimeout(() => {
          daysList.style.transition = '';
          this._isAnimating = false;
        }, 300);
      }, 50);
    }, 150);
    
    // Haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    
    EventBus.emit('month-changed', { year: d.getFullYear(), month: d.getMonth() });
  }

  // ---------- render ----------
  render(){
    this.shadowRoot.innerHTML = `
      <style>
        :host{
          display:block;
          padding:18px;
          box-sizing:border-box;
          color:var(--text,#e6eef9);
          font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;
          overflow-y: auto;
          height: 100%;
        }
        
        .wrap{max-width:980px;margin:0 auto}
        
        .summary{
          background:linear-gradient(135deg,#2563eb,#06b6d4);
          color:#fff;
          padding:20px;
          border-radius:16px;
          box-shadow:0 12px 30px rgba(2,6,23,0.6);
          display:flex;
          flex-direction:row;
          align-items:center;
          justify-content:space-between;
          gap:16px;
          margin-bottom:20px;
          position: relative;
          overflow: hidden;
        }
        
        .summary::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          pointer-events: none;
        }
        
        .sum-left{display:flex;flex-direction:column;z-index:1}
        .month-name{font-weight:700;font-size:20px;opacity:0.95}
        .total{font-size:32px;font-weight:800;margin-top:8px;letter-spacing:-0.5px}
        .meta{font-size:13px;opacity:0.9;margin-top:8px;display:flex;align-items:center;gap:8px}
        .meta-divider{opacity:0.5}
        
        .mini-chart{width:160px;height:60px;z-index:1}
        
        .days{margin-top:12px}
        
        .day-block{
          background:linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02));
          border-radius:12px;
          padding:14px;
          margin-bottom:12px;
          border:1px solid rgba(255,255,255,0.05);
          transition:all 0.2s ease;
        }
        
        .day-block:hover{
          background:linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03));
          border-color:rgba(255,255,255,0.1);
        }
        
        .day-head{
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:10px;
          padding-bottom:8px;
          border-bottom:1px solid rgba(255,255,255,0.05);
        }
        
        .date-left{
          font-weight:700;
          font-size:14px;
          color:#e2e8f0;
        }
        
        .date-right{
          font-weight:700;
          font-size:14px;
          color:#10b981;
        }
        
        .tx-list{
          display:flex;
          flex-direction:column;
          gap:2px;
        }
        
        .tx-item{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:12px;
          padding:12px 10px;
          border-radius:10px;
          cursor:pointer;
          transition:all 0.15s ease;
          position:relative;
          overflow:hidden;
          user-select: none;
        }
        
        .tx-item:hover{
          background:rgba(255,255,255,0.06);
        }
        
        .tx-item:active{
          transform:scale(0.98);
        }
        
        /* Long press visual feedback */
        .tx-item.pressing {
          background: rgba(239, 68, 68, 0.1);
        }
        
        .tx-item.pressing::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          background: rgba(239, 68, 68, 0.2);
          animation: fillProgress 700ms linear forwards;
          z-index: 0;
        }
        
        @keyframes fillProgress {
          from { width: 0%; }
          to { width: 100%; }
        }
        
        .tx-item.deleting {
          opacity: 0.5;
          pointer-events: none;
        }
        
        .tx-left{
          display:flex;
          align-items:center;
          gap:12px;
          flex:1;
          min-width:0;
          z-index:1;
        }
        
        .tx-emoji{
          font-size:24px;
          width:40px;
          height:40px;
          display:flex;
          align-items:center;
          justify-content:center;
          background:rgba(255,255,255,0.05);
          border-radius:10px;
          flex-shrink:0;
        }
        
        .tx-meta{
          display:flex;
          flex-direction:column;
          gap:3px;
          flex:1;
          min-width:0;
        }
        
        .tx-cat{
          font-weight:600;
          font-size:14px;
          color:#e2e8f0;
        }
        
        .tx-note{
          opacity:0.7;
          font-size:12px;
          color:#94a3b8;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }
        
        .tx-amt{
          white-space:nowrap;
          font-weight:700;
          font-size:16px;
          color:#10b981;
          z-index:1;
        }
        
        .tx-amt.negative{
          color:#ef4444;
        }
        
        /* Ripple effect */
        .ripple {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.4);
          transform: scale(0);
          animation: ripple-animation 0.6s ease-out;
          pointer-events: none;
        }
        
        @keyframes ripple-animation {
          to {
            transform: scale(20);
            opacity: 0;
          }
        }
        
        .empty{
          padding:60px 28px;
          text-align:center;
          color:rgba(255,255,255,0.5);
        }
        
        .empty-icon{
          font-size:48px;
          margin-bottom:16px;
          opacity:0.5;
        }
        
        .empty-title{
          font-size:16px;
          font-weight:600;
          margin-bottom:8px;
          color:#e2e8f0;
        }
        
        .empty-subtitle{
          font-size:13px;
          color:#94a3b8;
        }
        
        .swipe-hint{
          font-size:12px;
          opacity:0.6;
          margin-top:8px;
          text-align:center;
          color:#94a3b8;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:8px;
        }
        
        .swipe-hint::before,
        .swipe-hint::after{
          content:'';
          height:1px;
          width:40px;
          background:rgba(255,255,255,0.1);
        }
        
        /* Animations */
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .day-block {
          animation: slideIn 0.3s ease forwards;
        }
        
        .day-block:nth-child(1) { animation-delay: 0.05s; }
        .day-block:nth-child(2) { animation-delay: 0.1s; }
        .day-block:nth-child(3) { animation-delay: 0.15s; }
        .day-block:nth-child(4) { animation-delay: 0.2s; }
        .day-block:nth-child(5) { animation-delay: 0.25s; }
        
        @media(min-width:880px){ 
          .wrap{padding-left:6px;padding-right:6px}
        }
      </style>

      <div class="wrap">
        <div class="summary" role="region" aria-label="Month summary">
          <div class="sum-left">
            <div class="month-name" id="monthName">Month</div>
            <div class="total" id="monthTotal">₹0</div>
            <div class="meta" id="monthMeta">
              <span id="txCount">0 tx</span>
              <span class="meta-divider">•</span>
              <span id="topCat">Top: —</span>
            </div>
          </div>
          <div>
            <svg class="mini-chart" id="miniChart" viewBox="0 0 160 60" preserveAspectRatio="none" aria-hidden="true"></svg>
          </div>
        </div>

        <div class="swipe-hint">Swipe to change month • Long press to delete</div>

        <div class="days" id="daysList" aria-live="polite"></div>
        <div class="empty" id="emptyState" style="display:none">
          <div class="empty-icon">💸</div>
          <div class="empty-title">No transactions this month</div>
          <div class="empty-subtitle">Tap the + button to add your first transaction</div>
        </div>
      </div>
    `;
  }

  _render(){
    // update summary
    const monthName = this.shadowRoot.getElementById('monthName');
    const monthTotalEl = this.shadowRoot.getElementById('monthTotal');
    const txCount = this.shadowRoot.getElementById('txCount');
    const topCat = this.shadowRoot.getElementById('topCat');
    const miniChart = this.shadowRoot.getElementById('miniChart');
    const daysList = this.shadowRoot.getElementById('daysList');
    const emptyState = this.shadowRoot.getElementById('emptyState');

    const monthLabel = this.current.toLocaleString(undefined,{month:'long', year:'numeric'});
    monthName.textContent = monthLabel;

    // compute totals & top category
    const total = this.tx.reduce((s,t)=> s + Number(t.amount || 0), 0);
    monthTotalEl.textContent = this._fmtCurrency(total);
    txCount.textContent = `${this.tx.length} transaction${this.tx.length !== 1 ? 's' : ''}`;
    topCat.textContent = `Top: ${this._topCategoryText()}`;

    // mini chart
    const daily = this.grouped.map(g=>g.total).slice(0,12).reverse();
    miniChart.innerHTML = this._renderMiniChart(daily);

    // days list
    daysList.innerHTML = '';
    if(!this.grouped || this.grouped.length===0){
      emptyState.style.display = 'block';
      daysList.style.display = 'none';
      return;
    } else {
      emptyState.style.display = 'none';
      daysList.style.display = 'block';
    }

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
            <div class="tx-item" data-action="open-tx" data-id="${t.id}" tabindex="0" role="button" aria-label="Transaction: ${this._esc(t.note || t.catName)}">
              <div class="tx-left">
                <div class="tx-emoji">${t.emoji || t.catEmoji || '🧾'}</div>
                <div class="tx-meta">
                  <div class="tx-cat">${this._esc(t.catName || 'Uncategorized')}</div>
                  ${t.note ? `<div class="tx-note">${this._esc(t.note)}</div>` : ''}
                </div>
              </div>
              <div class="tx-amt ${Number(t.amount) < 0 ? 'negative' : ''}">${this._fmtCurrency(Number(t.amount||0))}</div>
            </div>
          `).join('')}
        </div>
      `;
      daysList.appendChild(day);
    }
  }

  _topCategoryText(){
    const map = new Map();
    for(const t of this.tx){
      const k = t.catName || 'Uncategorized';
      map.set(k, (map.get(k)||0) + Number(t.amount || 0));
    }
    const arr = Array.from(map.entries()).sort((a,b)=>b[1]-a[1]);
    if(arr.length===0) return '—';
    const [name,val] = arr[0];
    return `${name} (${this._fmtCurrency(val)})`;
  }

  _renderMiniChart(values){
    if(!values || values.length===0) return '';
    const w = 160, h = 60, pad = 6;
    const max = Math.max(...values,1);
    const step = w / values.length;
    let html = '<defs><linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:rgba(16, 185, 129, 0.8);stop-opacity:1" /><stop offset="100%" style="stop-color:rgba(16, 185, 129, 0.3);stop-opacity:1" /></linearGradient></defs>';
    values.forEach((v,i)=>{
      const barW = Math.max(4, Math.floor(step*0.7));
      const x = Math.floor(i*step) + Math.floor((step-barW)/2);
      const barH = Math.round((v/max) * (h - pad*2));
      const y = h - pad - barH;
      html += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="4" fill="url(#chartGradient)"></rect>`;
    });
    return html;
  }

  _esc(s=''){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
}

customElements.define('home-screen', HomeScreen);