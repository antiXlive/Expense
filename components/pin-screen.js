// components/pin-screen.js
import { EventBus } from '../js/event-bus.js';
import { setSetting, getSetting } from '../js/state.js';

class PinScreen extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode:'open'});
    this.render();
  }

  connectedCallback() {
    EventBus.on('require-pin', ()=> this.show());
    EventBus.on('unlock', ()=> this.hide());
    EventBus.on('change-pin', ()=> this.show(true));
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host{ position:fixed; inset:0; z-index:120; display:none; align-items:center; justify-content:center; }
        .card { background:#07101b; padding:20px; border-radius:12px; width:92%; max-width:360px;}
        input{ font-size:20px; padding:8px; width:100%; border-radius:8px; background:transparent; border:1px solid rgba(255,255,255,0.04); color:inherit; }
        button{ margin-top:10px; padding:8px 12px; border-radius:8px; background:var(--accent); border:none; color:white; width:100%; }
      </style>
      <div class="card">
        <div style="font-weight:700">Enter PIN</div>
        <input id="pin" type="password" inputmode="numeric" maxlength="6" />
        <button id="ok">OK</button>
      </div>
    `;
    this.$card = this.shadowRoot.querySelector('.card');
    this.$pin = this.shadowRoot.getElementById('pin');
    this.$ok = this.shadowRoot.getElementById('ok');

    this.$ok.addEventListener('click', async () => {
      const val = this.$pin.value.trim();
      if (!val) return alert('Enter PIN');
      const saved = await getSetting('pin') || null;
      if (!saved) {
        // first time set
        await setSetting('pin', val);
        await setSetting('pinEnabled', true);
        alert('PIN set');
        this.hide();
        EventBus.emit('unlock');
        return;
      }
      if (val === saved) {
        this.hide();
        EventBus.emit('unlock');
      } else {
        alert('Wrong PIN');
      }
    });
  }

  show(isChange=false) {
    this.style.display = 'flex';
    if (isChange) {
      // prompt for new pin logic; for simplicity, treat as set
    }
  }

  hide() { this.style.display = 'none'; this.$pin.value=''; }
}

customElements.define('pin-screen', PinScreen);
