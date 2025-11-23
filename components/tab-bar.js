// components/tab-bar.js
// FINAL PRODUCTION — Stable navigation with proper event sync

import { EventBus } from "../js/event-bus.js";

class TabBar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.active = "home";
    this.render();
  }

  connectedCallback() {
    this._bind();

    // Listen to "navigated" event to sync active state
    EventBus.on("navigated", ({ to }) => {
      if (to) this.setActive(to);
    });
  }

  disconnectedCallback() {
    try { 
      EventBus.off("navigated"); 
    } catch (_) {}
  }

  _bind() {
    const $ = (id) => this.shadowRoot.getElementById(id);

    // Bind tab clicks
    ["home", "ai", "budget", "settings"].forEach((id) => {
      const el = $(id);
      if (!el) return;

      el.addEventListener("click", () => this.activate(id));
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.activate(id);
        }
      });
    });

    // Bind FAB (add button)
    const fab = $("addBtn");
    fab?.addEventListener("click", () => {
      this._triggerFabTap();
      EventBus.emit("open-entry-sheet", {});
    });
  }

  _triggerFabTap() {
    const fab = this.shadowRoot.getElementById("addBtn");
    if (!fab) return;
    fab.classList.remove("tap-release");
    void fab.offsetWidth; // Force reflow
    fab.classList.add("tap-release");
  }

  activate(tab) {
    // Emit navigation event (router will handle it)
    EventBus.emit("navigate", { to: tab });
    // Optimistically set active state (will be confirmed by "navigated" event)
    this.setActive(tab);
  }

  setActive(tab) {
    this.active = tab;
    ["home", "ai", "budget", "settings"].forEach((id) => {
      const el = this.shadowRoot.getElementById(id);
      if (el) el.classList.toggle("active", id === tab);
    });
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          left: 0; right: 0; bottom: 14px;
          display: flex; justify-content: center;
          z-index: 9999;
          pointer-events: none;
        }

        .pill {
          pointer-events: auto;
          width: calc(100% - 32px);
          max-width: 760px;
          height: 66px;
          border-radius: 26px;

          background: linear-gradient(
            180deg,
            #121418f5,
            #0e1014f2,
            #0a0c10ef
          );
          backdrop-filter: blur(22px) saturate(140%);
          border: 1px solid rgba(255,255,255,0.04);

          display: flex; 
          align-items: center; 
          justify-content: center;
          padding: 0 18px;
          position: relative;
        }

        .tabs {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          justify-items: center;
          align-items: center;
        }

        .tab {
          pointer-events: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          color: rgba(255,255,255,0.40);
          font-size: 12px;
          transition: 0.18s ease;
          cursor: pointer;
        }

        .tab svg {
          width: 24px;
          height: 24px;
          stroke: currentColor;
          fill: none;
          stroke-width: 2;
          transition: 0.25s ease;
        }

        .tab.active {
          color: #fff;
          transform: translateY(-3px);
        }

        /* SETTINGS */
        #settings svg { opacity: 0.40; }
        #settings.active svg { opacity: 1; }

        /* AI GRADIENT GLOW */
        #ai svg {
          opacity: 0.40;
          stroke: currentColor;
          fill: none;
          transition: 0.25s ease;
        }

        #ai.active svg {
          opacity: 1;
          stroke: url(#aiGradient);
          filter:
            drop-shadow(0 0 10px rgba(37,99,235,0.7))
            drop-shadow(0 0 16px rgba(6,182,212,0.6))
            drop-shadow(0 4px 22px rgba(45,212,191,0.5));
          animation: aiPulse 2.5s ease-in-out infinite;
        }

        @keyframes aiPulse {
          0%, 100% {
            filter:
              drop-shadow(0 0 10px rgba(37,99,235,0.7))
              drop-shadow(0 0 16px rgba(6,182,212,0.6))
              drop-shadow(0 4px 22px rgba(45,212,191,0.5));
          }
          50% {
            filter:
              drop-shadow(0 0 14px rgba(37,99,235,0.9))
              drop-shadow(0 0 22px rgba(6,182,212,0.8))
              drop-shadow(0 6px 30px rgba(45,212,191,0.7));
          }
        }

        /* FAB (Floating Action Button) */
        .fab {
          position: absolute;
          top: -30px;
          left: 50%;
          transform: translateX(-50%);
          width: 68px;
          height: 68px;
          border-radius: 999px;

          background: linear-gradient(45deg, #2563eb, #06b6d4, #2dd4bf);

          display: flex;
          align-items: center;
          justify-content: center;

          box-shadow:
            0 18px 46px rgba(0,0,0,0.45),
            inset 0 1px 0 rgba(255,255,255,0.06);

          transition: transform 140ms cubic-bezier(.2,.6,.3,1),
                      box-shadow 180ms ease;
          cursor: pointer;
        }

        .fab:active {
          transform: translateX(-50%) translateY(2px) scale(0.96);
        }

        .fab svg {
          width: 45px; height: 45px;
          stroke: white;
          stroke-width: 2.75;
        }

        /* BUDGET */
        #budget svg { opacity: 0.40; }
        #budget.active svg { opacity: 1; }
      </style>

      <svg width="0" height="0">
        <defs>
          <linearGradient id="aiGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#2563eb"/>
            <stop offset="40%" stop-color="#06b6d4"/>
            <stop offset="100%" stop-color="#2dd4bf"/>
          </linearGradient>
        </defs>
      </svg>

      <nav class="pill">
        <div class="tabs">

          <!-- HOME -->
          <div id="home" class="tab active" tabindex="0">
            <svg viewBox="0 0 24 24">
              <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/>
              <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            </svg>
            <div class="label">Home</div>
          </div>

          <!-- AI -->
          <div id="ai" class="tab" tabindex="0">
            <svg viewBox="0 0 24 24" width="31" height="31">
              <path d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2"/>
              <path d="M13 6.5C16.1338 6.5 17.5 5.18153 17.5 2C17.5 5.18153 18.8567 6.5 22 6.5C18.8567 6.5 17.5 7.85669 17.5 11C17.5 7.85669 16.1338 6.5 13 6.5Z"/>
            </svg>
            <div class="label">AI</div>
          </div>

          <!-- FAB -->
          <div class="center">
            <div id="addBtn" class="fab" tabindex="0">
              <svg viewBox="0 0 24 24">
                <path d="M12 4v16"/>
                <path d="M4 12h16"/>
              </svg>
            </div>
          </div>

          <!-- BUDGET -->
          <div id="budget" class="tab" tabindex="0">
            <svg viewBox="0 0 24 24">
              <path d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z"/>
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
            </svg>
            <div class="label">Budget</div>
          </div>

          <!-- SETTINGS -->
          <div id="settings" class="tab" tabindex="0">
            <svg viewBox="0 0 24 24">
              <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <div class="label">Settings</div>
          </div>

        </div>
      </nav>
    `;
  }
}

customElements.define("tab-bar", TabBar);