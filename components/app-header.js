// components/app-header.js
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
          display: block;
          position: sticky;
          top: 0;
          z-index: 1000;
          backdrop-filter: blur(12px);
          background: rgba(2, 6, 23, 0.95);
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          height: 62px;
        }

        .header {
          max-width: 980px;
          margin: 0 auto;
          padding: 8px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          height: 100%;
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
          width: 40px;
          height: 40px;
          border-radius: 10px;
          backdrop-filter: blur(8px);
          overflow: hidden;
          flex-shrink: 0;
        }

        .logo-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 10px;
        }

        .app-name {
          font-size: 15px;
          font-weight: 700;
          color: #f8fafc;
          letter-spacing: -0.02em;
          white-space: nowrap;
        }

        /* RIGHT SIDE - Status Chip */
        .status-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }

        /* Online State */
        .status-chip.online {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.15));
          border: 1px solid rgba(16, 185, 129, 0.3);
          box-shadow: 
            0 0 15px rgba(16, 185, 129, 0.2),
            inset 0 0 10px rgba(16, 185, 129, 0.05);
        }

        .status-chip.online .status-text {
          color: #10b981;
        }

        /* Offline State */
        .status-chip.offline {
          background: linear-gradient(135deg, rgba(148, 163, 184, 0.12), rgba(100, 116, 139, 0.12));
          border: 1px solid rgba(148, 163, 184, 0.2);
          box-shadow: 
            0 0 10px rgba(148, 163, 184, 0.1),
            inset 0 0 8px rgba(148, 163, 184, 0.05);
        }

        .status-chip.offline .status-text {
          color: #94a3b8;
        }

        /* Futuristic glow effect */
        .status-chip::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.1),
            transparent
          );
          transition: left 0.5s;
        }

        .status-chip:hover::before {
          left: 100%;
        }

        /* Status Indicator Dot */
        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          position: relative;
          flex-shrink: 0;
        }

        .status-chip.online .status-indicator {
          background: #10b981;
          box-shadow: 
            0 0 8px rgba(16, 185, 129, 0.8),
            0 0 16px rgba(16, 185, 129, 0.4);
        }

        .status-chip.offline .status-indicator {
          background: #64748b;
          box-shadow: 0 0 4px rgba(100, 116, 139, 0.4);
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
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          transition: color 0.3s ease;
        }




        /* Responsive */
        @media (max-width: 480px) {
          .app-name {
            font-size: 15px;
          }

          .status-text {
            display: none;
          }

          .status-chip {
            padding: 6px 8px;
            min-width: 32px;
            justify-content: center;
          }
        }
      </style>

      <header class="header">
        <div class="brand">
          <div class="logo">
            <img class="logo-img" src="../icons/icon-48.png" alt="App Logo">
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