// components/entry-sheet.js
// FINAL PRODUCTION — Entry form with blur backdrop, polished inputs, smooth animations

import { EventBus } from '../js/event-bus.js';
import { fmtDateISO } from '../js/utils.js';

class EntrySheet extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.tx = null;
    this._bodyOverflow = null;
    this.render();
  }

  connectedCallback() {
    EventBus.on('open-entry-sheet', (d) => this.open(d));
    
    // Close sheet when navigating to other screens
    EventBus.on('navigate', () => {
      if (this.style.display === 'block') {
        this.close();
      }
    });
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: none;
        }

        /* Enhanced blur overlay */
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(12px) saturate(140%);
          -webkit-backdrop-filter: blur(12px) saturate(140%);
          opacity: 0;
          transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }
        .overlay.show {
          opacity: 1;
          pointer-events: auto;
        }

        /* Sheet container */
        .sheet {
          position: fixed;
          left: 50%;
          transform: translateX(-50%) translateY(100%);
          bottom: 0;
          width: calc(100% - 32px);
          max-width: 760px;
          max-height: calc(100vh - 120px);
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          padding: 24px 20px 180px; /* Extra bottom padding for actions above tab bar */
          background: linear-gradient(180deg, #111827, #0f1419);
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 
            0 -20px 60px rgba(0, 0, 0, 0.8),
            0 -4px 12px rgba(0, 0, 0, 0.5);
          transition: transform 0.35s cubic-bezier(0.18, 0.89, 0.32, 1);
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          box-sizing: border-box;
        }
        .sheet.show {
          transform: translateX(-50%) translateY(0);
        }

        /* Sheet header */
        .sheet-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }

        .sheet-title {
          font-size: 20px;
          font-weight: 700;
          color: #fff;
          margin: 0;
        }

        .sheet-handle {
          width: 40px;
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
          margin: -12px auto 16px;
        }

        /* Input cards - Enhanced styling */
        .card {
          background: rgba(255, 255, 255, 0.04);
          border: 1.5px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          padding: 16px;
          margin-bottom: 14px;
          transition: all 0.2s ease;
        }

        .card:focus-within {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(37, 99, 235, 0.4);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
        }

        /* Input label */
        .input-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Input fields */
        input, textarea {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          color: #fff;
          font-size: 16px;
          font-family: inherit;
          font-weight: 500;
          padding: 0;
        }

        input::placeholder,
        textarea::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }

        /* Amount input - larger and bold */
        #amount {
          font-size: 32px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }

        /* Date input styling */
        #date {
          font-size: 15px;
          color-scheme: dark;
        }

        /* Textarea */
        textarea {
          resize: none;
          min-height: 80px;
          line-height: 1.5;
        }

        /* Category field - button style */
        .cat-field {
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          font-size: 15px;
          color: #e6eef9;
          transition: all 0.2s ease;
          user-select: none;
        }

        .cat-field:hover {
          opacity: 0.8;
        }

        .cat-field:active {
          transform: scale(0.98);
        }

        #catLabel {
          font-weight: 500;
        }

        .cat-arrow {
          font-size: 18px;
          opacity: 0.5;
          transition: transform 0.2s ease;
        }

        .cat-field:hover .cat-arrow {
          transform: translateX(2px);
        }

        /* Sticky bottom actions - positioned above tab bar */
        .actions {
          position: fixed;
          left: 50%;
          transform: translateX(-50%);
          bottom: 94px; /* 66px tab-bar + 14px offset + 14px gap */
          width: calc(100% - 40px);
          max-width: 740px;
          display: flex;
          gap: 12px;
          padding: 16px;
          background: linear-gradient(180deg, #0f1419, #0a0d12);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
          box-sizing: border-box;
          opacity: 0;
          transition: opacity 0.3s ease 0.1s;
        }

        .actions.show {
          opacity: 1;
        }

        /* Buttons */
        .btn {
          flex: 1;
          padding: 14px 18px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.15s ease;
          box-sizing: border-box;
        }

        .btn:active {
          transform: translateY(1px) scale(0.98);
        }

        .btn.cancel {
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.9);
          border: 1.5px solid rgba(255, 255, 255, 0.08);
        }

        .btn.cancel:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        .btn.delete {
          background: rgba(239, 68, 68, 0.12);
          color: #fca5a5;
          border: 1.5px solid rgba(239, 68, 68, 0.2);
        }

        .btn.delete:hover {
          background: rgba(239, 68, 68, 0.18);
        }

        .btn.save {
          background: linear-gradient(135deg, #2563eb, #06b6d4);
          color: #fff;
          box-shadow: 0 4px 16px rgba(37, 99, 235, 0.25);
        }

        .btn.save:hover {
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);
        }

        /* Responsive adjustments */
        @media (max-width: 420px) {
          .sheet {
            width: calc(100% - 20px);
            padding: 20px 16px 170px;
          }
          .actions {
            width: calc(100% - 28px);
            bottom: 90px;
            padding: 12px;
          }
          .btn {
            padding: 12px 14px;
            font-size: 14px;
          }
          #amount {
            font-size: 28px;
          }
        }

        /* Smooth scrollbar */
        .sheet::-webkit-scrollbar {
          width: 6px;
        }
        .sheet::-webkit-scrollbar-track {
          background: transparent;
        }
        .sheet::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .sheet::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }
      </style>

      <div class="overlay" id="ov" aria-hidden="true"></div>

      <div class="sheet" id="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle">
        <div class="sheet-handle"></div>
        
        <div class="sheet-header">
          <h2 class="sheet-title" id="sheetTitle">Add Transaction</h2>
        </div>

        <div class="card">
          <label class="input-label" for="amount">Amount</label>
          <input 
            id="amount" 
            type="number" 
            step="0.01" 
            placeholder="0.00" 
            inputmode="decimal"
            autocomplete="off"
          />
        </div>

        <div class="card">
          <label class="input-label" for="date">Date</label>
          <input id="date" type="date" />
        </div>

        <div class="card cat-field" id="catField" tabindex="0" role="button" aria-label="Choose category">
          <div>
            <div class="input-label">Category</div>
            <span id="catLabel">Select category</span>
          </div>
          <span class="cat-arrow">›</span>
        </div>

        <div class="card">
          <label class="input-label" for="note">Note (optional)</label>
          <textarea id="note" placeholder="Add a note..."></textarea>
        </div>
      </div>

      <div class="actions" id="actions">
        <button class="btn cancel" id="cancelBtn" aria-label="Cancel">Cancel</button>
        <button class="btn delete" id="deleteBtn" style="display:none;" aria-label="Delete transaction">Delete</button>
        <button class="btn save" id="saveBtn" aria-label="Save transaction">Save</button>
      </div>
    `;

    this._bindElements();
    this._bindEvents();
  }

  _bindElements() {
    this.$ov = this.shadowRoot.getElementById('ov');
    this.$sheet = this.shadowRoot.getElementById('sheet');
    this.$actions = this.shadowRoot.getElementById('actions');
    this.$amount = this.shadowRoot.getElementById('amount');
    this.$date = this.shadowRoot.getElementById('date');
    this.$note = this.shadowRoot.getElementById('note');
    this.$catField = this.shadowRoot.getElementById('catField');
    this.$catLabel = this.shadowRoot.getElementById('catLabel');
    this.$sheetTitle = this.shadowRoot.getElementById('sheetTitle');
    this.$save = this.shadowRoot.getElementById('saveBtn');
    this.$delete = this.shadowRoot.getElementById('deleteBtn');
    this.$cancel = this.shadowRoot.getElementById('cancelBtn');
  }

  _bindEvents() {
    // Close on overlay click
    this.$ov.addEventListener('click', () => this.close());
    
    // Cancel button
    this.$cancel.addEventListener('click', () => this.close());

    // Category picker
    this.$catField.addEventListener('click', () => {
      EventBus.emit('open-category-picker', { source: 'entry-sheet' });
    });

    // Keyboard accessibility for category field
    this.$catField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        EventBus.emit('open-category-picker', { source: 'entry-sheet' });
      }
    });

    // Save button
    this.$save.addEventListener('click', () => this._handleSave());

    // Delete button
    this.$delete.addEventListener('click', () => this._handleDelete());

    // Listen for category selection
    EventBus.on('category-selected', (sel) => {
      if (!sel) return;
      this.tx = this.tx || {};
      this.tx.catId = sel.catId;
      this.tx.subId = sel.subId || null;
      this.$catLabel.textContent = `${sel.emoji || ''} ${sel.catName}${sel.subName ? ' — ' + sel.subName : ''}`;
    });

    // Close on Escape key
    this.shadowRoot.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
  }

  _handleSave() {
    const amount = Number(this.$amount.value);
    
    // Validation
    if (!amount || amount <= 0) {
      this.$amount.focus();
      // Could add toast notification here
      return;
    }

    const payload = {
      id: this.tx?.id,
      amount: amount,
      date: this.$date.value || fmtDateISO(),
      note: this.$note.value.trim() || '',
      catId: this.tx?.catId || null,
      subId: this.tx?.subId || null
    };

    EventBus.emit(this.tx?.id ? 'tx-save' : 'tx-add', payload);
    this.close();
  }

  _handleDelete() {
    if (!this.tx?.id) return;
    
    // Could add confirmation dialog here
    EventBus.emit('tx-delete', this.tx.id);
    this.close();
  }

  open(data = {}) {
    this.tx = data || {};
    
    // Update title
    this.$sheetTitle.textContent = data.id ? 'Edit Transaction' : 'Add Transaction';
    
    // Show host
    this.style.display = 'block';

    // Lock body scroll
    try {
      this._bodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    } catch (e) {}

    // Animate in with stagger
    requestAnimationFrame(() => {
      this.$ov.classList.add('show');
      this.$sheet.classList.add('show');
      
      // Show actions after sheet animation starts
      setTimeout(() => {
        this.$actions.classList.add('show');
      }, 100);
    });

    // Populate fields
    this.$amount.value = data.amount != null ? data.amount : '';
    this.$date.value = data.date ? data.date.slice(0, 10) : fmtDateISO();
    this.$note.value = data.note || '';
    this.$catLabel.textContent = data.catName || 'Select category';

    // Show delete only for existing transactions
    this.$delete.style.display = data.id ? 'block' : 'none';

    // Focus amount field after animation
    setTimeout(() => {
      try {
        this.$amount.focus();
        this.$amount.select();
      } catch (_) {}
    }, 350);
  }

  close() {
    // Hide with reverse animation
    this.$actions.classList.remove('show');
    this.$sheet.classList.remove('show');
    this.$ov.classList.remove('show');

    // Cleanup after animation
    setTimeout(() => {
      this.style.display = 'none';
      
      // Restore body scroll
      try {
        document.body.style.overflow = this._bodyOverflow || '';
      } catch (e) {}

      // Reset form
      this._reset();
    }, 350);
  }

  _reset() {
    this.tx = null;
    if (this.$amount) this.$amount.value = '';
    if (this.$note) this.$note.value = '';
    if (this.$date) this.$date.value = '';
    if (this.$catLabel) this.$catLabel.textContent = 'Select category';
    if (this.$sheetTitle) this.$sheetTitle.textContent = 'Add Transaction';
  }
}

customElements.define('entry-sheet', EntrySheet);