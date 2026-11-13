/*
 * Samsung TV (Tizen) – remote control card for Home Assistant.
 *
 *   type: custom:samsung-remote-card
 *   entity: media_player.my_tv          # required
 *   remote: remote.my_tv_remote         # optional, found from the same device
 *   apps: [Netflix, YouTube, RaiPlay]   # optional shortcuts (names from the TV)
 *   sources: ["TV", "HDMI 1", "HDMI 2"] # optional
 */

const CARD_VERSION = "0.3.0";

const SOURCE_NAMES = ["TV", "HDMI", "HDMI 1", "HDMI 2", "HDMI 3", "HDMI 4"];
const DEFAULT_SOURCES = ["TV", "HDMI 1", "HDMI 2", "HDMI 3"];
const DEFAULT_APPS = [
  "Netflix", "YouTube", "Prime Video", "Disney+",
  "RaiPlay", "Mediaset Infinity", "DAZN", "NOW",
];
const APP_COLORS = {
  "Netflix": ["#e50914", "#fff"],
  "YouTube": ["#ff0033", "#fff"],
  "Prime Video": ["#1a98ff", "#fff"],
  "Disney+": ["#0e3d8c", "#fff"],
  "RaiPlay": ["#0b5fbd", "#fff"],
  "Mediaset Infinity": ["#2b2f8f", "#fff"],
  "DAZN": ["#f8ff13", "#0c161c"],
  "NOW": ["#00818a", "#fff"],
  "HBO Max": ["#5b2bd8", "#fff"],
  "Apple TV": ["#111", "#fff"],
  "Spotify - Musica e podcast": ["#1db954", "#0c0c0c"],
  "Spotify": ["#1db954", "#0c0c0c"],
};

const REPEAT_DELAY = 450;
const REPEAT_EVERY = 220;

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

class SamsungRemoteCard extends HTMLElement {
  static getStubConfig(hass) {
    const ents = hass.entities || {};
    const tv = Object.keys(hass.states).find(
      (id) => id.startsWith("media_player.") && ents[id]?.platform === "samsung_tizen",
    );
    return { entity: tv || "media_player.tv" };
  }

