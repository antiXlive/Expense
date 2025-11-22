// components/tab-bar.js
// FINAL PREMIUM VERSION
// - FAB height: 68px, premium gradient (blue → cyan → teal)
// - AI Glow D1: gradient stroke on outer square only
// - Simple elegant FAB tap animation
// - Dark nav bar (#121418f5 style)
// - Perfect spacing, clean code, optimized styles

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
    EventBus.on?.("navigated", (to) => this.setActive(to));
  }

  disconnectedCallback() {
    try { EventBus.off?.("navigated"); } catch (e) {}
  }

  _bind() {
    const $ = (id) => this.shadowRoot.getElementById(id);

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

    const fab = this.shadowRoot.getElementById("addBtn");
    if (fab) {
      fab.addEventListener("click", (e) => {
        e.stopPropagation();
        this._triggerFabTap();
        EventBus.emit("open-entry-sheet", {});
      });

      fab.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this._triggerFabTap();
          EventBus.emit("open-entry-sheet", {});
        }
      });
    }
  }

  _triggerFabTap() {
    const fab = this.shadowRoot.getElementById("addBtn");
    fab.classList.remove("tap-release");
    void fab.offsetWidth;
    fab.classList.add("tap-release");
  }

  activate(tab) {
    EventBus.emit("navigate", { to: tab });
    this.setActive(tab);
  }

  setActive(tab) {
    if (!tab) return;
    this.active = tab;

    ["home", "ai", "budget", "settings"].forEach((id) => {
      const item = this.shadowRoot.getElementById(id);
      item?.classList.toggle("active", id === tab);
    });
  }

  render() {
    // ICONS INLINE
    const homeSvg = `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M3 10L12 3l9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9z"
              stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9 21V13h6v8"
              stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;

    const aiSvg = `
      <svg viewBox="0 0 24 24" fill="none">
        <rect id="aiOuter" x="3" y="3" width="18" height="18" rx="3"
              stroke="currentColor" stroke-width="2"/>
        <path d="M9 8L10.5 11L13.5 12.5L10.5 14L9 17L7.5 14L4.5 12.5L7.5 11L9 8Z"
              fill="currentColor"/>
        <path d="M16 6L16.75 7.75L18.5 8.5L16.75 9.25L16 11L15.25 9.25L13.5 8.5L15.25 7.75L16 6Z"
              fill="currentColor"/>
      </svg>
    `;

    const budgetSvg = `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83"
              stroke="currentColor" stroke-width="2"/>
        <path d="M22 12A10 10 0 0 0 12 2v10z"
              stroke="currentColor" stroke-width="2"/>
        <line x1="12" y1="4" x2="12" y2="5.5" stroke="currentColor" stroke-width="2"/>
        <line x1="12" y1="8.5" x2="12" y2="10" stroke="currentColor" stroke-width="2"/>
        <path d="M13.5 5.5h-2c-.55 0-1 .45-1 1s.45 1 1 1h1c.55 0 1 .45 1 1s-.45 1-1 1h-2"
              stroke="currentColor" stroke-width="2"/>
      </svg>
    `;

    const settingsSvg = `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
              stroke="currentColor" stroke-width="2"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33A1.65 1.65 0 0 0 13 21v-.09a2 2 0 1 1-4 0V21a1.65 1.65 0 0 0-1-1.51A1.65 1.65 0 0 0 6.18 19.4l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.33-1.82A1.65 1.65 0 0 0 3 12H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1A1.65 1.65 0 0 0 4.6 5l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 3h.09A2 2 0 1 1 13 3v.09a1.65 1.65 0 0 0 1 1.51A1.65 1.65 0 0 0 15.82 5l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c0 .47.18.92.5 1.27A1.65 1.65 0 0 0 21 12a2 2 0 1 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
              stroke="currentColor" stroke-width="2"/>
      </svg>
    `;

    const plusSvg = `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 4v16" stroke="white" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M4 12h16" stroke="white" stroke-width="2.6" stroke-linecap="round"/>
      </svg>
    `;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          left: 0; right: 0; bottom: 14px;
          display: flex; justify-content: center;
          z-index: 9999;
          pointer-events: none;
        }

        /* DARK NAV BAR */
        .pill {
          pointer-events: auto;
          width: calc(100% - 32px);
          max-width: 760px;
          height: 66px;
          border-radius: 26px;

          background: linear-gradient(
            180deg,
            rgba(18, 20, 24, 0.97),
            rgba(14, 16, 20, 0.94),
            rgba(10, 12, 16, 0.92)
          );
          backdrop-filter: blur(22px) saturate(140%);
          border: 1px solid rgba(255,255,255,0.04);

          display: flex; align-items: center; justify-content: center;
          padding: 8px 18px 12px 18px;

          box-shadow:
            0 22px 46px rgba(0,0,0,0.55),
            inset 0 1px 0 rgba(255,255,255,0.03);

          position: relative;
          overflow: visible;
        }

        .tabs {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          align-items: center;
          justify-items: center;
        }

        .tab {
          pointer-events: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          color: rgba(255,255,255,0.40);
          transition: 0.18s ease;
          font-size: 12px;
        }

        .tab svg {
          width: 24px;
          height: 24px;
        }

        .tab.active {
          color: #fff;
          transform: translateY(-3px);
        }

        /* AI Glow D1 — Gradient stroke */
        .tab#ai.active svg #aiOuter {
          stroke: url(#aiGradient);
          stroke-width: 2.4;
          filter: drop-shadow(0 4px 12px rgba(140,90,255,0.28));
        }

        /* FAB */
        .fab {
          position: absolute;
          top: -30px;
          left: 50%;
          transform: translateX(-50%);
          width: 70px;
          height: 70px;
          border-radius: 999px;
          cursor: pointer;

          background:
            linear-gradient(
              45deg,
              #2563eb 0%,
              #06b6d4 40%,
              #2dd4bf 100%
            );

          display: flex;
          align-items: center;
          justify-content: center;

          box-shadow:
            0 18px 46px rgba(0,0,0,0.45),
            inset 0 1px 0 rgba(255,255,255,0.06);

          transition: transform 140ms cubic-bezier(.2,.6,.3,1),
                      box-shadow 180ms ease;
        }

        .fab:active {
          transform: translateX(-50%) translateY(2px) scale(0.96);
          box-shadow:
            0 8px 22px rgba(0,0,0,0.25),
            inset 0 1px 0 rgba(255,255,255,0.05);
        }

        .fab.tap-release {
          animation: fabTap 180ms cubic-bezier(.2,.6,.3,1);
        }

        @keyframes fabTap {
          0% { transform: translateX(-50%) translateY(2px) scale(0.96); }
          100% { transform: translateX(-50%) translateY(0) scale(1); }
        }

        .fab .plus {
          width: 34px;
          height: 34px;
          display: block;
        }
      </style>

      <!-- Gradient for AI Stroke -->
      <svg width="0" height="0">
        <defs>
          <linearGradient id="aiGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#c084fc"/>
            <stop offset="50%" stop-color="#a78bfa"/>
            <stop offset="100%" stop-color="#818cf8"/>
          </linearGradient>
        </defs>
      </svg>

      <nav class="pill">
        <div class="tabs">
          <div id="home" class="tab active">${homeSvg}<div class="label">Home</div></div>

          <div id="ai" class="tab">${aiSvg}<div class="label">AI</div></div>

          <div class="center">
            <div id="addBtn" class="fab"><div class="plus">${plusSvg}</div></div>
          </div>

          <div id="budget" class="tab">${budgetSvg}<div class="label">Budget</div></div>

          <div id="settings" class="tab">${settingsSvg}<div class="label">Settings</div></div>
        </div>
      </nav>
    `;
  }
}

customElements.define("tab-bar", TabBar);
