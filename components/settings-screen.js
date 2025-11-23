// components/settings-screen.js
// FINAL PRODUCTION — Settings Screen with category management, backup, and security

import { EventBus } from "../js/event-bus.js";

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
    this._loadInitial();

    // Listen for category updates from other components
    EventBus.on("categories-updated", (cats) => {
      this._categories = Array.isArray(cats) ? cats : this._categories;
      this._renderCategories();
    });
  }

  disconnectedCallback() {
    try {
      EventBus.off("categories-updated");
    } catch (e) {}
    if (this._toastTimer) clearTimeout(this._toastTimer);
  }

  // --------------------------- UTILITIES ---------------------------
  _safe(fn) {
    try {
      return fn();
    } catch (e) {
      return null;
    }
  }

  async _loadInitial() {
    // Load categories from state, db, or localStorage
    let cats =
      this._safe(() => window.state?.getCategories?.()) ||
      this._safe(() => window.db?.getCategories?.()) ||
      this._safe(() => JSON.parse(localStorage.getItem("categories") || "null")) ||
      [];

    // Handle promise if returned
    if (cats && typeof cats.then === "function") {
      cats = await cats;
    }
    this._categories = Array.isArray(cats) ? cats : [];
    this._renderCategories();

    // Load backup info
    const backupFile = localStorage.getItem("backup_file_name") || "No file selected";
    const lastBackup = localStorage.getItem("backup_last_ts") || "Never";
    this.shadowRoot.getElementById("backup-file-label").textContent = backupFile;
    this.shadowRoot.getElementById("backup-last").textContent = `Last backup: ${lastBackup}`;
  }

  _showToast(msg, timeout = 2400) {
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
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  // --------------------------- CATEGORY MANAGEMENT ---------------------------
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
      row.innerHTML = `
        <div class="cat-left">
          <button class="emoji btn-ghost" title="Change emoji" data-idx="${idx}">${this._escape(c.emoji || "🏷️")}</button>
          <div class="cat-meta">
            <div class="cat-title">${this._escape(c.name || "Unnamed")}</div>
            <div class="cat-sub">${this._escape(c.sub || "")}</div>
          </div>
        </div>
        <div class="cat-actions">
          <button class="btn btn-ghost btn-edit" data-idx="${idx}" title="Edit">Edit</button>
          <button class="btn btn-danger btn-delete" data-idx="${idx}" title="Delete">Delete</button>
        </div>
      `;
      container.appendChild(row);
    });

    // Attach event handlers
    container.querySelectorAll(".btn-edit").forEach((b) =>
      b.addEventListener("click", (e) => this._onEditCategory(e.target.dataset.idx))
    );
    container.querySelectorAll(".btn-delete").forEach((b) =>
      b.addEventListener("click", (e) => this._onDeleteCategory(e.target.dataset.idx))
    );
    container.querySelectorAll(".emoji").forEach((b) =>
      b.addEventListener("click", (e) => this._onChangeEmoji(e.target.dataset.idx))
    );
  }

  _onChangeEmoji(idx) {
    const i = Number(idx);
    const cat = this._categories[i];
    if (!cat) return;
    
    const emoji = prompt("Pick an emoji (paste or type):", cat.emoji || "🏷️");
    if (emoji == null) return;
    
    this._categories[i] = { ...cat, emoji };
    this._persistCategories();
    this._renderCategories();
    this._showToast("Category updated");
    EventBus.emit("categories-updated", this._categories);
  }

  _onEditCategory(idx) {
    const i = Number(idx);
    const cat = this._categories[i] || { name: "", sub: "", emoji: "🏷️" };
    
    const name = prompt("Category name:", cat.name || "");
    if (name == null) return;
    
    const sub = prompt("Sub / description (optional):", cat.sub || "");
    if (sub == null) return;
    
    this._categories[i] = { ...(cat || {}), name, sub, emoji: cat.emoji || "🏷️" };
    this._persistCategories();
    this._renderCategories();
    this._showToast("Category saved");
    EventBus.emit("categories-updated", this._categories);
  }

  _onDeleteCategory(idx) {
    const i = Number(idx);
    const cat = this._categories[i];
    if (!cat) return;
    
    if (!confirm(`Delete category "${cat.name}"? This cannot be undone.`)) return;
    
    this._categories.splice(i, 1);
    this._persistCategories();
    this._renderCategories();
    this._showToast("Category removed");
    EventBus.emit("categories-updated", this._categories);
  }

  _persistCategories() {
    // Write to state, db, or localStorage
    if (this._safe(() => window.state?.setCategories)) {
      try {
        const r = window.state.setCategories(this._categories);
        if (r && typeof r.then === "function") r.catch(() => {});
      } catch (e) {}
    } else if (this._safe(() => window.db?.setCategories)) {
      try {
        window.db.setCategories(this._categories);
      } catch (e) {}
    } else {
      localStorage.setItem("categories", JSON.stringify(this._categories));
    }
  }

  // --------------------------- EVENT HANDLERS ---------------------------
  _bind() {
    const $ = (id) => this.shadowRoot.getElementById(id);

    // Security - Change PIN
    $("btn-change-pin")?.addEventListener("click", () => {
      EventBus.emit("change-pin-request", {});
      if (this._safe(() => window.state?.openPinChange)) {
        window.state.openPinChange();
      } else {
        this._showToast("Change PIN action requested");
      }
    });

    // Security - Biometric Toggle
    const bioRow = $("bio-row");
    const hasBiometrics = this._safe(() => window.state?.hasBiometrics) ?? false;
    
    if (hasBiometrics || this._safe(() => window.state?.isBiometricAvailable?.())) {
      bioRow?.removeAttribute("hidden");
      const btnToggleBio = $("btn-toggle-bio");
      btnToggleBio?.addEventListener("click", async () => {
        const enabled = await this._safe(() => window.state?.toggleBiometrics?.());
        this._showToast(enabled ? "Biometric enabled" : "Biometric disabled");
      });
    } else {
      bioRow?.setAttribute("hidden", "");
    }

    // Data - Export
    $("btn-export")?.addEventListener("click", async () => {
      let payload =
        (this._safe(() => window.state?.exportAll?.())) ||
        (this._safe(() => window.db?.exportAll?.())) ||
        { meta: { exportedAt: Date.now() }, categories: this._categories };

      if (payload && typeof payload.then === "function") payload = await payload;

      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expense-manager-export-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this._showToast("Export started");
    });

    // Data - Import
    const fileImport = $("file-import");
    fileImport?.addEventListener("change", async (evt) => {
      const f = evt.target.files && evt.target.files[0];
      if (!f) return;
      
      try {
        const text = await f.text();
        const data = JSON.parse(text);
        
        if (this._safe(() => window.state?.importAll)) {
          await window.state.importAll(data);
        } else if (this._safe(() => window.db?.importAll)) {
          await window.db.importAll(data);
        } else {
          // Fallback: import categories only
          if (Array.isArray(data.categories)) {
            this._categories = data.categories;
            this._persistCategories();
            this._renderCategories();
          }
        }
        
        this._showToast("Import successful");
        EventBus.emit("data-imported", data);
      } catch (err) {
        console.error(err);
        this._showToast("Import failed: invalid file");
      } finally {
        fileImport.value = "";
      }
    });

    // Data - Clear All
    $("btn-clear")?.addEventListener("click", async () => {
      if (!confirm("Delete all app data? This cannot be undone.")) return;
      
      if (this._safe(() => window.state?.clearAll)) {
        await window.state.clearAll();
      } else if (this._safe(() => window.db?.clearAll)) {
        await window.db.clearAll();
      } else {
        localStorage.clear();
      }
      
      this._categories = [];
      this._renderCategories();
      this._showToast("All data cleared");
      EventBus.emit("data-cleared", {});
    });

    // Backup - Choose Target
    $("btn-choose-backup")?.addEventListener("click", () => {
      EventBus.emit("choose-backup-target", {});
      this._showToast("Choose backup target requested");
    });

    // Backup - Backup Now
    $("btn-backup-now")?.addEventListener("click", async () => {
      const res = await this._safe(() => window.state?.backupNow?.());
      if (res === true) {
        localStorage.setItem("backup_last_ts", new Date().toLocaleString());
        $("backup-last").textContent = `Last backup: ${new Date().toLocaleString()}`;
        this._showToast("Backup completed");
      } else {
        EventBus.emit("backup-now", {});
        this._showToast("Backup requested");
      }
    });

    // Category - Add
    $("btn-add-cat")?.addEventListener("click", () => {
      const name = prompt("Category name:");
      if (!name) return;
      
      const emoji = prompt("Emoji for category (optional):", "🏷️") || "🏷️";
      const cat = { name, emoji, sub: "" };
      
      this._categories.push(cat);
      this._persistCategories();
      this._renderCategories();
      EventBus.emit("categories-updated", this._categories);
      this._showToast("Category added");
    });

    // Keyboard accessibility
    $("btn-change-pin")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        $("btn-change-pin").click();
      }
    });

    $("btn-add-cat")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        $("btn-add-cat").click();
      }
    });
  }

  // --------------------------- RENDER ---------------------------
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 18px;
          color: rgba(255, 255, 255, 0.92);
          font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
          box-sizing: border-box;
        }

        .tab-page {
          max-width: 980px;
          margin: 0 auto;
          display: grid;
          gap: 12px;
        }

        .stats-card {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01));
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 12px;
          padding: 14px;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
        }

        .st-title {
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 6px;
          color: #fff;
        }

        .st-sub {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.58);
          margin-bottom: 8px;
        }

        .settings-list {
          display: grid;
          gap: 8px;
        }

        .set-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.02);
        }

        .set-main {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .set-title {
          font-weight: 600;
          font-size: 13px;
          color: #fff;
        }

        .set-sub {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.55);
        }

        .btn {
          border-radius: 8px;
          padding: 6px 10px;
          min-width: 74px;
          cursor: pointer;
          font-weight: 600;
          background: transparent;
          border: 0;
          color: #fff;
          font-size: 13px;
        }

        .btn-ghost {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.92);
        }

        .btn-acc {
          background: linear-gradient(45deg, #2563eb, #06b6d4);
          color: #fff;
          border: none;
          box-shadow: 0 6px 18px rgba(37, 99, 235, 0.12);
        }

        .btn-danger {
          background: rgba(255, 40, 40, 0.12);
          color: #ff7b7b;
          border: 1px solid rgba(255, 40, 40, 0.06);
        }

        .hint {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 8px;
        }

        /* Category Manager */
        .cat-mgr-list {
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .cat-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px;
          border-radius: 10px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.01), rgba(255, 255, 255, 0.02));
          border: 1px solid rgba(255, 255, 255, 0.02);
        }

        .cat-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .emoji {
          font-size: 18px;
          padding: 6px;
          border-radius: 8px;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.02);
          cursor: pointer;
          color: inherit;
        }

        .cat-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .cat-title {
          font-size: 13px;
          color: #fff;
          font-weight: 600;
        }

        .cat-sub {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.55);
        }

        .cat-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .empty {
          color: rgba(255, 255, 255, 0.45);
          font-style: italic;
          padding: 8px;
        }

        /* Toast Notification */
        #toast {
          position: fixed;
          left: 50%;
          bottom: 92px;
          transform: translateX(-50%) translateY(6px);
          background: rgba(0, 0, 0, 0.7);
          color: #fff;
          padding: 8px 12px;
          border-radius: 8px;
          opacity: 0;
          transition: opacity 0.18s ease, transform 0.18s ease;
          z-index: 10000;
          font-size: 13px;
        }

        /* File Input */
        input[type="file"] {
          display: block;
          margin-top: 6px;
          color: rgba(255, 255, 255, 0.8);
        }

        /* Responsive */
        @media (max-width: 520px) {
          :host {
            padding: 12px;
          }
          .stats-card {
            padding: 12px;
          }
          .btn {
            min-width: 66px;
            padding: 6px 8px;
          }
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
                <span class="set-sub">Download as JSON</span>
              </div>
              <button class="btn btn-acc" id="btn-export">Export</button>
            </div>

            <div class="set-card">
              <div class="set-main">
                <span class="set-title">Import data</span>
                <span class="set-sub">Restore from file</span>
                <input type="file" id="file-import" accept="application/json" aria-label="Import JSON file">
              </div>
            </div>

            <div class="set-card">
              <div class="set-main">
                <span class="set-title">Clear everything</span>
                <span class="set-sub">Deletes all data</span>
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
            <span class="set-sub">
              Expense Manager Mobile Dark · v1.0<br>
              Made with ❤️ by Piyush
            </span>
          </div>
        </div>
      </section>

      <div id="toast" role="status" aria-live="polite"></div>
    `;
  }
}

customElements.define("settings-screen", SettingsScreen);