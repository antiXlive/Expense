// components/settings-screen.js
// Production-ready Settings Screen (Option B)
// - Dexie-backed categories + subcategories
// - Seeds DEFAULT_CATEGORIES on first-run
// - Editable categories (name + emoji) + CRUD for subcategories
// - Emits 'categories-updated' via EventBus

import { EventBus } from "../js/event-bus.js";
import { db } from "../js/db.js";
import { DEFAULT_CATEGORIES } from "../js/default-cats.js";

function uuid() {
  try { return crypto.randomUUID(); } catch (e) { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
}

class SettingsScreen extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._categories = [];
    this._toastTimer = null;
  }

  connectedCallback() {
    this.render();
    this._bind();
    // Load categories (seed defaults if needed)
    this._ensureCategoriesSeeded()
      .then(() => this._loadCategories())
      .catch((e) => {
        console.error("Failed to init categories", e);
        this._loadCategories(); // attempt best-effort load
      });

    EventBus.on?.("categories-updated", (cats) => {
      this._categories = Array.isArray(cats) ? cats : this._categories;
      this._renderCategories();
    });
  }

  disconnectedCallback() {
    try { EventBus.off?.("categories-updated"); } catch (e) {}
    if (this._toastTimer) clearTimeout(this._toastTimer);
  }

  // --------------- Data layer helpers ----------------
  async _ensureCategoriesSeeded() {
    // if DB available check count; otherwise check localStorage
    try {
      if (db && db.categories) {
        const cnt = await db.categories.count();
        if (cnt === 0) {
          // Seed DB with DEFAULT_CATEGORIES
          const catsToAdd = [];
          const subsToAdd = [];
          for (const c of DEFAULT_CATEGORIES) {
            const cid = c.id || uuid();
            catsToAdd.push({ id: cid, name: c.name, emoji: c.emoji || (c.name && c.name.match(/\p{Emoji}/u) ? c.name.match(/\p{Emoji}/u)[0] : "🏷️") });
            if (Array.isArray(c.subcategories)) {
              for (const s of c.subcategories) {
                const sid = (typeof s === "string") ? uuid() : (s.id || uuid());
                const sname = (typeof s === "string") ? s : (s.name || "");
                subsToAdd.push({ id: sid, catId: cid, name: sname });
              }
            }
          }
          if (catsToAdd.length) await db.categories.bulkAdd(catsToAdd);
          if (subsToAdd.length) await db.subcategories.bulkAdd(subsToAdd);
          console.log("Loading default categories...");
        }
        return;
      }
    } catch (e) {
      console.warn("DB seed failed, falling back to localStorage", e);
    }

    // Fallback: localStorage seed
    try {
      const existing = localStorage.getItem("categories");
      if (!existing) {
        localStorage.setItem("categories", JSON.stringify(DEFAULT_CATEGORIES));
        console.log("Seeded default categories to localStorage");
      }
    } catch (e) {}
  }

  async _loadCategories() {
    // Load combined structure: [{ id, name, emoji, subcategories: [{id, name}] }]
    try {
      if (db && db.categories && db.subcategories) {
        const [cats, subs] = await Promise.all([db.categories.toArray(), db.subcategories.toArray()]);
        const map = {};
        cats.forEach(c => { map[c.id] = { id: c.id, name: c.name, emoji: c.icon || c.emoji || "🏷️", subcategories: [] }; });
        subs.forEach(s => {
          if (!map[s.catId]) {
            // orphan subcategory — create parent placeholder
            map[s.catId] = { id: s.catId, name: "Unknown", emoji: "🏷️", subcategories: [] };
          }
          map[s.catId].subcategories.push({ id: s.id, name: s.name });
        });
        this._categories = Object.values(map).sort((a,b) => a.name.localeCompare(b.name));
      } else {
        // localStorage fallback
        const raw = JSON.parse(localStorage.getItem("categories") || "null") || DEFAULT_CATEGORIES;
        // normalize to full structure
        this._categories = raw.map(c => {
          return {
            id: c.id || uuid(),
            name: c.name || "",
            emoji: c.emoji || "🏷️",
            subcategories: (c.subcategories || []).map(s => (typeof s === "string" ? { id: uuid(), name: s } : { id: s.id || uuid(), name: s.name || "" }))
          };
        });
      }
    } catch (e) {
      console.error("Load categories error", e);
      this._categories = DEFAULT_CATEGORIES.map(c => ({
        id: c.id || uuid(),
        name: c.name,
        emoji: c.emoji || "🏷️",
        subcategories: (c.subcategories || []).map(s => (typeof s === "string" ? { id: uuid(), name: s } : { id: s.id || uuid(), name: s.name || "" }))
      }));
    }

    this._renderCategories();
    EventBus.emit?.("categories-updated", this._categories);
  }

  // persist categories: clear DB tables and re-add (simple robust approach)
  async _persistCategoriesToDb() {
    try {
      if (db && db.categories && db.subcategories) {
        // Clear and bulk-add (keeps ids from our in-memory list)
        await db.transaction("rw", db.categories, db.subcategories, async () => {
          await db.categories.clear();
          await db.subcategories.clear();
          const cats = [];
          const subs = [];
          for (const c of this._categories) {
            cats.push({ id: c.id, name: c.name, emoji: c.emoji || c.icon || "🏷️" });
            (c.subcategories || []).forEach(s => subs.push({ id: s.id, catId: c.id, name: s.name }));
          }
          if (cats.length) await db.categories.bulkAdd(cats);
          if (subs.length) await db.subcategories.bulkAdd(subs);
        });
        return true;
      }
    } catch (e) {
      console.warn("Persist to DB failed", e);
    }

    // fallback to localStorage
    try {
      const dump = this._categories.map(c => ({
        id: c.id, name: c.name, emoji: c.emoji, subcategories: (c.subcategories || []).map(s => ({ id: s.id, name: s.name }))
      }));
      localStorage.setItem("categories", JSON.stringify(dump));
      return true;
    } catch (e) {
      console.error("Persist categories fallback failed", e);
      return false;
    }
  }

  async _persistCategories() {
    const ok = await this._persistCategoriesToDb();
    if (ok) {
      this._showToast("Categories saved");
      EventBus.emit?.("categories-updated", this._categories);
    } else {
      this._showToast("Failed to save categories");
    }
  }

  // --------------- UI / interactions ----------------
  _showToast(msg, timeout = 1800) {
    const t = this.shadowRoot.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.style.opacity = "1";
    t.style.transform = "translateY(0)";
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      t.style.opacity = "0";
      t.style.transform = "translateY(6px)";
    }, timeout);
  }

  _escape(s = "") {
    return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  _renderCategories() {
    const container = this.shadowRoot.getElementById("cat-mgr");
    if (!container) return;
    container.innerHTML = "";

    if (!this._categories || this._categories.length === 0) {
      container.innerHTML = `<div class="empty">No categories yet. Add one to get started.</div>`;
      return;
    }

    this._categories.forEach((c, idx) => {
      const row = document.createElement("div");
      row.className = "cat-row";
      row.dataset.idx = idx;
      row.innerHTML = `
        <div class="cat-left">
          <button class="emoji" title="Change emoji" data-idx="${idx}">${this._escape(c.emoji || "🏷️")}</button>
          <div class="cat-meta">
            <div class="cat-title">${this._escape(c.name || "Unnamed")}</div>
            <div class="cat-sub">${this._escape((c.subcategories||[]).map(s=>s.name).slice(0,3).join(", "))}${(c.subcategories && c.subcategories.length>3) ? "…" : ""}</div>
          </div>
        </div>
        <div class="cat-actions">
          <button class="btn btn-ghost btn-edit" data-idx="${idx}" title="Edit">Edit</button>
          <button class="btn btn-ghost btn-sub" data-idx="${idx}" title="Manage subcategories">Subs</button>
          <button class="btn btn-danger btn-delete" data-idx="${idx}" title="Delete">Delete</button>
        </div>
        <div class="cat-subpanel" id="subpanel-${c.id}" style="display:none; margin-top:10px;"></div>
      `;
      container.appendChild(row);
    });

    // Attach handlers
    container.querySelectorAll(".emoji").forEach(b => b.addEventListener("click", (e) => this._onChangeEmoji(e.currentTarget.dataset.idx)));
    container.querySelectorAll(".btn-edit").forEach(b => b.addEventListener("click", (e) => this._onEditCategory(e.currentTarget.dataset.idx)));
    container.querySelectorAll(".btn-delete").forEach(b => b.addEventListener("click", (e) => this._onDeleteCategory(e.currentTarget.dataset.idx)));
    container.querySelectorAll(".btn-sub").forEach(b => b.addEventListener("click", (e) => this._toggleSubpanel(e.currentTarget.dataset.idx)));
  }

  _toggleSubpanel(idx) {
    const i = Number(idx);
    const cat = this._categories[i];
    if (!cat) return;
    const panel = this.shadowRoot.getElementById(`subpanel-${cat.id}`);
    if (!panel) return;
    if (panel.style.display === "none") {
      this._renderSubpanel(cat, panel);
      panel.style.display = "block";
    } else {
      panel.style.display = "none";
    }
  }

  _renderSubpanel(cat, panel) {
    panel.innerHTML = "";
    const list = document.createElement("div");
    list.className = "sub-list-panel";
    if (!cat.subcategories || cat.subcategories.length === 0) {
      list.innerHTML = `<div class="empty">No subcategories. Add one below.</div>`;
    } else {
      cat.subcategories.forEach((s, si) => {
        const item = document.createElement("div");
        item.className = "sub-row";
        item.innerHTML = `
          <div class="sub-left">
            <div class="sub-name">${this._escape(s.name)}</div>
          </div>
          <div class="sub-actions">
            <button class="btn btn-ghost btn-edit-sub" data-c="${cat.id}" data-idx="${si}">Edit</button>
            <button class="btn btn-danger btn-del-sub" data-c="${cat.id}" data-idx="${si}">Delete</button>
          </div>
        `;
        list.appendChild(item);
      });
    }

    const addWrap = document.createElement("div");
    addWrap.className = "sub-add-wrap";
    addWrap.innerHTML = `<button class="btn btn-ghost btn-add-sub" data-c="${cat.id}">＋ Add subcategory</button>`;

    panel.appendChild(list);
    panel.appendChild(addWrap);

    // Wire sub event handlers
    panel.querySelectorAll(".btn-edit-sub").forEach(b => b.addEventListener("click", (e) => {
      const catId = e.currentTarget.dataset.c;
      const idx = Number(e.currentTarget.dataset.idx);
      this._onEditSubcategory(catId, idx);
    }));

    panel.querySelectorAll(".btn-del-sub").forEach(b => b.addEventListener("click", (e) => {
      const catId = e.currentTarget.dataset.c;
      const idx = Number(e.currentTarget.dataset.idx);
      this._onDeleteSubcategory(catId, idx);
    }));

    panel.querySelectorAll(".btn-add-sub").forEach(b => b.addEventListener("click", (e) => {
      const catId = e.currentTarget.dataset.c;
      this._onAddSubcategory(catId);
    }));
  }

  // -------------- Category CRUD actions -------------
  _onChangeEmoji(idx) {
    const i = Number(idx);
    const cat = this._categories[i];
    if (!cat) return;
    const emoji = prompt("Choose emoji (paste or type):", cat.emoji || "🏷️");
    if (emoji == null) return;
    this._categories[i] = { ...cat, emoji };
    this._renderCategories();
    this._persistCategories();
    EventBus.emit?.("categories-updated", this._categories);
  }

  _onEditCategory(idx) {
    const i = Number(idx);
    const cat = this._categories[i];
    if (!cat) return;
    const name = prompt("Category name:", cat.name || "");
    if (name == null) return;
    this._categories[i] = { ...cat, name };
    this._renderCategories();
    this._persistCategories();
    EventBus.emit?.("categories-updated", this._categories);
  }

  async _onDeleteCategory(idx) {
    const i = Number(idx);
    const cat = this._categories[i];
    if (!cat) return;
    if (!confirm(`Delete "${cat.name}" and all its subcategories?`)) return;

    // remove
    this._categories.splice(i, 1);
    await this._persistCategories();
    this._renderCategories();
    EventBus.emit?.("categories-updated", this._categories);
  }

  _onAddCategory() {
    const name = prompt("Category name:");
    if (!name) return;
    const emoji = prompt("Emoji for category (optional):", "🏷️") || "🏷️";
    const c = { id: uuid(), name, emoji, subcategories: [] };
    this._categories.push(c);
    this._renderCategories();
    this._persistCategories();
    EventBus.emit?.("categories-updated", this._categories);
  }

  // -------------- Subcategory CRUD -------------
  _onAddSubcategory(catId) {
    const cat = this._categories.find(c => c.id === catId);
    if (!cat) return;
    const name = prompt(`Add subcategory under "${cat.name}":`);
    if (!name) return;
    cat.subcategories = cat.subcategories || [];
    cat.subcategories.push({ id: uuid(), name });
    this._persistCategories();
    // refresh open subpanel if visible
    const panel = this.shadowRoot.getElementById(`subpanel-${cat.id}`);
    if (panel && panel.style.display !== "none") this._renderSubpanel(cat, panel);
    this._renderCategories();
    EventBus.emit?.("categories-updated", this._categories);
  }

  _onEditSubcategory(catId, idx) {
    const cat = this._categories.find(c => c.id === catId);
    if (!cat || !cat.subcategories || !cat.subcategories[idx]) return;
    const s = cat.subcategories[idx];
    const name = prompt("Edit subcategory name:", s.name || "");
    if (name == null) return;
    s.name = name;
    this._persistCategories();
    const panel = this.shadowRoot.getElementById(`subpanel-${cat.id}`);
    if (panel && panel.style.display !== "none") this._renderSubpanel(cat, panel);
    this._renderCategories();
    EventBus.emit?.("categories-updated", this._categories);
  }

  _onDeleteSubcategory(catId, idx) {
    const cat = this._categories.find(c => c.id === catId);
    if (!cat || !cat.subcategories || !cat.subcategories[idx]) return;
    const s = cat.subcategories[idx];
    if (!confirm(`Delete subcategory "${s.name}"?`)) return;
    cat.subcategories.splice(idx, 1);
    this._persistCategories();
    const panel = this.shadowRoot.getElementById(`subpanel-${cat.id}`);
    if (panel && panel.style.display !== "none") this._renderSubpanel(cat, panel);
    this._renderCategories();
    EventBus.emit?.("categories-updated", this._categories);
  }

  // -------------- Bind buttons (export/import/clear) -----------
  _bind() {
    const $ = (id) => this.shadowRoot.getElementById(id);

    $("btn-export")?.addEventListener("click", async () => {
      try {
        // assemble payload from DB if available
        let payload = { meta: { exportedAt: Date.now() }, categories: this._categories };
        if (db && db.categories && db.subcategories) {
          payload = {
            meta: { exportedAt: Date.now() },
            categories: await db.categories.toArray(),
            subcategories: await db.subcategories.toArray()
          };
        }
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `expense-manager-cats-${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        this._showToast("Export started");
      } catch (e) {
        console.error(e);
        this._showToast("Export failed");
      }
    });

    const fileImport = $("file-import");
    fileImport?.addEventListener("change", async (evt) => {
      const f = evt.target.files && evt.target.files[0];
      if (!f) return;
      try {
        const text = await f.text();
        const data = JSON.parse(text);

        // Accept both payload shapes: {categories, subcategories} or {categories: [{name,subcategories}]}
        let newCats = [];
        if (Array.isArray(data.categories) && data.categories.length && data.categories[0].catId !== undefined) {
          // likely DB export shape
          // rebuild structure
          const catsById = {};
          (data.categories || []).forEach(c => catsById[c.id] = { id: c.id, name: c.name, emoji: c.emoji || c.icon || "🏷️", subcategories: [] });
          (data.subcategories || []).forEach(s => {
            if (!catsById[s.catId]) catsById[s.catId] = { id: s.catId, name: "Unknown", emoji: "🏷️", subcategories: [] };
            catsById[s.catId].subcategories.push({ id: s.id, name: s.name });
          });
          newCats = Object.values(catsById);
        } else {
          // shape: categories: [{name, emoji, subcategories: [string|{id,name}] }]
          newCats = (data.categories || []).map(c => ({
            id: c.id || uuid(),
            name: c.name || c.title || "Unnamed",
            emoji: c.emoji || c.icon || "🏷️",
            subcategories: (c.subcategories || []).map(s => (typeof s === "string" ? { id: uuid(), name: s } : { id: s.id || uuid(), name: s.name || "" }))
          }));
        }

        // Save
        this._categories = newCats;
        await this._persistCategories();
        this._renderCategories();
        EventBus.emit?.("data-imported", data);
        this._showToast("Import successful");
      } catch (err) {
        console.error(err);
        this._showToast("Import failed: invalid file");
      } finally {
        fileImport.value = "";
      }
    });

    $("btn-clear")?.addEventListener("click", async () => {
      if (!confirm("Delete all categories & subcategories? This cannot be undone.")) return;
      try {
        if (db && db.categories && db.subcategories) {
          await db.transaction("rw", db.categories, db.subcategories, async () => {
            await db.categories.clear();
            await db.subcategories.clear();
          });
        } else {
          localStorage.removeItem("categories");
        }
        this._categories = [];
        this._renderCategories();
        EventBus.emit?.("categories-updated", this._categories);
        this._showToast("All categories cleared");
      } catch (e) {
        console.error(e);
        this._showToast("Failed to clear");
      }
    });

    // backup controls (delegated)
    $("btn-choose-backup")?.addEventListener("click", () => {
      EventBus.emit("choose-backup-target", {});
      this._showToast("Choose backup target requested");
    });

    $("btn-backup-now")?.addEventListener("click", async () => {
      const res = await (this._safe(() => window.state?.backupNow?.()) || Promise.resolve(false));
      if (res === true) {
        localStorage.setItem("backup_last_ts", new Date().toLocaleString());
        this.shadowRoot.getElementById("backup-last").textContent = `Last backup: ${new Date().toLocaleString()}`;
        this._showToast("Backup completed");
      } else {
        EventBus.emit("backup-now", {});
        this._showToast("Backup requested");
      }
    });

    // Add category button
    this.shadowRoot.getElementById("btn-add-cat")?.addEventListener("click", () => this._onAddCategory());
  }

  _safe(fn) {
    try { return fn(); } catch (e) { return null; }
  }

  // -------------- Render ----------------
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; padding:18px; color: rgba(255,255,255,0.92); font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; box-sizing:border-box; }
        .tab-page { max-width:980px; margin:0 auto; display:grid; gap:12px; }
        .stats-card { background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); border:1px solid rgba(255,255,255,0.04); border-radius:12px; padding:14px; box-shadow: 0 6px 18px rgba(0,0,0,0.35); }
        .st-title { font-weight:600; font-size:14px; margin-bottom:6px; color:#fff; }
        .st-sub { font-size:12px; color:rgba(255,255,255,0.58); margin-bottom:8px; }
        .settings-list { display:grid; gap:8px; }
        .set-card { display:flex; align-items:center; justify-content:space-between; padding:10px; border-radius:10px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.02); }
        .set-main { display:flex; flex-direction:column; gap:4px; }
        .set-title { font-weight:600; font-size:13px; color:#fff; }
        .set-sub { font-size:12px; color:rgba(255,255,255,0.55); }
        .btn { border-radius:8px; padding:6px 10px; min-width:74px; cursor:pointer; font-weight:600; background:transparent; border:0; color:#fff; font-size:13px; }
        .btn-ghost { background: rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); color:rgba(255,255,255,0.92); }
        .btn-acc { background: linear-gradient(45deg,#2563eb,#06b6d4); color:#fff; border:none; box-shadow: 0 6px 18px rgba(37,99,235,0.12); }
        .btn-danger { background: rgba(255,40,40,0.12); color:#ff7b7b; border:1px solid rgba(255,40,40,0.06); }
        .hint { font-size:12px; color:rgba(255,255,255,0.5); margin-top:8px; }

        /* Category manager */
        .cat-mgr-list { margin-top:8px; display:flex; flex-direction:column; gap:8px; }
        .cat-row { padding:12px; border-radius:12px; background: linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.02)); border:1px solid rgba(255,255,255,0.02); }
        .cat-left { display:flex; align-items:center; gap:12px; }
        .emoji { font-size:18px; padding:8px; border-radius:8px; background:transparent; border:1px solid rgba(255,255,255,0.02); cursor:pointer; }
        .cat-meta { display:flex; flex-direction:column; gap:4px; }
        .cat-title { font-size:14px; font-weight:700; color:#fff; }
        .cat-sub { font-size:12px; color:rgba(255,255,255,0.6); }
        .cat-actions { display:flex; gap:8px; align-items:center; margin-top:8px; }

        .sub-list-panel { margin-top:8px; border-top:1px dashed rgba(255,255,255,0.03); padding-top:8px; }
        .sub-row { display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.02); }
        .sub-name { color:rgba(255,255,255,0.9); font-size:13px; }
        .sub-actions { display:flex; gap:8px; }

        .empty { color:rgba(255,255,255,0.45); font-style:italic; padding:8px; }

        /* toast */
        #toast { position:fixed; left:50%; bottom:92px; transform:translateX(-50%) translateY(6px); background:rgba(0,0,0,0.7); color:#fff; padding:8px 12px; border-radius:8px; opacity:0; transition:opacity .18s ease, transform .18s ease; z-index:10000; font-size:13px; }

        @media (max-width:520px) {
          :host { padding:12px; }
          .stats-card { padding:12px; }
          .btn { min-width:66px; padding:6px 8px; }
        }
      </style>

      <section class="tab-page" id="tab-settings">
        <!-- SECURITY -->
        <div class="stats-card">
          <div class="st-title">Security</div>
          <div class="st-sub">Lock the app with PIN or biometrics.</div>

          <div class="settings-list">
            <div class="set-card">
              <div class="set-main">
                <span class="set-title">Change PIN</span>
                <span class="set-sub">Update your 4-digit unlock code.</span>
              </div>
              <button class="btn btn-ghost" id="btn-change-pin" aria-label="Change PIN">Change</button>
            </div>

            <div class="set-card" id="bio-row" hidden>
              <div class="set-main">
                <span class="set-title">Biometric unlock</span>
                <span class="set-sub">Use Face ID or Touch ID.</span>
              </div>
              <button class="btn btn-ghost" id="btn-toggle-bio" aria-pressed="false">Enable</button>
            </div>
          </div>
        </div>

        <!-- DATA & BACKUP -->
        <div class="stats-card">
          <div class="st-title">Data & backup</div>
          <div class="st-sub">Stored only in this browser.</div>

          <div class="settings-list">
            <div class="set-card">
              <div class="set-main">
                <span class="set-title">Export data</span>
                <span class="set-sub">Download categories JSON</span>
              </div>
              <button class="btn btn-acc" id="btn-export">Export</button>
            </div>

            <div class="set-card">
              <div class="set-main">
                <span class="set-title">Import data</span>
                <span class="set-sub">Restore categories from file</span>
                <input type="file" id="file-import" accept="application/json" aria-label="Import JSON file">
              </div>
            </div>

            <div class="set-card">
              <div class="set-main">
                <span class="set-title">Clear everything</span>
                <span class="set-sub">Deletes all categories</span>
              </div>
              <button class="btn btn-danger" id="btn-clear">Reset</button>
            </div>
          </div>
        </div>

        <!-- AUTO BACKUP -->
        <div class="stats-card">
          <div class="st-title">Auto backup</div>
          <div class="st-sub">Save your data automatically.</div>

          <div class="settings-list">
            <div class="set-card">
              <div class="set-main">
                <span class="set-title">Backup file</span>
                <span class="set-sub" id="backup-file-label">No file selected</span>
                <span class="set-sub" id="backup-last">Last backup: Never</span>
              </div>
              <button class="btn btn-ghost" id="btn-choose-backup">Choose</button>
            </div>

            <div class="set-card">
              <div class="set-main">
                <span class="set-title">Backup now</span>
                <span class="set-sub">Write latest data</span>
              </div>
              <button class="btn btn-acc" id="btn-backup-now">Backup</button>
            </div>
          </div>

          <div class="hint">Requires Chrome/Edge with HTTPS or localhost.</div>
        </div>

        <!-- CATEGORY MANAGER -->
        <div class="stats-card">
          <div class="st-title">Categories</div>
          <div class="st-sub">Manage emojis & subcategories</div>

          <div class="cat-mgr-list" id="cat-mgr"></div>

          <button class="btn btn-ghost" id="btn-add-cat" style="margin-top:8px;">＋ Add category</button>
        </div>

        <!-- ABOUT -->
        <div class="stats-card">
          <div class="set-main">
            <span class="set-title">About</span>
            <span class="set-sub">Expense Manager Mobile Dark · v1.0<br>Made with ❤️ by Piyush</span>
          </div>
        </div>
      </section>

      <div id="toast" role="status" aria-live="polite"></div>
    `;
  }
}

customElements.define("settings-screen", SettingsScreen);
