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

/* MAIN BACKGROUND (glows + black) */
.glossy-container {
  position: absolute;
  inset: 0;
  overflow: hidden;

  background:
    /* subtle bloom mixture for depth */
    radial-gradient(circle at 70% 40%, rgba(140, 60, 200, 0.28), transparent 65%),
    radial-gradient(circle at 20% 25%, rgba(82, 229, 231, 0.35), transparent 55%),

    /* YOUR NEW MAIN GRADIENT */
    linear-gradient(135deg, #52E5E7 10%, #130CB7 100%),

    /* BLACK DEPTH BASE */
    linear-gradient(180deg, #000 0%, #020202 35%, #050506 60%, #000 100%);
}


/* ==========================================
   TOP GLASS OVERLAY (Perfect glossy dark top)
   ========================================== */
.top-glass {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 165px;

  background: rgba(0, 0, 0, 0.55);        /* Dark but transparent */
  border-radius: 0 0 25px 25px;           /* Rounded bottom like iOS cards */

  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);

  backdrop-filter: blur(9px) saturate(180%);
  -webkit-backdrop-filter: blur(9px) saturate(180%);

  pointer-events: none;
  z-index: 10;
}

/* LIGHT overall glass */
.gloss-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;

  backdrop-filter: blur(6px) saturate(180%) brightness(1.18);
  -webkit-backdrop-filter: blur(6px) saturate(180%) brightness(1.18);

  opacity: 0.30;
  z-index: 2;
}

/* BLOOMS */
.bloom-1 {
  position: absolute;
  width: 220px;
  height: 220px;
  top: 80px;
  left: -40px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.22), transparent 70%);
  filter: blur(55px);
  opacity: 0.25;
  z-index: 1;
}

.bloom-2 {
  position: absolute;
  width: 340px;
  height: 340px;
  top: 28%;
  left: 50%;
  transform: translateX(-50%);
  background: radial-gradient(circle, rgba(38, 208, 206, 0.35), transparent 75%);
  filter: blur(75px);
  opacity: 0.28;
  z-index: 1;
}

/* GLOSS STREAK */
.gloss-streak {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(120deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 25%);
  opacity: 0.35;
  z-index: 5;
}



    </style>

    <div class="glossy-container">
  <div class="gloss-layer"></div>

  <div class="bloom-1"></div>
  <div class="bloom-2"></div>

  <div class="gloss-streak"></div>

  <!-- PERFECT DARK GLOSS TOP OVERLAY -->
  <div class="top-glass"></div>
</div>

  `;
}

}

customElements.define("ai-screen", AIScreen);
