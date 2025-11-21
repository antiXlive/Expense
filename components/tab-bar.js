// components/tab-bar.js
// FINAL CLEAN REWRITE — Glassy Blur Premium (Layout A, 5 equal columns)
// - D1: Gradient Stroke Glow applied ONLY to the outer rect of the AI icon (recommended)
// - FAB floated high (top: -68px), purple gradient, thicker iOS plus
// - FAB Bounce: Elastic overshoot (Bounce C) on click
// - Icons: 24px (non-FAB icons)
// - Even spacing (grid-template-columns: repeat(5, 1fr))
// - Emits "navigate" and "open-entry-sheet" via EventBus; listens for "navigated"
// - Reference mockup image (dev): /mnt/data/ef7b18c4-56af-409e-8486-adadb5d9bc7f.png
//
// Drop this file into /components/tab-bar.js

import { EventBus } from "../js/event-bus.js";

class TabBar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.active = "home";
    this._ids = {
      aiGradient: `aiGradient-${Math.random().toString(36).slice(2, 9)}`,
    };
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
      // accessible focus ring
      el.addEventListener("focus", () => el.classList.add("focus"));
      el.addEventListener("blur", () => el.classList.remove("focus"));
    });

    const fab = this.shadowRoot.getElementById("addBtn");
    if (fab) {
      fab.addEventListener("click", (e) => {
        e.stopPropagation();
        this._triggerFabBounce();
        EventBus.emit("open-entry-sheet", {});
      });
      fab.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this._triggerFabBounce();
          EventBus.emit("open-entry-sheet", {});
        }
      });
      fab.addEventListener("focus", () => fab.classList.add("focus"));
      fab.addEventListener("blur", () => fab.classList.remove("focus"));
    }
  }

  _triggerFabBounce() {
    const fab = this.shadowRoot.getElementById("addBtn");
    if (!fab) return;
    fab.classList.remove("bounce-c");
    // restart animation
    void fab.offsetWidth;
    fab.classList.add("bounce-c");
    const onEnd = () => {
      fab.classList.remove("bounce-c");
      fab.removeEventListener("animationend", onEnd);
    };
    fab.addEventListener("animationend", onEnd);
  }

  activate(tab) {
    EventBus.emit("navigate", { to: tab });
    this.setActive(tab);
  }

  setActive(tab) {
    if (!tab) return;
    this.active = tab;
    ["home", "ai", "budget", "settings"].forEach((id) => {
      const el = this.shadowRoot.getElementById(id);
      if (!el) return;
      el.classList.toggle("active", id === tab);
    });
    if (tab === "ai") EventBus.emit("ai-activated");
  }

  render() {
    const { aiGradient } = this._ids;

    // Inline SVGs (outer shapes use stroke="currentColor" so color is governed by CSS).
    // For AI we give the outer rect a class so gradient stroke can be applied to it only.
    const homeSvg = `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 10L12 3l9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9z"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="M9 21V13h6v8"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
    `;

    const aiSvg = `
      <!-- defs included separately; rect has class "ai-outer" so CSS can target it with gradient stroke -->
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <rect class="ai-outer" x="3" y="3" width="18" height="18" rx="3"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="M9 8L10.5 11L13.5 12.5L10.5 14L9 17L7.5 14L4.5 12.5L7.5 11L9 8Z"
              fill="currentColor"/>
        <path d="M16 6L16.75 7.75L18.5 8.5L16.75 9.25L16 11L15.25 9.25L13.5 8.5L15.25 7.75L16 6Z"
              fill="currentColor"/>
      </svg>
    `;

    const budgetSvg = `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="M22 12A10 10 0 0 0 12 2v10z"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <line x1="12" y1="4" x2="12" y2="5.5"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <line x1="12" y1="8.5" x2="12" y2="10"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M13.5 5.5h-2c-.55 0-1 .45-1 1s.45 1 1 1h1c.55 0 1 .45 1 1s-.45 1-1 1h-2"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
    `;

    const settingsSvg = `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
    `;

    const plusSvg = `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 4v16" stroke="white" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M4 12h16" stroke="white" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;

    // reference image path (dev)
    const refImage = "/mnt/data/ef7b18c4-56af-409e-8486-adadb5d9bc7f.png";

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          left: 0;
          right: 0;
          bottom: env(safe-area-inset-bottom, 14px);
          display: flex;
          justify-content: center;
          z-index: 9999;
          pointer-events: none;
        }

        .pill {
          pointer-events: auto;
          width: calc(100% - 32px);
          max-width: 760px;
          height: 66px;
          border-radius: 26px;
          background: linear-gradient(180deg, rgba(18,20,24,0.55), rgba(10,12,14,0.36));
          -webkit-backdrop-filter: blur(18px) saturate(120%);
                  backdrop-filter: blur(18px) saturate(120%);
          border: 1px solid rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 18px 12px 18px;
          box-shadow: 0 18px 44px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.02);
          position: relative;
          overflow: visible;
          backgroun-color: #121418f5;
        }

        .tabs {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          align-items: center;
          justify-items: center;
          gap: 6px;
        }

        .tab {
          pointer-events: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: rgba(255,255,255,0.40);
          transition: color 200ms ease, transform 200ms cubic-bezier(.2,.9,.2,1), opacity 200ms ease;
          text-align: center;
          user-select: none;
        }

        .tab svg { width: 24px; height: 24px; display: block; }
        .tab .label { margin-top: 3px; font-size: 12px; line-height: 1; }

        .tab.active {
          color: rgba(255,255,255,1);
          transform: translateY(-2px);
          opacity: 1;
        }

        .tab:focus { outline: none; }
        .tab.focus { box-shadow: 0 6px 18px rgba(0,0,0,0.35); border-radius: 8px; }

        .center {
          position: relative;
          width: 100%;
          display:flex;
          align-items:center;
          justify-content:center;
          pointer-events: none;
        }

        /* FAB - high float (68px) */
        .fab {
          position: absolute;
          top: -68px; /* chosen high float */
          left: 50%;
          transform: translateX(-50%);
          width: 84px;
          height: 84px;
          border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, #c9aaff 0%, #9b6bff 55%, #7b3be6 100%);
          display:flex;
          align-items:center;
          justify-content:center;
          pointer-events: auto;
          cursor: pointer;
          box-shadow:
            0 36px 84px rgba(110,60,230,0.34),
            0 14px 30px rgba(0,0,0,0.45),
            inset 0 1px 0 rgba(255,255,255,0.06);
          transition: transform 260ms cubic-bezier(.2,.9,.2,1), box-shadow 220ms ease;
          overflow: visible;
        }

        /* Elastic overshoot bounce */
        @keyframes fab-bounce-c {
          0%   { transform: translateX(-50%) translateY(0) scale(1); }
          30%  { transform: translateX(-50%) translateY(-26px) scale(1.08); }
          55%  { transform: translateX(-50%) translateY(6px) scale(.96); }
          75%  { transform: translateX(-50%) translateY(-12px) scale(1.02); }
          100% { transform: translateX(-50%) translateY(0) scale(1); }
        }

        .fab.bounce-c { animation: fab-bounce-c 680ms cubic-bezier(.2,.9,.2,1); }
        .fab:active { transform: translateX(-50%) translateY(2px) scale(.98); }

        .fab .plus { width: 40px; height: 40px; display:block; }

        .glow {
          position:absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          width: 96px;
          height: 24px;
          border-radius: 999px;
          background: radial-gradient(closest-side, rgba(123,59,237,0.28), rgba(0,0,0,0));
          filter: blur(18px);
          pointer-events:none;
        }

        .home-indicator {
          position:absolute;
          bottom: -20px;
          left: 50%;
          transform: translateX(-50%);
          width: 38%;
          max-width: 220px;
          height: 6px;
          background: rgba(255,255,255,0.05);
          border-radius: 999px;
          pointer-events:none;
        }

        /* AI Gradient Stroke Glow - D1 */
        /* apply gradient stroke only to the outer rect (.ai-outer) when AI is active */
        .tab#ai.active .ai-outer {
          stroke: url(#${aiGradient});
          stroke-width: 2.2;
        }

        .tab#ai.active svg {
          filter: drop-shadow(0 6px 18px rgba(140,90,255,0.22));
          transform: translateY(-3px) scale(1.06);
          transition: transform 260ms cubic-bezier(.2,.9,.2,1), filter 260ms ease;
        }

        /* small responsive tweaks */
        @media (max-width:420px) {
          .pill { height: 62px; padding-left: 12px; padding-right: 12px; }
          .tab svg { width: 22px; height: 22px; }
          .fab { width: 68px; height: 68px; top: -56px; }
          .fab .plus { width: 32px; height: 32px; }
          .glow { width: 72px; height: 18px; top: -14px; filter: blur(12px); }
        }
      </style>

      <!-- Inline defs for gradient (placed in shadow root so url(#id) resolves) -->
      <svg width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="${aiGradient}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#c084fc"/>
            <stop offset="50%" stop-color="#a78bfa"/>
            <stop offset="100%" stop-color="#818cf8"/>
          </linearGradient>
        </defs>
      </svg>

      <nav class="pill" role="navigation" aria-label="Bottom Navigation">
        <div class="tabs" role="tablist" aria-label="Primary">

          <div id="home" class="tab active" role="tab" tabindex="0" aria-selected="true" aria-label="Home">
            ${homeSvg}
            <div class="label">Home</div>
          </div>

          <div id="ai" class="tab" role="tab" tabindex="0" aria-selected="false" aria-label="AI">
            ${aiSvg}
            <div class="label">AI</div>
          </div>

          <div class="center" aria-hidden="true">
            <div class="glow" aria-hidden="true"></div>
            <div id="addBtn" class="fab" role="button" tabindex="0" aria-label="Add">
              <div class="plus">${plusSvg}</div>
            </div>
          </div>

          <div id="budget" class="tab" role="tab" tabindex="0" aria-selected="false" aria-label="Budget">
            ${budgetSvg}
            <div class="label">Budget</div>
          </div>

          <div id="settings" class="tab" role="tab" tabindex="0" aria-selected="false" aria-label="Settings">
            ${settingsSvg}
            <div class="label">Settings</div>
          </div>

        </div>

        <div class="home-indicator" aria-hidden="true"></div>
      </nav>

      <!-- dev reference (not displayed) -->
      <meta data-ref="${refImage}">
    `;
  }
}

customElements.define("tab-bar", TabBar);
