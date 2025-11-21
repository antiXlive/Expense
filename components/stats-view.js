// components/stats-view.js
import { EventBus } from '../js/event-bus.js';

class StatsView extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode:'open'});
    this.render();
    this.worker = null;
  }

  connectedCallback() {
    EventBus.on('db-loaded', (data) => this.requestCompute(data.tx || []));
    EventBus.on('tx-added', (tx) => this.requestComputeIncremental());
    EventBus.on('tx-deleted', (id) => this.requestComputeIncremental());
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host{ display:block; padding:16px; }
        .card{ background:rgba(255,255,255,0.02); padding:12px; border-radius:12px; margin-bottom:12px; }
      </style>
      <div class="card">
        <div style="font-weight:700">Summary</div>
        <div id="total">—</div>
      </div>
      <div class="card">
        <div style="font-weight:700">By Category</div>
        <div id="bycat"></div>
      </div>
    `;
    this.$total = this.shadowRoot.getElementById('total');
    this.$bycat = this.shadowRoot.getElementById('bycat');
  }

  ensureWorker() {
    if (this.worker) return;
    this.worker = new Worker('/js/worker-stats.js', { type: 'module' });
    this.worker.onmessage = (e) => {
      if (e.data.cmd === 'result') this.renderResult(e.data.result);
    };
  }

  requestCompute(tx) {
    this.ensureWorker();
    this.worker.postMessage({ cmd: 'compute', payload: tx });
  }

  requestComputeIncremental() {
    // ask host for current tx
    EventBus.once = (evt, cb) => { EventBus.on(evt, function onceCB(payload){ cb(payload); EventBus.off(evt, onceCB); }); };
    EventBus.emit('request-tx-for-stats');
    // fallback: main app will send db-loaded again periodically
  }

  renderResult(res) {
    this.$total.textContent = `Total: ${res.total ?? 0}`;
    this.$bycat.innerHTML = '';
    for (const [k,v] of Object.entries(res.perCat || {})) {
      const el = document.createElement('div');
      el.textContent = `${k}: ${v}`;
      this.$bycat.appendChild(el);
    }
  }
}

customElements.define('stats-view', StatsView);
