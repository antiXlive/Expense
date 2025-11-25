// components/ai-screen.js - Improved Glossy Blur Version
import { EventBus } from "../js/event-bus.js";
import { getMonthTransactions } from "../js/state.js";

class AIScreen extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this.current = new Date();
    this.tx = [];
    this.categoryData = {};
    this._touch = { x: 0, y: 0, start: 0 };
    this._isAnimating = false;

    this.render();
  }

  render() {
  this.shadowRoot.innerHTML = `
    <style>

   :host {
  display: block;
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
}

/* ==========================================
   MAIN BACKGROUND (40% black + glows)
   ========================================== */
.glossy-container {
  position: absolute;
  inset: 0;
  overflow: hidden;

  background:
    /* Aqua glow */
    radial-gradient(circle at 25% 35%, rgba(38, 208, 206, 0.55), transparent 65%),

    /* Deep blue glow */
    radial-gradient(circle at 80% 80%, rgba(26, 41, 128, 0.45), transparent 65%),

    /* Purple tint */
    radial-gradient(circle at 70% 55%, rgba(140, 60, 200, 0.45), transparent 70%),

    /* Base black */
    linear-gradient(180deg, #000 0%, #020202 40%, #050506 60%, #000 100%);
}

/* ==========================================
   SUPER STRONG TOP BLACK LAYER  
   (This is the key change)
   ========================================== */
.top-black-fade {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 220px; /* increased height */

  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.95) 0%,    /* ALMOST PURE BLACK */
    rgba(0, 0, 0, 0.92) 20%,
    rgba(0, 0, 0, 0.85) 45%,
    rgba(0, 0, 0, 0.70) 70%,
    rgba(0, 0, 0, 0.00) 100%
  );

  z-index: 5;
  pointer-events: none;
}

/* ==========================================
   VERY LIGHT GLOBAL BLUR (for shine)
   ========================================== */
.gloss-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;

  backdrop-filter: blur(6px) saturate(180%) brightness(1.18);
  -webkit-backdrop-filter: blur(6px) saturate(180%) brightness(1.18);

  opacity: 0.35;
  z-index: 2;
}

/* ==========================================
   BLOOM HIGHLIGHTS
   ========================================== */
.bloom-1 {
  position: absolute;
  width: 220px;
  height: 220px;
  top: 80px; /* moved DOWN so it doesn't bleed into top */
  left: -40px;

  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.22),
    transparent 70%
  );

  filter: blur(55px);
  opacity: 0.25;
  z-index: 1;
}

.bloom-2 {
  position: absolute;
  width: 340px;
  height: 340px;
  top: 25%; /* moved lower */
  left: 50%;
  transform: translateX(-50%);

  background: radial-gradient(
    circle,
    rgba(38, 208, 206, 0.35),
    transparent 75%
  );

  filter: blur(75px);
  opacity: 0.28;
  z-index: 1;
}

/* ==========================================
   GLOSS STREAK
   ========================================== */
.gloss-streak {
  position: absolute;
  inset: 0;
  pointer-events: none;

  background: linear-gradient(
    120deg,
    rgba(255, 255, 255, 0.07) 0%,
    rgba(255, 255, 255, 0) 25%
  );

  opacity: 0.35;
  z-index: 4;
}


    </style>

    <div class="glossy-container">
      <div class="gloss-layer"></div>

      <div class="bloom-1"></div>
      <div class="bloom-2"></div>

      <div class="gloss-streak"></div>
    </div>
  `;
}

}

customElements.define("ai-screen", AIScreen);
