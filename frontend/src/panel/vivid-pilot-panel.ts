// ====== Code Summary ======
// VividPilotPanel: the sidebar panel. For now it only proves the link with
// the integration (version and storage counters); the Rooms, Memory,
// Automations and Utilities tabs will be added here.

import { LitElement, css, html, type PropertyValues } from "lit";

import { PilotApi, type PilotInfo } from "../api/pilot-api";
import type { HomeAssistant } from "../types/home-assistant";

type LoadState =
  { kind: "loading" } | { kind: "ready"; info: PilotInfo } | { kind: "error"; message: string };

export class VividPilotPanel extends LitElement {
  static override properties = {
    hass: { attribute: false },
    narrow: { type: Boolean },
    state: { state: true },
  };

  hass?: HomeAssistant;
  narrow = false;
  state: LoadState = { kind: "loading" };

  private requested = false;

  protected override updated(changed: PropertyValues): void {
    // The frontend sets hass after creation: load once it is there.
    if (changed.has("hass") && this.hass && !this.requested) {
      this.requested = true;
      void this.load(this.hass);
    }
  }

  private async load(hass: HomeAssistant): Promise<void> {
    try {
      const info = await new PilotApi(hass).fetchInfo();
      this.state = { kind: "ready", info };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.state = { kind: "error", message };
    }
  }

  protected override render() {
    return html`
      <div class="page">
        <h1>Vivid Pilot</h1>
        ${this.renderState()}
      </div>
    `;
  }

  private renderState() {
    switch (this.state.kind) {
      case "loading":
        return html`<p>Chargement…</p>`;
      case "error":
        return html`<p class="error">Erreur : ${this.state.message}</p>`;
      case "ready":
        return html`
          <p>Version ${this.state.info.version} — connecté à l'intégration.</p>
          <p>
            ${this.state.info.overrides} correction(s), ${this.state.info.memories} mémoire(s) de
            pièce.
          </p>
        `;
    }
  }

  static override styles = css`
    :host {
      display: block;
      color: var(--primary-text-color);
      background: var(--primary-background-color);
      min-height: 100vh;
    }
    .page {
      max-width: 960px;
      margin: 0 auto;
      padding: 24px;
    }
    .error {
      color: var(--error-color);
    }
  `;
}
