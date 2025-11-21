// components/settings-screen.js
import { EventBus } from '../js/event-bus.js';

class SettingsScreen extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode:'open'});
    this.render();
  }

  connectedCallback() {
    EventBus.on('request-categories', ()=> this.emitCategories());
    EventBus.on('request-data', ()=> this.emitCategories());
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; padding:16px; }
        .card{ background:rgba(255,255,255,0.02); padding:12px; border-radius:12px; margin-bottom:12px;}
        .row{ display:flex; gap:8px; align-items:center; }
      </style>
      <div class="card">
        <div style="font-weight:700">Category Manager</div>
        <div id="cats"></div>
        <div style="margin-top:8px;">
          <input id="newCatName" placeholder="New category name" />
          <input id="newCatEmoji" placeholder="Emoji" style="width:72px"/>
          <button id="addBtn">Add</button>
        </div>
      </div>

      <div class="card">
        <div style="font-weight:700">Security</div>
        <div><button id="changePin">Change PIN</button> <button id="toggleBio">Toggle Biometrics</button></div>
      </div>

      <div class="card">
        <div style="font-weight:700">Backup</div>
        <div><button id="exportBtn">Export JSON</button> <input id="importFile" type="file" accept="application/json" /></div>
      </div>
    `;

    this.$cats = this.shadowRoot.getElementById('cats');
    this.$add = this.shadowRoot.getElementById('addBtn');
    this.$newName = this.shadowRoot.getElementById('newCatName');
    this.$newEmoji = this.shadowRoot.getElementById('newCatEmoji');
    this.$export = this.shadowRoot.getElementById('exportBtn');
    this.$import = this.shadowRoot.getElementById('importFile');
    this.$changePin = this.shadowRoot.getElementById('changePin');
    this.$toggleBio = this.shadowRoot.getElementById('toggleBio');

    this.$add.addEventListener('click', ()=> {
      const name = this.$newName.value.trim();
      const emoji = this.$newEmoji.value.trim() || '🏷';
      if (!name) return alert('Name required');
      EventBus.emit('add-category', { name, emoji });
      this.$newName.value=''; this.$newEmoji.value='';
    });

    this.$export.addEventListener('click', ()=> EventBus.emit('export-db'));
    this.$import.addEventListener('change', async (e)=> {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      try { const json = JSON.parse(text); EventBus.emit('import-db', json); } catch (err){ alert('Invalid JSON'); }
      e.target.value = '';
    });

    this.$changePin.addEventListener('click', ()=> EventBus.emit('change-pin'));
    this.$toggleBio.addEventListener('click', ()=> EventBus.emit('toggle-bio'));
  }

  emitCategories() {
    // ask host to post categories
    EventBus.emit('request-categories');
    // meanwhile host should reply with 'categories-data'
  }
}

customElements.define('settings-screen', SettingsScreen);
