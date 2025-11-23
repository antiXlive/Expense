// components/entry-sheet.js
// FINAL PRODUCTION — Enhanced entry form with inline category picker, better UX

import { EventBus } from '../js/event-bus.js';
import { fmtDateISO } from '../js/utils.js';

class EntrySheet extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.tx = null;
    this._bodyOverflow = null;
    this._tabBarDisplay = null;
    this._categories = [];
    this._selectedCatId = null;
    this._clickCount = 0;
    this._clickTimer = null;
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

    // Load categories
    EventBus.on('categories-updated', (cats) => {
      this._categories = Array.isArray(cats) ? cats : [];
    });

    this._loadCategories();
  }

  disconnectedCallback() {
    try {
      EventBus.off('open-entry-sheet');
      EventBus.off('navigate');
      EventBus.off('categories-updated');
    } catch (e) {}
  }

  async _loadCategories() {
    // Load from state, db, or localStorage
    let cats =
      this._safe(() => window.state?.getCategories?.()) ||
      this._safe(() => window.db?.getCategories?.()) ||
      this._safe(() => JSON.parse(localStorage.getItem("categories") || "null")) ||
      [];

    if (cats && typeof cats.then === "function") {
      cats = await cats;
    }
    this._categories = Array.isArray(cats) ? cats : [];
  }

  _safe(fn) {
    try {
      return fn();
    } catch (e) {
      return null;
    }
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

        /* Enhanced blur overlay - covers everything including tab bar */
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(16px) saturate(140%);
          -webkit-backdrop-filter: blur(16px) saturate(140%);
          opacity: 0;
          transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
          z-index: 10000;
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
          width: 100%;
          max-width: 760px;
          max-height: calc(100vh - 120px);
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          padding: 24px 20px 120px;
          background: linear-gradient(180deg, #111827, #0f1419);
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 
            0 -20px 60px rgba(0, 0, 0, 0.8),
            0 -4px 12px rgba(0, 0, 0, 0.5);
          transition: transform 0.35s cubic-bezier(0.18, 0.89, 0.32, 1);
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          box-sizing: border-box;
          z-index: 10001;
        }
        .sheet.show {
          transform: translateX(-50%) translateY(0);
        }

        .sheet-handle {
          width: 40px;
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
          margin: -12px auto 16px;
        }

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

        /* Input cards */
        .card {
          background: rgba(255, 255, 255, 0.04);
          border: 1.5px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          padding: 16px;
          margin-bottom: 14px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .card:focus-within {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(37, 99, 235, 0.4);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
        }

        /* Category card expands when picker is open */
        .card.expanded {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(37, 99, 235, 0.4);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
          margin-bottom: 24px;
        }

        .input-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

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

        #amount {
          font-size: 32px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }

        #date {
          font-size: 15px;
          color-scheme: dark;
          cursor: pointer;
        }

        /* Make entire date card clickable */
        .date-card {
          cursor: pointer;
        }

        textarea {
          resize: none;
          min-height: 80px;
          line-height: 1.5;
        }

        /* Category field */
        .cat-field {
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          font-size: 15px;
          color: #e6eef9;
          transition: all 0.2s ease;
          user-select: none;
          padding-bottom: 8px;
          margin-bottom: 8px;
          border-bottom: 1px solid transparent;
        }

        .cat-field.active {
          border-bottom-color: rgba(255, 255, 255, 0.06);
          padding-bottom: 16px;
          margin-bottom: 16px;
        }

        .cat-field:hover:not(.active) {
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
          transition: transform 0.3s ease;
        }

        .cat-field:hover .cat-arrow {
          transform: translateX(2px);
        }

        .cat-field.active .cat-arrow {
          transform: rotate(90deg);
        }

        /* Inline Category Picker - slides down within the card */
        .cat-picker {
          display: grid;
          grid-template-columns: 1fr 1fr;
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          margin: 0 -16px -16px -16px; /* Negative margin to extend to card edges */
          background: linear-gradient(180deg, rgba(26, 31, 46, 0.4), rgba(20, 24, 36, 0.6));
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 0 0 14px 14px;
        }

        .cat-picker.show {
          max-height: 320px;
          opacity: 1;
          padding-top: 8px;
        }

        .cat-list, .sub-list {
          overflow-y: auto;
          max-height: 320px;
        }

        .cat-list {
          border-right: 1px solid rgba(255, 255, 255, 0.06);
        }

        .cat-item, .sub-item {
          padding: 12px 16px;
          cursor: pointer;
          transition: all 0.15s ease;
          border-bottom: 1px solid rgba(255, 255, 255, 0.02);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .cat-item:last-child,
        .sub-item:last-child {
          border-bottom: none;
        }

        .cat-item:hover, .sub-item:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .cat-item.active {
          background: rgba(37, 99, 235, 0.15);
          border-left: 3px solid #2563eb;
          padding-left: 13px;
        }

        .cat-emoji {
          font-size: 18px;
          flex-shrink: 0;
        }

        .cat-name {
          font-size: 13px;
          font-weight: 500;
          color: #fff;
          flex: 1;
        }

        .sub-name {
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.85);
        }

        .empty-state {
          padding: 24px 16px;
          text-align: center;
          color: rgba(255, 255, 255, 0.35);
          font-size: 12px;
          font-style: italic;
        }

        /* Sticky bottom actions - no longer need to avoid tab bar */
        .actions {
          position: fixed;
          left: 50%;
          transform: translateX(-50%);
          bottom: 20px;
          width: calc(100% - 40px);
          max-width: 740px;
          display: flex;
          gap: 12px;
          padding: 16px;
          border-radius: 16px;
          box-sizing: border-box;
          opacity: 0;
          transition: opacity 0.3s ease 0.1s;
          z-index: 10002;
        }

        .actions.show {
          opacity: 1;
        }

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

        /* Responsive */
        @media (max-width: 420px) {
          .sheet {
            width: calc(100% - 20px);
            padding: 20px 16px 110px;
          }
          .actions {
            width: calc(100% - 28px);
            bottom: 16px;
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

        /* Scrollbar */
        .sheet::-webkit-scrollbar,
        .cat-list::-webkit-scrollbar,
        .sub-list::-webkit-scrollbar {
          width: 6px;
        }
        .sheet::-webkit-scrollbar-track,
        .cat-list::-webkit-scrollbar-track,
        .sub-list::-webkit-scrollbar-track {
          background: transparent;
        }
        .sheet::-webkit-scrollbar-thumb,
        .cat-list::-webkit-scrollbar-thumb,
        .sub-list::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
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

        <div class="card date-card" id="dateCard">
          <label class="input-label" for="date">Date</label>
          <input id="date" type="date" />
        </div>

        <div class="card" id="catCard">
          <div class="cat-field" id="catField" tabindex="0" role="button" aria-label="Choose category">
            <div>
              <div class="input-label">Category</div>
              <span id="catLabel">Select category</span>
            </div>
            <span class="cat-arrow">›</span>
          </div>

          <!-- Inline Category Picker -->
          <div class="cat-picker" id="catPicker">
            <div class="cat-list" id="catList"></div>
            <div class="sub-list" id="subList">
              <div class="empty-state">Select a category</div>
            </div>
          </div>
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
    this.$dateCard = this.shadowRoot.getElementById('dateCard');
    this.$note = this.shadowRoot.getElementById('note');
    this.$catCard = this.shadowRoot.getElementById('catCard');
    this.$catField = this.shadowRoot.getElementById('catField');
    this.$catLabel = this.shadowRoot.getElementById('catLabel');
    this.$catPicker = this.shadowRoot.getElementById('catPicker');
    this.$catList = this.shadowRoot.getElementById('catList');
    this.$subList = this.shadowRoot.getElementById('subList');
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

    // Date card - click anywhere to open calendar
    this.$dateCard.addEventListener('click', () => {
      this.$date.showPicker?.();
    });

    // Category field - toggle picker
    this.$catField.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggleCategoryPicker();
    });

    // Keyboard accessibility
    this.$catField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this._toggleCategoryPicker();
      }
    });

    // Save button
    this.$save.addEventListener('click', () => this._handleSave());

    // Delete button
    this.$delete.addEventListener('click', () => this._handleDelete());

    // Close picker when clicking outside
    this.$sheet.addEventListener('click', (e) => {
      if (!this.$catPicker.contains(e.target) && !this.$catField.contains(e.target)) {
        this._closeCategoryPicker();
      }
    });

    // Close on Escape
    this.shadowRoot.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.$catPicker.classList.contains('show')) {
          this._closeCategoryPicker();
        } else {
          this.close();
        }
      }
    });
  }

  _toggleCategoryPicker() {
    const isOpen = this.$catPicker.classList.contains('show');
    if (isOpen) {
      this._closeCategoryPicker();
    } else {
      this._openCategoryPicker();
    }
  }

  _openCategoryPicker() {
    this._renderCategories();
    this.$catPicker.classList.add('show');
    this.$catField.classList.add('active');
    this.$catCard.classList.add('expanded');
  }

  _closeCategoryPicker() {
    this.$catPicker.classList.remove('show');
    this.$catField.classList.remove('active');
    this.$catCard.classList.remove('expanded');
    this._selectedCatId = null;
  }

  _renderCategories() {
    this.$catList.innerHTML = '';

    if (!this._categories || this._categories.length === 0) {
      this.$catList.innerHTML = '<div class="empty-state">No categories available</div>';
      return;
    }

    this._categories.forEach(cat => {
      const item = document.createElement('div');
      item.className = 'cat-item';
      item.innerHTML = `
        <span class="cat-emoji">${cat.emoji || '🏷️'}</span>
        <span class="cat-name">${cat.name || 'Unnamed'}</span>
      `;
      
      item.addEventListener('click', () => this._onCategoryClick(cat));
      this.$catList.appendChild(item);
    });
  }

  _onCategoryClick(cat) {
    // Double-click detection
    if (this._selectedCatId === cat.id) {
      this._clickCount++;
      clearTimeout(this._clickTimer);

      if (this._clickCount === 2) {
        // Double click - select category with "Other"
        this._selectCategory(cat, null);
        this._clickCount = 0;
        return;
      }

      this._clickTimer = setTimeout(() => {
        this._clickCount = 0;
      }, 300);
    } else {
      this._clickCount = 1;
      this._selectedCatId = cat.id;

      this._clickTimer = setTimeout(() => {
        this._clickCount = 0;
      }, 300);
    }

    // Highlight selected category
    this.$catList.querySelectorAll('.cat-item').forEach(item => {
      item.classList.remove('active');
    });
    event.target.closest('.cat-item').classList.add('active');

    // Render subcategories
    this._renderSubcategories(cat);
  }

  _renderSubcategories(cat) {
    this.$subList.innerHTML = '';

    if (!cat.subcategories || cat.subcategories.length === 0) {
      this.$subList.innerHTML = '<div class="empty-state">No subcategories</div>';
      return;
    }

    cat.subcategories.forEach(sub => {
      const item = document.createElement('div');
      item.className = 'sub-item';
      item.innerHTML = `<span class="sub-name">${sub.name || 'Unnamed'}</span>`;
      
      item.addEventListener('click', () => this._selectCategory(cat, sub));
      this.$subList.appendChild(item);
    });
  }

  _selectCategory(cat, sub) {
    this.tx = this.tx || {};
    this.tx.catId = cat.id;
    this.tx.subId = sub?.id || null;

    const label = sub 
      ? `${cat.emoji || '🏷️'} ${cat.name} / ${sub.name}`
      : `${cat.emoji || '🏷️'} ${cat.name} / Other`;

    this.$catLabel.textContent = label;
    this._closeCategoryPicker();
  }

  _handleSave() {
    const amount = Number(this.$amount.value);
    
    if (!amount || amount <= 0) {
      this.$amount.focus();
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
    EventBus.emit('tx-delete', this.tx.id);
    this.close();
  }

  open(data = {}) {
    this.tx = data || {};
    
    this.$sheetTitle.textContent = data.id ? 'Edit Transaction' : 'Add Transaction';
    this.style.display = 'block';

    // Lock body scroll and hide tab bar
    try {
      this._bodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      
      // Hide tab bar
      const tabBar = document.querySelector('tab-bar');
      if (tabBar) {
        this._tabBarDisplay = tabBar.style.display;
        tabBar.style.display = 'none';
      }
    } catch (e) {}

    requestAnimationFrame(() => {
      this.$ov.classList.add('show');
      this.$sheet.classList.add('show');
      
      setTimeout(() => {
        this.$actions.classList.add('show');
      }, 100);
    });

    // Populate fields
    this.$amount.value = data.amount != null ? data.amount : '';
    this.$date.value = data.date ? data.date.slice(0, 10) : fmtDateISO();
    this.$note.value = data.note || '';
    this.$catLabel.textContent = data.catName || 'Select category';

    this.$delete.style.display = data.id ? 'block' : 'none';

    setTimeout(() => {
      try {
        this.$amount.focus();
        this.$amount.select();
      } catch (_) {}
    }, 350);
  }

  close() {
    this._closeCategoryPicker();
    this.$actions.classList.remove('show');
    this.$sheet.classList.remove('show');
    this.$ov.classList.remove('show');

    setTimeout(() => {
      this.style.display = 'none';
      
      try {
        // Restore body scroll
        document.body.style.overflow = this._bodyOverflow || '';
        
        // Restore tab bar
        const tabBar = document.querySelector('tab-bar');
        if (tabBar) {
          tabBar.style.display = this._tabBarDisplay || '';
        }
      } catch (e) {}

      this._reset();
    }, 350);
  }

  _reset() {
    this.tx = null;
    this._selectedCatId = null;
    this._clickCount = 0;
    if (this.$amount) this.$amount.value = '';
    if (this.$note) this.$note.value = '';
    if (this.$date) this.$date.value = '';
    if (this.$catLabel) this.$catLabel.textContent = 'Select category';
    if (this.$sheetTitle) this.$sheetTitle.textContent = 'Add Transaction';
  }
}

customElements.define('entry-sheet', EntrySheet);