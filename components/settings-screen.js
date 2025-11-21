// /components/settings-screen.js
import { EventBus } from "../js/event-bus.js";
import { state } from "../js/state.js";

class SettingsScreen extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();

    // restore state
    this.shadowRoot.querySelector("#autoBackupToggle").checked =
      state.settings.autoBackup === true;

    this.shadowRoot
      .querySelector("#autoBackupToggle")
      .addEventListener("change", (e) => {
        EventBus.emit("settings-update", {
          autoBackup: e.target.checked
        });
      });
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .section {
          padding: 16px;
          border-bottom: 1px solid #333;
        }
        label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
          color: #eee;
          padding: 12px 0;
        }
      </style>

      <div class="section">
        <label>
          <span>Auto Backup</span>
          <input id="autoBackupToggle" type="checkbox">
        </label>
      </div>
    `;
  }
}

customElements.define("settings-screen", SettingsScreen);
