// components/tx-list.js
import { EventBus } from '../js/event-bus.js';

class TxList extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.showFAB = true;
    this._transactions = [];
    this.render();
  }

  connectedCallback() {
    // Store handler references for proper cleanup
    this._handlers = {
      dbLoaded: (data) => this.renderList(data.tx || []),
      txAdded: (tx) => this.prependTx(tx),
      txUpdated: (tx) => this.updateTx(tx),
      txDeleted: (id) => this.removeTx(id),
      navigated: (payload) => {
        const to = payload?.to || payload;
        EventBus.emit('show-fab', to === 'home');
      },
      showFab: (v) => this.toggleFAB(v)
    };

    EventBus.on('db-loaded', this._handlers.dbLoaded);
    EventBus.on('tx-added', this._handlers.txAdded);
    EventBus.on('tx-updated', this._handlers.txUpdated);
    EventBus.on('tx-deleted', this._handlers.txDeleted);
    EventBus.on('navigated', this._handlers.navigated);
    EventBus.on('show-fab', this._handlers.showFab);

    // Request initial data
    setTimeout(() => EventBus.emit('request-data'), 50);
  }

  disconnectedCallback() {
    // Clean up event listeners
    if (this._handlers) {
      EventBus.off('db-loaded', this._handlers.dbLoaded);
      EventBus.off('tx-added', this._handlers.txAdded);
      EventBus.off('tx-updated', this._handlers.txUpdated);
      EventBus.off('tx-deleted', this._handlers.txDeleted);
      EventBus.off('navigated', this._handlers.navigated);
      EventBus.off('show-fab', this._handlers.showFab);
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { 
          display: block;
          height: 100%;
          padding-top: 12px;
          overflow-y: auto;
        }
        
        .list { 
          padding-bottom: 100px;
          min-height: 100%;
        }
        
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 50vh;
          padding: 40px 20px;
          text-align: center;
        }
        
        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
          opacity: 0.5;
        }
        
        .empty-title {
          font-size: 18px;
          font-weight: 600;
          color: #e2e8f0;
          margin-bottom: 8px;
        }
        
        .empty-subtitle {
          font-size: 14px;
          color: #94a3b8;
          line-height: 1.5;
        }
        
        .section-header {
          position: sticky;
          top: 0;
          background: linear-gradient(180deg, #0f172a 0%, rgba(15, 23, 42, 0.95) 100%);
          backdrop-filter: blur(10px);
          padding: 12px 16px 8px;
          z-index: 10;
          margin-bottom: 4px;
        }
        
        .section-title {
          color: #94a3b8;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .section-summary {
          color: #64748b;
          font-size: 11px;
          margin-top: 2px;
        }
        
        .app-fab {
          position: fixed;
          bottom: 80px;
          right: 20px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2563eb, #06b6d4);
          color: white;
          border: none;
          font-size: 28px;
          font-weight: 300;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(37, 99, 235, 0.4);
          display: grid;
          place-items: center;
          transition: all 0.2s ease;
          z-index: 100;
          line-height: 1;
        }
        
        .app-fab:hover {
          transform: scale(1.1) rotate(90deg);
          box-shadow: 0 12px 32px rgba(37, 99, 235, 0.5);
        }
        
        .app-fab:active {
          transform: scale(0.95);
        }
        
        .app-fab.hidden {
          opacity: 0;
          pointer-events: none;
          transform: scale(0.8);
        }
        
        /* Loading skeleton */
        .skeleton {
          padding: 14px 16px;
          margin: 6px 12px;
          border-radius: 12px;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.03) 0%,
            rgba(255, 255, 255, 0.06) 50%,
            rgba(255, 255, 255, 0.03) 100%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          height: 68px;
        }
        
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        
        /* Smooth scroll */
        :host {
          scroll-behavior: smooth;
        }
      </style>
      
      <div class="list" id="list">
        <div class="skeleton"></div>
        <div class="skeleton"></div>
        <div class="skeleton"></div>
      </div>
      
      <button class="app-fab" id="fab" aria-label="Add transaction">+</button>
    `;
    
    this.$list = this.shadowRoot.getElementById('list');
    this.$fab = this.shadowRoot.getElementById('fab');
    
    this.$fab.addEventListener('click', () => {
      EventBus.emit('open-entry-sheet', {});
    });
  }

  renderList(tx) {
    this._transactions = tx || [];
    this.$list.innerHTML = '';
    
    // Empty state
    if (!tx || tx.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `
        <div class="empty-icon">💸</div>
        <div class="empty-title">No transactions yet</div>
        <div class="empty-subtitle">Tap the + button below to add your first transaction</div>
      `;
      this.$list.appendChild(empty);
      return;
    }
    
    // Group by date
    const grouped = this._groupByDate(tx);
    
    // Render each group
    for (const [dateKey, items] of Object.entries(grouped)) {
      // Section header
      const header = document.createElement('div');
      header.className = 'section-header';
      const total = items.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      header.innerHTML = `
        <div class="section-title">${this._formatDateHeader(dateKey)}</div>
        <div class="section-summary">${items.length} transactions • ${this._formatCurrency(total)}</div>
      `;
      this.$list.appendChild(header);
      
      // Transaction items
      items.forEach(t => {
        const el = document.createElement('tx-item');
        el.data = t;
        this.$list.appendChild(el);
      });
    }
  }

  _groupByDate(transactions) {
    const sorted = [...transactions].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
    
    const groups = {};
    sorted.forEach(tx => {
      const dateKey = tx.date ? tx.date.split('T')[0] : 'unknown';
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(tx);
    });
    
    return groups;
  }

  _formatDateHeader(dateKey) {
    if (dateKey === 'unknown') return 'Unknown Date';
    
    const date = new Date(dateKey);
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
    
    // Format: "Mon, 24 Nov"
    return date.toLocaleDateString(undefined, { 
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  }

  _formatCurrency(amount) {
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(amount);
    } catch (e) {
      return '₹' + Math.round(amount);
    }
  }

  prependTx(tx) {
    // Re-render entire list to maintain grouping
    this._transactions.unshift(tx);
    this.renderList(this._transactions);
    
    // Scroll to top smoothly
    this.scrollTo({ top: 0, behavior: 'smooth' });
  }

  updateTx(tx) {
    const index = this._transactions.findIndex(t => t.id === tx.id);
    if (index !== -1) {
      this._transactions[index] = tx;
      this.renderList(this._transactions);
    }
  }

  removeTx(id) {
    this._transactions = this._transactions.filter(t => t.id !== id);
    this.renderList(this._transactions);
  }

  toggleFAB(v) {
    if (v) {
      this.$fab.classList.remove('hidden');
    } else {
      this.$fab.classList.add('hidden');
    }
  }
}

customElements.define('tx-list', TxList);