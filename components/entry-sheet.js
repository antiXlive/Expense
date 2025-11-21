// components/entry-sheet.js
import { EventBus } from '../js/event-bus.js';
import { fmtDateISO } from '../js/utils.js';

class EntrySheet extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.tx = null; // edit or create
    this.render();
  }

  connectedCallback() {
    EventBus.on('open-entry-sheet', (d) => this.open(d));
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { position: fixed; inset: 0; z-index: 60; display:block; pointer-events:none; }
        .overlay { position:fixed; inset:0; background: rgba(2,6,23,0.6); opacity:0; transition:opacity .24s; }
        .overlay.show { opacity:1; pointer-events:auto; }
        .sheet { position: absolute; left:50%; transform:translateX(-50%); bottom:0; width:100%; max-width:720px; border-top-left-radius:16px; border-top-right-radius:16px; background:linear-gradient(180deg,#0b1220,#07101b); padding:16px; box-shadow:0 -12px 40px rgba(2,6,23,0.7); pointer-events:auto; transform:translateY(110%); transition:transform .32s cubic-bezier(.2,.9,.2,1);}
        .sheet.show { transform:translateY(0); }
        .row { display:flex; gap:8px; align-items:center; }
        input, textarea, button { width:100%; color:inherit; background:transparent; border:none; outline:none; }
        .card { background: rgba(255,255,255,0.02); padding:10px; border-radius:10px; }
        .actions { display:flex; gap:8px; margin-top:12px; }
        .btn { padding:10px 12px; border-radius:10px; background:var(--accent); color:white; border:none; }
        .btn.ghost { background:transparent; border:1px solid rgba(255,255,255,0.06); }
      </style>

      <div class="overlay" id="ov"></div>
      <div class="sheet" id="sheet" role="dialog" aria-modal="true">
        <div class="row">
          <div style="flex:1">
            <div class="card">
              <input id="amount" type="number" step="0.01" placeholder="Amount" />
            </div>
          </div>
          <div style="width:120px">
            <div class="card">
              <input id="date" type="date" />
            </div>
          </div>
        </div>

        <div class="row" style="margin-top:8px">
          <div class="card" style="flex:1;padding:12px;display:flex;align-items:center;justify-content:space-between;cursor:pointer" id="catField">
            <span id="catLabel">Category</span>
            <span>›</span>
          </div>
        </div>

        <div style="margin-top:8px">
          <div class="card"><textarea id="note" rows="3" placeholder="Note"></textarea></div>
        </div>

        <div class="actions">
          <button class="btn ghost" id="deleteBtn">Delete</button>
          <div style="flex:1"></div>
          <button class="btn" id="saveBtn">Save</button>
        </div>
      </div>
    `;

    this.$ov = this.shadowRoot.getElementById('ov');
    this.$sheet = this.shadowRoot.getElementById('sheet');
    this.$amount = this.shadowRoot.getElementById('amount');
    this.$date = this.shadowRoot.getElementById('date');
    this.$note = this.shadowRoot.getElementById('note');
    this.$catField = this.shadowRoot.getElementById('catField');
    this.$catLabel = this.shadowRoot.getElementById('catLabel');
    this.$save = this.shadowRoot.getElementById('saveBtn');
    this.$delete = this.shadowRoot.getElementById('deleteBtn');

    this.$ov.addEventListener('click', ()=> this.close());
    this.$catField.addEventListener('click', ()=> {
      EventBus.emit('open-category-picker', { source: 'entry-sheet' });
    });
    this.$save.addEventListener('click', ()=> {
      const payload = {
        id: this.tx?.id,
        amount: Number(this.$amount.value) || 0,
        date: this.$date.value || fmtDateISO(),
        note: this.$note.value,
        catId: this.tx?.catId || null,
        subId: this.tx?.subId || null
      };
      if (this.tx && this.tx.id) EventBus.emit('tx-save', payload);
      else EventBus.emit('tx-add', payload);
      this.close();
    });

    this.$delete.addEventListener('click', ()=> {
      if (!this.tx || !this.tx.id) return;
      EventBus.emit('tx-delete', this.tx.id);
      this.close();
    });

    // Listen for category selected
    EventBus.on('category-selected', (sel) => {
      // If picker called from entry-sheet
      if (sel?.source === 'entry-sheet' || sel?.source === void 0) {
        this.tx = this.tx || {};
        this.tx.catId = sel.catId;
        this.tx.subId = sel.subId || null;
        // show label
        this.$catLabel.textContent = `${sel.emoji || ''} ${sel.catName}${sel.subName ? ' — '+sel.subName : ''}`;
      }
    });
  }

  open(data = {}) {
    this.tx = data || {};
    this.$amount.value = this.tx.amount || '';
    this.$date.value = this.tx.date ? this.tx.date.slice(0,10) : fmtDateISO();
    this.$note.value = this.tx.note || '';
    this.$catLabel.textContent = (this.tx.catName || 'Category');
    this.$sheet.classList.add('show');
    this.$ov.classList.add('show');
  }

  close() {
    this.$sheet.classList.remove('show');
    this.$ov.classList.remove('show');
    // clear after animation
    setTimeout(()=>{ this.tx = null; this.$amount.value=''; this.$note.value=''; this.$date.value=''; this.$catLabel.textContent='Category'; }, 320);
  }
}

customElements.define('entry-sheet', EntrySheet);
