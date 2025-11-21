// components/lock-screen.js
import { EventBus } from '../js/event-bus.js';

class LockScreen extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode:'open'});
    this.render();
  }

  connectedCallback() {
    EventBus.on('require-lock', ()=> this.show());
    EventBus.on('unlock', ()=> this.hide());
    EventBus.on('change-pin', ()=> this.openPinChange());
    this.$unlockBtn.addEventListener('click', ()=> this.tryBiometric());
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host{ position:fixed; inset:0; display:none; z-index:100; align-items:center; justify-content:center; }
        .wrap{ background: rgba(2,6,23,0.7); backdrop-filter: blur(4px); width:100%; height:100%; display:flex; align-items:center; justify-content:center; }
        .card{ background:#0b1220; padding:18px; border-radius:12px; width:90%; max-width:420px; text-align:center; }
        button{ margin-top:12px; padding:10px 12px; border-radius:8px; background:var(--accent); border:none; color:white; }
      </style>
      <div class="wrap">
        <div class="card">
          <div style="font-size:20px;font-weight:700">Locked</div>
          <div style="color:#94a3b8;margin-top:8px">Unlock with biometrics or PIN</div>
          <button id="unlockBtn">Use Biometrics</button>
        </div>
      </div>
    `;
    this.$wrap = this.shadowRoot.querySelector('.wrap');
    this.$unlockBtn = this.shadowRoot.getElementById('unlockBtn');
  }

  show() { this.style.display = 'flex'; }
  hide() { this.style.display = 'none'; }

  async tryBiometric() {
    // Minimal WebAuthn attempt - real implementation requires server challenge
    if (window.PublicKeyCredential) {
      try {
        // Try a simple get() with empty options (will likely throw) - we just attempt gracefully
        await navigator.credentials.get({ publicKey: { challenge: new Uint8Array([1,2,3]) } });
        EventBus.emit('unlock');
        this.hide();
        return;
      } catch (e) {
        // fallback to PIN screen
        EventBus.emit('require-pin');
      }
    } else {
      EventBus.emit('require-pin');
    }
  }

  openPinChange() {
    EventBus.emit('require-pin');
  }
}

customElements.define('lock-screen', LockScreen);