  setConfig(config) {
    if (!config || !String(config.entity || "").startsWith("media_player.")) {
      throw new Error("Imposta 'entity' con il media_player del TV");
    }
    this._config = config;
    this._built = false;
    if (this._hass) this._build();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._built) this._build();
    this._update();
  }

  getCardSize() {
    return 14;
  }

  getGridOptions() {
    return { columns: "full", rows: "auto" };
  }

  // ---------------------------------------------------------------- helpers

  get _remoteId() {
    if (this._config.remote) return this._config.remote;
    const ents = this._hass.entities || {};
    const device = ents[this._config.entity]?.device_id;
    const found = device && Object.values(ents).find(
      (e) => e.device_id === device && e.entity_id.startsWith("remote."),
    );
    return found ? found.entity_id : `${this._config.entity.replace("media_player.", "remote.")}_remote`;
  }

  get _stateObj() {
    return this._hass.states[this._config.entity];
  }

  _apps() {
    const list = this._stateObj?.attributes?.source_list || [];
    return list.filter((s) => !SOURCE_NAMES.includes(s));
  }

  _call(domain, service, data) {
    this.dispatchEvent(new CustomEvent("haptic", { detail: "light", bubbles: true, composed: true }));
    return this._hass.callService(domain, service, data).catch((err) => {
      this.dispatchEvent(new CustomEvent("hass-notification", {
        detail: { message: err?.message || String(err) }, bubbles: true, composed: true,
      }));
    });
  }

  _sendKey(key) {
    return this._call("remote", "send_command", { entity_id: this._remoteId, command: key });
  }

  _selectSource(source) {
    return this._call("media_player", "select_source", { entity_id: this._config.entity, source });
  }

  _power() {
    const on = this._stateObj?.state === "on";
    return this._call("media_player", on ? "turn_off" : "turn_on", { entity_id: this._config.entity });
  }

  // ----------------------------------------------------------------- render

  _btn(key, icon, { cls = "", label = "", repeat = false, title = "" } = {}) {
    const inner = icon ? `<ha-icon icon="${icon}"></ha-icon>` : `<span>${esc(label)}</span>`;
    return `<button class="btn ${cls}" data-key="${key}" ${repeat ? "data-repeat" : ""}
      title="${esc(title || label || key)}" aria-label="${esc(title || label || key)}">${inner}</button>`;
  }

  _build() {
    if (!this._config) return;
    this._built = true;
    const root = this.shadowRoot || this.attachShadow({ mode: "open" });
    const sources = this._config.sources || DEFAULT_SOURCES;
    const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

    root.innerHTML = `
      <style>${STYLE}</style>
      <ha-card>
        <div class="remote" part="remote">
          <div class="top">
            <button class="btn power" data-action="power" title="Accendi/Spegni" aria-label="Accendi/Spegni">
              <ha-icon icon="mdi:power"></ha-icon>
            </button>
            <div class="status"><span class="led"></span><span class="name"></span></div>
            ${this._btn("KEY_SOURCE", "mdi:import", { title: "Sorgente" })}
          </div>

          <div class="controls">
            <div class="sources">
              ${sources.map((s) => `<button class="chip src" data-source="${esc(s)}">${esc(s)}</button>`).join("")}
              <button class="chip src" data-action="numpad" title="Tastierino numerico">123</button>
            </div>

            <div class="numpad" hidden>
              ${digits.map((d) => this._btn(`KEY_${d}`, "", { label: d, cls: "num" })).join("")}
              ${this._btn("KEY_CH_LIST", "mdi:format-list-bulleted", { cls: "num", title: "Lista canali" })}
              ${this._btn("KEY_0", "", { label: "0", cls: "num" })}
              ${this._btn("KEY_PRECH", "mdi:history", { cls: "num", title: "Canale precedente" })}
            </div>

            <div class="dpad">
              ${this._btn("KEY_UP", "mdi:chevron-up", { cls: "arrow up", repeat: true, title: "Su" })}
              ${this._btn("KEY_LEFT", "mdi:chevron-left", { cls: "arrow left", repeat: true, title: "Sinistra" })}
              ${this._btn("KEY_ENTER", "", { cls: "ok", label: "OK" })}
              ${this._btn("KEY_RIGHT", "mdi:chevron-right", { cls: "arrow right", repeat: true, title: "Destra" })}
              ${this._btn("KEY_DOWN", "mdi:chevron-down", { cls: "arrow down", repeat: true, title: "Giù" })}
            </div>

            <div class="row three">
              ${this._btn("KEY_RETURN", "mdi:arrow-u-left-top", { title: "Indietro" })}
              ${this._btn("KEY_HOME", "mdi:home-variant", { cls: "home", title: "Home" })}
              ${this._btn("KEY_EXIT", "mdi:close", { title: "Esci" })}
            </div>

            <div class="rockers">
              <div class="rocker">
                ${this._btn("KEY_VOLUP", "mdi:plus", { repeat: true, title: "Volume +" })}
                <span class="label">VOL</span>
                ${this._btn("KEY_VOLDOWN", "mdi:minus", { repeat: true, title: "Volume −" })}
              </div>
              <div class="mid">
                ${this._btn("KEY_MUTE", "mdi:volume-off", { cls: "small", title: "Muto" })}
                ${this._btn("KEY_INFO", "mdi:information-variant", { cls: "small", title: "Info" })}
                ${this._btn("KEY_GUIDE", "mdi:television-guide", { cls: "small", title: "Guida TV" })}
              </div>
              <div class="rocker">
                ${this._btn("KEY_CHUP", "mdi:chevron-up", { repeat: true, title: "Canale +" })}
                <span class="label">CH</span>
                ${this._btn("KEY_CHDOWN", "mdi:chevron-down", { repeat: true, title: "Canale −" })}
              </div>
            </div>

            <div class="row four">
              ${this._btn("KEY_REWIND", "mdi:rewind", { cls: "small", title: "Indietro veloce" })}
              ${this._btn("KEY_PLAY", "mdi:play", { cls: "small", title: "Play" })}
              ${this._btn("KEY_PAUSE", "mdi:pause", { cls: "small", title: "Pausa" })}
              ${this._btn("KEY_FF", "mdi:fast-forward", { cls: "small", title: "Avanti veloce" })}
            </div>

            <div class="colors">
              <button class="color" style="--c:#e53935" data-key="KEY_RED" aria-label="Rosso"></button>
              <button class="color" style="--c:#43a047" data-key="KEY_GREEN" aria-label="Verde"></button>
              <button class="color" style="--c:#fdd835" data-key="KEY_YELLOW" aria-label="Giallo"></button>
              <button class="color" style="--c:#1e88e5" data-key="KEY_BLUE" aria-label="Blu"></button>
            </div>

            <div class="apps"></div>
            <div class="all-apps" hidden></div>
          </div>
        </div>
      </ha-card>`;

    this._appsKey = null;
    this._bindEvents(root);
  }

  _renderApps(root) {
    const all = this._apps();
    const key = all.join("|");
    if (key === this._appsKey) return;
    this._appsKey = key;

    const wanted = this._config.apps || DEFAULT_APPS;
    const favs = wanted.filter((a) => all.includes(a));
    const chip = (name) => {
      const [bg, fg] = APP_COLORS[name] || ["#3a3d44", "#fff"];
      const label = name.replace(" - Musica e podcast", "");
      return `<button class="chip app" style="--bg:${bg};--fg:${fg}" data-app="${esc(name)}">${esc(label)}</button>`;
    };
    const others = all.filter((a) => !favs.includes(a));
    root.querySelector(".apps").innerHTML =
      favs.map(chip).join("") +
      (others.length ? `<button class="chip more" data-action="all-apps">Tutte le app</button>` : "");
    root.querySelector(".all-apps").innerHTML = others.map(chip).join("");
  }

  _update() {
    const root = this.shadowRoot;
    if (!root || !this._hass) return;
    const st = this._stateObj;
    const on = st?.state === "on";
    const remote = root.querySelector(".remote");
    remote.classList.toggle("off", !on);
    remote.classList.toggle("missing", !st);
    root.querySelector(".name").textContent = !st
      ? `${this._config.entity} non trovato`
      : `${this._config.name || st.attributes.friendly_name || "TV"} · ${on ? "acceso" : "spento"}`;
    this._renderApps(root);
  }

  // ----------------------------------------------------------------- events

  _bindEvents(root) {
    let timer = null;
    let repeatTimer = null;
    const stop = () => {
      clearTimeout(timer);
      clearInterval(repeatTimer);
      timer = repeatTimer = null;
      root.querySelectorAll(".pressed").forEach((b) => b.classList.remove("pressed"));
    };

    root.addEventListener("pointerdown", (ev) => {
      const btn = ev.target.closest("[data-repeat]");
      if (!btn) return;
      ev.preventDefault();
      stop();
      btn.setPointerCapture?.(ev.pointerId);
      btn.classList.add("pressed");
      const key = btn.dataset.key;
      this._sendKey(key);
      timer = setTimeout(() => {
        repeatTimer = setInterval(() => this._sendKey(key), REPEAT_EVERY);
      }, REPEAT_DELAY);
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((t) =>
      root.addEventListener(t, stop, true),
    );
    root.addEventListener("contextmenu", (ev) => ev.preventDefault());

    root.addEventListener("click", (ev) => {
      const el = ev.target.closest("button");
      if (!el || el.hasAttribute("data-repeat")) return;
      const d = el.dataset;
      if (d.action === "power") this._power();
      else if (d.action === "numpad") {
        const pad = root.querySelector(".numpad");
        pad.hidden = !pad.hidden;
        el.classList.toggle("active", !pad.hidden);
      } else if (d.action === "all-apps") {
        const box = root.querySelector(".all-apps");
        box.hidden = !box.hidden;
        el.textContent = box.hidden ? "Tutte le app" : "Meno app";
      } else if (d.source) this._selectSource(d.source);
      else if (d.app) this._selectSource(d.app);
      else if (d.key) this._sendKey(d.key);
    });

    // Keyboard support when the card has focus (desktop).
    this.tabIndex = 0;
    const KEYMAP = {
      ArrowUp: "KEY_UP", ArrowDown: "KEY_DOWN", ArrowLeft: "KEY_LEFT", ArrowRight: "KEY_RIGHT",
      Enter: "KEY_ENTER", Backspace: "KEY_RETURN", Escape: "KEY_EXIT", h: "KEY_HOME",
      "+": "KEY_VOLUP", "-": "KEY_VOLDOWN", m: "KEY_MUTE", PageUp: "KEY_CHUP", PageDown: "KEY_CHDOWN",
    };
    this.addEventListener("keydown", (ev) => {
      const key = KEYMAP[ev.key] || (/^[0-9]$/.test(ev.key) ? `KEY_${ev.key}` : null);
      if (!key || this._stateObj?.state !== "on") return;
      ev.preventDefault();
      this._sendKey(key);
    });
  }
}

const STYLE = `
  :host { display: block; outline: none; }
  ha-card {
    background: none; border: none; box-shadow: none;
    display: flex; justify-content: center; padding: 8px 0 16px;
  }
  .remote {
    --body: #232428; --key: #34363c; --key-hi: #464950; --text: #ececef;
    width: 100%; max-width: 300px; box-sizing: border-box;
    padding: 22px 22px 26px; border-radius: 48px;
    background: linear-gradient(180deg, #2c2e33 0%, var(--body) 40%, #1a1b1e 100%);
    box-shadow: 0 18px 40px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.08), inset 0 -2px 0 rgba(0,0,0,.4);
    color: var(--text); font-family: var(--ha-font-family-body, Roboto, system-ui, sans-serif);
    user-select: none; -webkit-user-select: none; touch-action: manipulation;
  }
  button { font: inherit; color: inherit; -webkit-tap-highlight-color: transparent; }
  .btn {
    width: 52px; height: 52px; border: none; border-radius: 50%; padding: 0;
    display: grid; place-items: center; cursor: pointer;
    background: var(--key);
    box-shadow: 0 3px 0 rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.07);
    transition: transform .06s ease, background-color .15s ease, box-shadow .06s ease;
  }
  .btn:hover { background: var(--key-hi); }
  .btn:active, .btn.pressed { transform: translateY(2px); box-shadow: 0 1px 0 rgba(0,0,0,.45); background: var(--key-hi); }
  .btn:focus-visible, .chip:focus-visible, .color:focus-visible { outline: 2px solid #8ab4f8; outline-offset: 2px; }
  ha-icon { --mdc-icon-size: 24px; pointer-events: none; }
  .small { width: 44px; height: 44px; }
  .small ha-icon { --mdc-icon-size: 20px; }

  .top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .power { background: #c62828; }
  .power:hover, .power:active { background: #e53935; }
  .status { flex: 1; min-width: 0; display: flex; align-items: center; justify-content: center; gap: 6px;
    font-size: 12px; opacity: .85; white-space: nowrap; overflow: hidden; }
  .status .name { overflow: hidden; text-overflow: ellipsis; }
  .led { flex: none; width: 7px; height: 7px; border-radius: 50%; background: #4caf50; box-shadow: 0 0 8px #4caf50; }
  .off .led { background: #6b6e75; box-shadow: none; }
  .missing .led { background: #ff9800; box-shadow: none; }

  .controls { transition: opacity .2s ease; }
  .off .controls { opacity: .35; pointer-events: none; }

  .sources { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin: 18px 0 4px; }
  .chip {
    border: none; border-radius: 12px; padding: 7px 11px; cursor: pointer;
    font-size: 12px; font-weight: 600; letter-spacing: .2px;
    background: var(--bg, var(--key)); color: var(--fg, var(--text));
    box-shadow: 0 2px 0 rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.08);
    transition: transform .06s ease, filter .15s ease;
  }
  .chip:hover { filter: brightness(1.15); }
  .chip:active { transform: translateY(2px); box-shadow: none; }
  .src { background: transparent; border: 1px solid rgba(255,255,255,.14); box-shadow: none; font-weight: 500; }
  .src.active { background: var(--key-hi); }

  .numpad { display: grid; grid-template-columns: repeat(3, 52px); justify-content: center; gap: 10px 18px; margin: 14px 0 4px; }
  .numpad[hidden] { display: none; }
  .num span { font-size: 18px; font-weight: 500; }

  .dpad {
    position: relative; width: 196px; height: 196px; margin: 18px auto 16px; border-radius: 50%;
    background: radial-gradient(circle at 50% 35%, #3b3e45 0%, #2b2d32 70%);
    box-shadow: 0 4px 0 rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.08);
  }
  .dpad .arrow { position: absolute; width: 62px; height: 62px; background: transparent; box-shadow: none; }
  .dpad .arrow:hover, .dpad .arrow.pressed, .dpad .arrow:active { background: rgba(255,255,255,.07); transform: none; }
  .dpad .arrow ha-icon { --mdc-icon-size: 30px; }
  .dpad .up { top: 4px; left: 67px; }
  .dpad .down { bottom: 4px; left: 67px; }
  .dpad .left { left: 4px; top: 67px; }
  .dpad .right { right: 4px; top: 67px; }
  .dpad .ok {
    position: absolute; top: 58px; left: 58px; width: 80px; height: 80px;
    background: #1d1e22; font-weight: 700; letter-spacing: 1px; font-size: 15px;
    box-shadow: 0 2px 0 rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.06);
  }
  .dpad .ok:hover { background: #26272c; }

  .row { display: flex; align-items: center; justify-content: space-between; }
  .row.three { padding: 0 6px; }
  .home { background: #3d4048; }
  .row.four { margin-top: 16px; padding: 0 2px; }

  .rockers { display: grid; grid-template-columns: 60px 1fr 60px; align-items: center; gap: 8px; margin-top: 18px; }
  .rocker {
    display: flex; flex-direction: column; align-items: center; border-radius: 30px; overflow: hidden;
    background: var(--key); box-shadow: 0 3px 0 rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.07);
  }
  .rocker .btn { width: 60px; height: 58px; border-radius: 0; background: transparent; box-shadow: none; }
  .rocker .btn:hover, .rocker .btn.pressed, .rocker .btn:active { background: rgba(255,255,255,.08); transform: none; }
  .rocker .label { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; opacity: .55; padding: 2px 0; }
  .mid { display: flex; flex-direction: column; align-items: center; gap: 10px; }

  .colors { display: flex; gap: 10px; margin: 18px 6px 0; }
  .color {
    flex: 1; height: 12px; border: none; border-radius: 6px; cursor: pointer; padding: 0;
    background: var(--c); box-shadow: 0 2px 0 rgba(0,0,0,.45); opacity: .9;
  }
  .color:active { transform: translateY(2px); box-shadow: none; }

  .apps, .all-apps { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 18px; }
  .all-apps { margin-top: 8px; }
  .all-apps[hidden] { display: none; }
  .apps .chip, .all-apps .chip { padding: 10px 6px; border-radius: 14px; font-size: 12.5px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .more { grid-column: 1 / -1; background: transparent; border: 1px dashed rgba(255,255,255,.2); box-shadow: none; font-weight: 500; }
`;

if (!customElements.get("samsung-remote-card")) {
  customElements.define("samsung-remote-card", SamsungRemoteCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "samsung-remote-card",
    name: "Samsung TV Remote",
    description: "Telecomando per i TV Samsung (richiede l'integrazione Samsung TV Tizen)",
    documentationURL: "https://github.com/pierpa71/samsung-remote-card",
    preview: true,
  });
  console.info(`%c SAMSUNG-REMOTE-CARD %c ${CARD_VERSION} `,
    "background:#1428a0;color:#fff;border-radius:3px 0 0 3px", "background:#333;color:#fff;border-radius:0 3px 3px 0");
}
