// components/tx-item.js
import { EventBus } from '../js/event-bus.js';
import { fmtCurrency } from '../js/utils.js';

class TxItem extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.tx = null;
    this._longPressTimer = null;
    this._startTime = 0;
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { 
          display: block;
        }
        
        .card { 
          padding: 14px 16px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.03);
          margin: 6px 12px;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid rgba(255, 255, 255, 0.05);
          position: relative;
          overflow: hidden;
        }
        
        .card:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.1);
          transform: translateY(-1px);
        }
        
        .card:active {
          transform: scale(0.98);
        }
        
        /* Long press visual feedback */
        .card.pressing {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.3);
        }
        
        .card.pressing::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          background: rgba(239, 68, 68, 0.2);
          animation: fillProgress 700ms linear forwards;
        }
        
        @keyframes fillProgress {
          from { width: 0%; }
          to { width: 100%; }
        }
        
        .left { 
          display: flex;
          gap: 12px;
          align-items: center;
          flex: 1;
          min-width: 0;
          z-index: 1;
        }
        
        .emoji {
          font-size: 24px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          flex-shrink: 0;
        }
        
        .details {
          flex: 1;
          min-width: 0;
        }
        
        .title { 
          font-weight: 600;
          font-size: 15px;
          color: #e2e8f0;
          margin-bottom: 3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .meta { 
          font-size: 12px;
          color: #94a3b8;
          display: flex;
          gap: 8px;
          align-items: center;
        }
        
        .category-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          background: rgba(59, 130, 246, 0.15);
          border-radius: 6px;
          font-size: 11px;
          color: #93c5fd;
          font-weight: 500;
        }
        
        .actions { 
          display: flex;
          gap: 8px;
          align-items: center;
          z-index: 1;
        }
        
        .amount {
          font-weight: 700;
          font-size: 16px;
          color: #10b981;
          white-space: nowrap;
        }
        
        .amount.negative {
          color: #ef4444;
        }
        
        /* Ripple effect */
        .ripple {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.4);
          transform: scale(0);
          animation: ripple-animation 0.6s ease-out;
          pointer-events: none;
        }
        
        @keyframes ripple-animation {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
        
        /* Accessibility */
        .card:focus {
          outline: 2px solid rgba(59, 130, 246, 0.5);
          outline-offset: 2px;
        }
        
        /* Loading state */
        .card.deleting {
          opacity: 0.5;
          pointer-events: none;
          animation: pulse 1s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.3; }
        }
      </style>
      
      <div class="card" id="root" tabindex="0" role="button" aria-label="Transaction item">
        <div class="left">
          <div class="emoji" id="emoji">🧾</div>
          <div class="details">
            <div class="title" id="title">Description</div>
            <div class="meta">
              <span id="date">date</span>
              <span class="category-badge" id="category" style="display:none;">
                <span id="categoryText"></span>
              </span>
            </div>
          </div>
        </div>
        <div class="actions">
          <div class="amount" id="amount">₹0</div>
        </div>
      </div>
    `;
    
    this.$root = this.shadowRoot.getElementById('root');
    this.$title = this.shadowRoot.getElementById('title');
    this.$date = this.shadowRoot.getElementById('date');
    this.$amount = this.shadowRoot.getElementById('amount');
    this.$emoji = this.shadowRoot.getElementById('emoji');
    this.$category = this.shadowRoot.getElementById('category');
    this.$categoryText = this.shadowRoot.getElementById('categoryText');

    this._setupEventListeners();
  }

  _setupEventListeners() {
    // Click to edit
    this.$root.addEventListener('click', (e) => {
      // Don't open if we're in the middle of a long press
      if (this._isLongPress) {
        this._isLongPress = false;
        return;
      }
      
      // Ripple effect
      this._createRipple(e);
      
      // Open entry sheet
      EventBus.emit('open-entry-sheet', this.tx);
    });

    // Keyboard accessibility
    this.$root.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        EventBus.emit('open-entry-sheet', this.tx);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        this._confirmDelete();
      }
    });

    // Long press to delete
    const startLongPress = (e) => {
      this._isLongPress = false;
      this._startTime = Date.now();
      
      this._longPressTimer = setTimeout(() => {
        this._isLongPress = true;
        this._confirmDelete();
      }, 700);
      
      // Add visual feedback
      this.$root.classList.add('pressing');
    };

    const endLongPress = () => {
      if (this._longPressTimer) {
        clearTimeout(this._longPressTimer);
        this._longPressTimer = null;
      }
      
      // Remove visual feedback
      this.$root.classList.remove('pressing');
      
      // Reset long press flag after a short delay
      setTimeout(() => {
        this._isLongPress = false;
      }, 100);
    };

    // Touch events
    this.$root.addEventListener('touchstart', startLongPress, { passive: true });
    this.$root.addEventListener('touchend', endLongPress, { passive: true });
    this.$root.addEventListener('touchcancel', endLongPress, { passive: true });

    // Mouse events (for desktop)
    this.$root.addEventListener('mousedown', startLongPress);
    this.$root.addEventListener('mouseup', endLongPress);
    this.$root.addEventListener('mouseleave', endLongPress);
  }

  _createRipple(e) {
    const rect = this.$root.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.style.width = ripple.style.height = '10px';
    
    this.$root.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
  }

  _confirmDelete() {
    // Haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    const message = this.tx.note 
      ? `Delete "${this.tx.note}"?` 
      : 'Delete this transaction?';
    
    if (confirm(message)) {
      this.$root.classList.add('deleting');
      EventBus.emit('tx-delete', this.tx.id);
    }
  }

  _formatDate(dateStr) {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Show relative dates for recent transactions
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    // Otherwise show formatted date
    return date.toLocaleDateString(undefined, { 
      day: '2-digit', 
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }

  set data(tx) {
    if (!tx) return;
    
    this.tx = tx;
    
    // Title (note or category name)
    this.$title.textContent = tx.note || tx.catName || 'Transaction';
    
    // Date with relative formatting
    this.$date.textContent = this._formatDate(tx.date);
    
    // Amount with color coding
    const amount = Number(tx.amount) || 0;
    this.$amount.textContent = fmtCurrency(amount);
    this.$amount.classList.toggle('negative', amount < 0);
    
    // Emoji
    this.$emoji.textContent = tx.emoji || tx.catEmoji || '🧾';
    
    // Category badge (show if note exists and is different from category)
    if (tx.note && tx.catName && tx.note !== tx.catName) {
      this.$categoryText.textContent = tx.catName;
      this.$category.style.display = 'inline-flex';
    } else {
      this.$category.style.display = 'none';
    }
    
    // Accessibility
    this.$root.setAttribute('aria-label', 
      `Transaction: ${tx.note || tx.catName}, ${fmtCurrency(amount)}, ${this._formatDate(tx.date)}`
    );
  }

  get data() { 
    return this.tx; 
  }

  disconnectedCallback() {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
    }
  }
}

customElements.define('tx-item', TxItem);