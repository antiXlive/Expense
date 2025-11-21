// ...existing code...
import { EventBus } from "../js/event-bus.js";

class TabBar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._handlers = new Map();
    this.active = "home";
    this.render();
  }

  // reflect attribute <tab-bar active="stats">
  static get observedAttributes() { return ["active"]; }
  attributeChangedCallback(name, oldV, newV) {
    if (name === "active" && newV !== oldV) this.setActive(newV);
  }

  connectedCallback() {
    const ids = ["home", "stats", "ai", "settings"];
    const addKeyClick = (el, cb) => {
      const clickH = e => cb(e);
      const keyH = e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          cb(e);
        }
      };
      el.addEventListener("click", clickH);
      el.addEventListener("keydown", keyH);
      this._handlers.set(el, { clickH, keyH });
    };

    ids.forEach(id => {
      const el = this.shadowRoot.getElementById(id);
      if (!el) return;
      // ensure button-like keyboard focus
      el.setAttribute("tabindex", "0");
      el.setAttribute("role", "button");
      addKeyClick(el, () => this.activate(id));
    });

    const addBtn = this.shadowRoot.getElementById("addBtn");
    if (addBtn) {
      addBtn.setAttribute("tabindex", "0");
      addBtn.setAttribute("role", "button");
      const clickH = (e) => {
        e.stopPropagation();
        EventBus.emit("open-entry-sheet", {});
      };
      const keyH = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          clickH(e);
        }
      };
      addBtn.addEventListener("click", clickH);
      addBtn.addEventListener("keydown", keyH);
      this._handlers.set(addBtn, { clickH, keyH });
    }

    // allow external navigation updates
    this._navigatedHandler = (to) => this.setActive(to);
    if (EventBus && typeof EventBus.on === "function") {
      EventBus.on("navigated", this._navigatedHandler);
    }
  }

  disconnectedCallback() {
    // remove DOM listeners
    for (const [el, { clickH, keyH }] of this._handlers.entries()) {
      try {
        el.removeEventListener("click", clickH);
        el.removeEventListener("keydown", keyH);
      } catch (e) { /* ignore */ }
    }
    this._handlers.clear();

    // remove EventBus listener if possible
    if (EventBus && typeof EventBus.off === "function" && this._navigatedHandler) {
      EventBus.off("navigated", this._navigatedHandler);
    }
    this._navigatedHandler = null;
  }

  activate(tab) {
    EventBus.emit("navigate", { to: tab });
    this.setActive(tab);
    // reflect as attribute for external styles/logic
    this.setAttribute("active", tab);
  }

  setActive(tab) {
    if (!tab) return;
    this.active = tab;
    const ids = ["home", "stats", "ai", "settings"];
    ids.forEach(id => {
      const el = this.shadowRoot.getElementById(id);
      if (!el) return;
      const svg = el.querySelector("svg");
      if (id === tab) {
        el.classList.add("active");
        el.setAttribute("aria-current", "page");
        if (svg) { svg.classList.remove("outline"); svg.classList.add("filled"); }
      } else {
        el.classList.remove("active");
        el.removeAttribute("aria-current");
        if (svg) { svg.classList.remove("filled"); svg.classList.add("outline"); }
      }
    });
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 12px;
          display: flex;
          justify-content: center;
          z-index: 9999;
          pointer-events: none;
        }

        .pill {
          pointer-events: auto;
          width: calc(100% - 28px);
          max-width: 760px;
          height: 70px;
          border-radius: 22px;
          background: rgba(18,20,24,0.96);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 18px 8px 18px;
          box-shadow: 0 14px 40px rgba(0,0,0,0.48);
          position: relative;
        }

        .tabs {
          width: 100%;
          display: grid;
          grid-template-columns: 1fr 1fr auto 1fr 1fr;
          align-items: center;
          justify-items: center;
          gap: 6px;
        }

        .tab {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
          font-size: 12px;
          color: #8b94a1;
          cursor: pointer;
          user-select: none;
          outline: none;
        }

        .tab.active {
          color: #ffffff;
        }

        .tab svg {
          width: 22px;
          height: 22px;
        }

        .tab:focus-visible {
          box-shadow: 0 0 0 3px rgba(99,102,241,0.18);
          border-radius: 8px;
        }

        /* outline vs filled helpers */
        .outline { stroke: currentColor; fill: none; stroke-width: 1.6; opacity: 0.98; }
        .filled { fill: currentColor; stroke: none; opacity: 0.98; }

        .center {
          position: relative;
          width: 88px;
          display:flex;
          align-items:center;
          justify-content:center;
          pointer-events: none;
        }

        .fab {
          position: absolute;
          top: -30px;
          left: 50%;
          transform: translateX(-50%);
          width: 68px;
          height: 68px;
          border-radius: 999px;
          background: linear-gradient(180deg,#7c3aed,#6d28d9);
          display:flex;
          align-items:center;
          justify-content:center;
          box-shadow: 0 14px 36px rgba(109,40,217,0.32), 0 6px 18px rgba(0,0,0,0.55);
          pointer-events: auto;
          cursor: pointer;
          transition: transform 140ms ease;
        }

        .fab:active { transform: translateX(-50%) translateY(2px) scale(0.99); }

        .fab svg { width: 30px; height: 30px; fill: #fff; }

        .home-ind {
          position: absolute;
          bottom: -12px;
          left: 50%;
          transform: translateX(-50%);
          width: 44%;
          max-width: 260px;
          height: 6px;
          background: rgba(255,255,255,0.06);
          border-radius: 999px;
        }

        @media (max-width:420px) {
          .pill { height: 64px; padding-left:12px; padding-right:12px; }
          .fab { width: 62px; height:62px; top: -28px; }
          .fab svg { width:26px; height:26px; }
        }
      </style>

      <nav class="pill" role="navigation" aria-label="Bottom Navigation">
        <div class="tabs">

          <!-- Home: filled when active -->
          <div id="home" class="tab active" title="Home" tabindex="0" role="button" aria-label="Home">
            <svg viewBox="0 0 24 24" class="filled" aria-hidden="true">
              <path d="M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V11.5z"></path>
            </svg>
            <div>Home</div>
          </div>

          <!-- Stats: outline -->
          <div id="stats" class="tab" title="Stats" tabindex="0" role="button" aria-label="Stats">
            <svg viewBox="0 0 24 24" class="outline" aria-hidden="true">
              <path d="M3 21h18" stroke-linecap="round"></path>
              <path d="M9 17V9" stroke-linecap="round"></path>
              <path d="M13 17v-5" stroke-linecap="round"></path>
              <path d="M17 17V5" stroke-linecap="round"></path>
            </svg>
            <div>Stats</div>
          </div>

          <!-- CENTER - placeholder slot containing FAB -->
          <div class="center" aria-hidden="true">
            <div id="addBtn" class="fab" role="button" aria-label="Add">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5v14M5 12h14" stroke="none" fill="#fff" />
              </svg>
            </div>
          </div>

          <!-- AI -->
          <div id="ai" class="tab" title="AI" tabindex="0" role="button" aria-label="AI">
            <!-- simplified solid/outline switching handled in setActive -->
            <svg viewBox="0 0 24 24" class="outline" aria-hidden="true">
              <path d="M12 5c.28 1.4 1.2 2.6 2.5 3.3C16.8 9 18 10.7 18 12.9c0 2.2-3.1 4.1-6 4.1s-6-1.9-6-4.1c0-2.2 1.2-3.9 3.5-4.6C10.8 7.6 11.7 6.4 12 5z"></path>
            </svg>
            <div>AI</div>
          </div>

          <!-- Settings: outline -->
          <div id="settings" class="tab" title="Settings" tabindex="0" role="button" aria-label="Settings">
            <svg viewBox="0 0 24 24" class="outline" aria-hidden="true">
              <path d="M12 8a4 4 0 100 8 4 4 0 000-8z"></path>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06A2 2 0 013.27 17.9l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82L3.27 5.27 5.27 3.27 7 4.5a1.65 1.65 0 001.82.33 1.65 1.65 0 001-.33H12a2 2 0 014 0h.09a1.65 1.65 0 001 .33c.7.29 1.43.52 2.08.59l1.72-1.72 2 2-1.72 1.72a1.65 1.65 0 00-.59 2.08c.07.65.3 1.38.59 2.08z"></path>
            </svg>
            <div>Settings</div>
          </div>

        </div>

        <div class="home-ind" aria-hidden="true"></div>
      </nav>
    `;
  }
}

customElements.define("tab-bar", TabBar);
// ...existing code...