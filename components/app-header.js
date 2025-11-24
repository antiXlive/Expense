// components/app-header.js
import { THEME } from "../js/theme.js";

class AppHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.isOnline = navigator.onLine;
    this.render();
  }

  connectedCallback() {
    // Listen for online/offline events
    this._onlineHandler = () => this.updateStatus(true);
    this._offlineHandler = () => this.updateStatus(false);

    window.addEventListener("online", this._onlineHandler);
    window.addEventListener("offline", this._offlineHandler);
  }

  disconnectedCallback() {
    window.removeEventListener("online", this._onlineHandler);
    window.removeEventListener("offline", this._offlineHandler);
  }

  updateStatus(online) {
    this.isOnline = online;
    const chip = this.shadowRoot.querySelector(".status-chip");
    const indicator = this.shadowRoot.querySelector(".status-indicator");
    const text = this.shadowRoot.querySelector(".status-text");

    if (online) {
      chip.classList.remove("offline");
      chip.classList.add("online");
      indicator.classList.add("pulse");
      text.textContent = "Online";
    } else {
      chip.classList.remove("online");
      chip.classList.add("offline");
      indicator.classList.remove("pulse");
      text.textContent = "Offline";
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          justify-content: center;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          pointer-events: none;
          padding: 0;
          width: 100%;
        }

        .header-pill {
          pointer-events: auto;
          width: calc(100% - 32px);
          max-width: 100%;
          padding: 8px 20px;
          border-radius: 0;
          height: 56px;
          background: linear-gradient(135deg, rgba(15, 20, 40, 0.6), rgba(19, 26, 46, 0.6));
          backdrop-filter: blur(30px) saturate(180%);
          -webkit-backdrop-filter: blur(30px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.12);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          box-shadow: 
            inset 0 1px 0 rgba(255, 255, 255, 0.15),
            0 8px 32px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
        }

        .header-pill:hover {
          box-shadow: 
            0 12px 48px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
        }

        /* LEFT SIDE - Logo + Name */
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 0;
        }

        .logo {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          backdrop-filter: blur(8px);
          overflow: hidden;
          flex-shrink: 0;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .logo-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 9px;
        }

        .app-name {
          font-size: 14px;
          font-weight: 700;
          color: #e8eeff;
          letter-spacing: -0.02em;
          white-space: nowrap;
        }

        /* RIGHT SIDE - Status Chip */
        .status-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 16px;
          font-size: 11px;
          font-weight: 700;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Online State */
        .status-chip.online {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.15));
          border: 1px solid rgba(16, 185, 129, 0.4);
          box-shadow: 
            0 0 12px rgba(16, 185, 129, 0.25),
            inset 0 0 8px rgba(16, 185, 129, 0.1);
        }

        .status-chip.online .status-text {
          color: #10b981;
        }

        /* Offline State */
        .status-chip.offline {
          background: linear-gradient(135deg, rgba(148, 163, 184, 0.15), rgba(100, 116, 139, 0.1));
          border: 1px solid rgba(148, 163, 184, 0.25);
          box-shadow: 
            0 0 8px rgba(148, 163, 184, 0.15),
            inset 0 0 6px rgba(148, 163, 184, 0.08);
        }

        .status-chip.offline .status-text {
          color: #cbd5e1;
        }

        /* Status Indicator Dot */
        .status-indicator {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          position: relative;
          flex-shrink: 0;
        }

        .status-chip.online .status-indicator {
          background: #10b981;
          box-shadow: 
            0 0 6px rgba(16, 185, 129, 0.8),
            0 0 12px rgba(16, 185, 129, 0.5);
        }

        .status-chip.offline .status-indicator {
          background: #94a3b8;
          box-shadow: 0 0 4px rgba(148, 163, 184, 0.4);
        }

        /* Pulse animation for online */
        .status-indicator.pulse::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.4);
          transform: translate(-50%, -50%);
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(2);
          }
        }

        .status-text {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.05em;
          transition: color 0.3s ease;
        }

        /* Responsive */
        @media (max-width: 480px) {
          .header-pill {
            padding: 10px 16px;
          }

          .app-name {
            font-size: 13px;
          }

          .logo {
            width: 32px;
            height: 32px;
          }

          .status-text {
            display: none;
          }

          .status-chip {
            padding: 6px 8px;
            min-width: 28px;
            justify-content: center;
          }
        }
      </style>

      <header class="header-pill">
        <div class="brand">
          <div class="logo">
            <img class="logo-img" src="./icons/icon-48.png" alt="App Logo">
          </div>
          <span class="app-name">Expense Manager</span>
        </div>

        <div class="status-chip ${this.isOnline ? 'online' : 'offline'}">
          <div class="status-indicator ${this.isOnline ? 'pulse' : ''}"></div>
          <span class="status-text">${this.isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </header>
    `;
  }
}

customElements.define("app-header", AppHeader);