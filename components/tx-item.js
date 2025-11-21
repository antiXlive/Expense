// components/tx-item.js
import { EventBus } from '../js/event-bus.js';
import { fmtCurrency } from '../js/utils.js';

class TxItem extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.tx = null;
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; }
        .card { padding: 10px; border-radius:10px; display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.02); margin:6px 12px; }
        .left { display:flex; gap:12px; align-items:center; }
        .meta { font-size:12px; color: #94a3b8; }
        .actions { display:flex; gap:8px; align-items:center; }
      </style>
      <div class="card" id="root">
        <div class="left">
          <div class="emoji" id="emoji">🧾</div>
          <div>
            <div class="title" id="title">Description</div>
            <div class="meta" id="date">date</div>
          </div>
        </div>
        <div class="actions">
          <div class="amount" id="amount">$0</div>
        </div>
      </div>
    `;
    this.$root = this.shadowRoot.getElementById('root');
    this.$title = this.shadowRoot.getElementById('title');
    this.$date = this.shadowRoot.getElementById('date');
    this.$amount = this.shadowRoot.getElementById('amount');
    this.$emoji = this.shadowRoot.getElementById('emoji');

    this.$root.addEventListener('click', ()=> {
      EventBus.emit('open-entry-sheet', this.tx);
    });

    // long-press delete
    let timer = null;
    const start = (e) => {
      timer = setTimeout(()=> {
        if (confirm('Delete transaction?')) EventBus.emit('tx-delete', this.tx.id);
      }, 700);
    };
    const end = () => { if (timer) clearTimeout(timer); timer = null; };
    this.$root.addEventListener('mousedown', start);
    this.$root.addEventListener('touchstart', start);
    this.$root.addEventListener('mouseup', end);
    this.$root.addEventListener('touchend', end);
    this.$root.addEventListener('mouseleave', end);
  }

  set data(tx) {
    this.tx = tx;
    this.$title.textContent = tx.note || (tx.catName || 'Transaction');
    this.$date.textContent = tx.date ? new Date(tx.date).toLocaleDateString() : '';
    this.$amount.textContent = fmtCurrency(tx.amount);
    this.$emoji.textContent = tx.emoji || '🧾';
  }

  get data() { return this.tx; }
}

customElements.define('tx-item', TxItem);
