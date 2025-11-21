// components/category-picker.js
import { EventBus } from '../js/event-bus.js';

class CategoryPicker extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode:'open'});
    this.opened = false;
    this.selectedCatId = null;
    this.render();
  }

  connectedCallback() {
    EventBus.on('open-category-picker', (payload) => { this.open(payload); });
  }

  async fetchCats() {
    // Request data from host app via event
    EventBus.emit('request-categories');
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host{ position:fixed; inset:0; z-index:70; display:block; pointer-events:none;}
        .overlay{ position:fixed; inset:0; background:rgba(2,6,23,0.6); opacity:0; transition:opacity .2s; }
        .overlay.show{ opacity:1; pointer-events:auto; }
        .picker{ position:fixed; top:0; bottom:0; right:-100%; width:92%; max-width:520px; background:linear-gradient(180deg,#0b1220,#07101b); box-shadow:0 20px 60px rgba(2,6,23,0.7); transition:right .32s cubic-bezier(.2,.9,.2,1); pointer-events:auto; display:flex; }
        .picker.show{ right:0; }
        .left{ width:40%; min-width:140px; border-right:1px solid rgba(255,255,255,0.03); overflow:auto; padding:8px; }
        .right{ flex:1; padding:8px; overflow:auto; }
        .cat{ padding:10px; border-radius:8px; display:flex; gap:8px; align-items:center; cursor:pointer; }
        .cat.sel{ background: rgba(255,255,255,0.03); }
        .sub{ padding:8px; border-radius:6px; margin-bottom:6px; cursor:pointer; }
      </style>

      <div class="overlay" id="ov"></div>
      <div class="picker" id="picker" role="dialog" aria-modal="true">
        <div class="left" id="left"></div>
        <div class="right" id="right"></div>
      </div>
    `;
    this.$ov = this.shadowRoot.getElementById('ov');
    this.$picker = this.shadowRoot.getElementById('picker');
    this.$left = this.shadowRoot.getElementById('left');
    this.$right = this.shadowRoot.getElementById('right');

    this.$ov.addEventListener('click', ()=> this.close());
    // Listen for categories data
    EventBus.on('categories-data', (data) => this.populate(data));
  }

  open(payload) {
    this.source = payload?.source || null;
    this.$picker.classList.add('show');
    this.$ov.classList.add('show');
    EventBus.emit('request-categories'); // host should reply with categories-data
  }

  close() {
    this.$picker.classList.remove('show');
    this.$ov.classList.remove('show');
  }

  populate({ cats = [], subs = [] } = {}) {
    this.$left.innerHTML = '';
    cats.forEach(cat => {
      const el = document.createElement('div');
      el.className = 'cat';
      el.innerHTML = `<div>${cat.emoji || '🗂'}</div><div><div style="font-weight:600">${cat.name}</div></div>`;
      el.addEventListener('click', ()=>{
        this.selectedCatId = cat.id;
        this.renderLeftSelection(cat.id);
        this.loadSubs(cat.id, cat);
      });
      el.addEventListener('dblclick', ()=>{
        // double tap selects category itself
        EventBus.emit('category-selected',{ catId: cat.id, catName: cat.name, emoji: cat.emoji, subId:null, subName:null, source: this.source });
        this.close();
      });
      this.$left.appendChild(el);
    });
    // auto select first
    if (cats[0]) {
      this.selectedCatId = cats[0].id;
      this.renderLeftSelection(this.selectedCatId);
      this.loadSubs(this.selectedCatId, cats[0]);
    }
    // store subs map
    this._subs = subs;
  }

  renderLeftSelection(id) {
    Array.from(this.$left.children).forEach(ch => ch.classList.remove('sel'));
    const found = Array.from(this.$left.children).find(c => c.textContent.includes(id) === false); // coarse
    // simpler: highlight by index
    const idx = Array.from(this.$left.children).findIndex((ch,i)=> ch.dataset && ch.dataset.catId===id);
    // fallback: highlight by match of innerText
    for (const ch of Array.from(this.$left.children)) {
      if (ch.textContent.includes(id) || ch.textContent.toLowerCase().includes('')) {
        // no-op; we simply remove others and add sel to clicked one is handled in click event
      }
    }
  }

  loadSubs(catId, cat) {
    this.$right.innerHTML = '';
    const localSubs = (this._subs || []).filter(s => s.catId === catId);
    if (localSubs.length === 0) {
      const el = document.createElement('div');
      el.className = 'sub';
      el.textContent = 'No subcategories — tap category to select';
      el.addEventListener('click', () => {
        EventBus.emit('category-selected',{ catId: cat.id, catName: cat.name, emoji: cat.emoji, subId:null, subName:null, source: this.source });
        this.close();
      });
      this.$right.appendChild(el);
    } else {
      localSubs.forEach(s => {
        const el = document.createElement('div');
        el.className = 'sub';
        el.textContent = s.name;
        el.addEventListener('click', () => {
          EventBus.emit('category-selected',{ catId: cat.id, catName: cat.name, emoji: cat.emoji, subId: s.id, subName: s.name, source: this.source });
          this.close();
        });
        this.$right.appendChild(el);
      });
    }
  }
}

customElements.define('category-picker', CategoryPicker);
