// components/tx-list.js
import { EventBus } from '../js/event-bus.js';

class TxList extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode:'open' });
    this.render();
    this.showFAB = true;
  }

  connectedCallback() {
    EventBus.on('db-loaded', (data) => this.renderList(data.tx || []));
    EventBus.on('tx-added', (tx) => this.prependTx(tx));
    EventBus.on('tx-updated', (tx) => this.updateTx(tx));
    EventBus.on('tx-deleted', (id) => this.removeTx(id));
    EventBus.on('navigated', (to) => EventBus.emit('show-fab', to === 'home'));
    EventBus.on('show-fab', (v) => this.toggleFAB(v));
    // request initial data
    setTimeout(()=> EventBus.emit('request-data'), 50);
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; height:100%; padding-top:12px; }
        .list { padding-bottom:80px; }
        .section-title { padding:0 16px; color: #94a3b8; font-size:12px; margin-bottom:8px; }
      </style>
      <div class="list" id="list"></div>
      <button class="app-fab" id="fab">+</button>
    `;
    this.$list = this.shadowRoot.getElementById('list');
    this.$fab = this.shadowRoot.getElementById('fab');
    this.$fab.addEventListener('click', ()=>{
      EventBus.emit('open-entry-sheet', {});
    });
  }

  renderList(tx) {
    this.$list.innerHTML = '';
    if (!tx || tx.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'section-title';
      empty.textContent = 'No transactions yet — tap + to add';
      this.$list.appendChild(empty);
      return;
    }
    // group simple: show all
    tx.forEach(t => {
      const el = document.createElement('tx-item');
      el.data = t;
      this.$list.appendChild(el);
    });
  }

  prependTx(tx) {
    const el = document.createElement('tx-item');
    el.data = tx;
    this.$list.insertBefore(el, this.$list.firstChild);
  }

  updateTx(tx) {
    const items = Array.from(this.$list.querySelectorAll('tx-item'));
    const found = items.find(it => it.data && it.data.id === tx.id);
    if (found) { found.data = tx; }
  }

  removeTx(id) {
    const items = Array.from(this.$list.querySelectorAll('tx-item'));
    const found = items.find(it => it.data && it.data.id === id);
    if (found) found.remove();
  }

  toggleFAB(v) {
    this.$fab.style.display = v ? 'grid' : 'none';
  }
}

customElements.define('tx-list', TxList);
