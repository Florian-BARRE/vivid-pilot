// ====== Code Summary ======
// VividPilotPanel: the sidebar panel shell. It subscribes to the payload,
// builds the shared PanelModel on every update, and routes between the tabs
// (Arbre — list or graph —, Mémoire, Automatisations, Utilitaires) and the
// two sheets (entity editor, memory settings).

import { LitElement, css, html, nothing, type PropertyValues } from "lit";

import { PilotApi } from "../api/pilot-api";
import { sharedStyles, themeTokens } from "../theme/styles";
import { LiveAggregator } from "../tree/live-aggregator";
import { PanelModel } from "../tree/panel-model";
import type { PilotPayload } from "../tree/types";
import type { HomeAssistant } from "../types/home-assistant";

type Tab = "tree" | "memory" | "automation" | "utilities";
const TABS: Array<[Tab, string]> = [
  ["tree", "Arbre"],
  ["memory", "Mémoire"],
  ["automation", "Automatisations"],
  ["utilities", "Utilitaires"],
];

export class VividPilotPanel extends LitElement {
  static override properties = {
    hass: { attribute: false },
    narrow: { type: Boolean },
    payload: { state: true },
    tab: { state: true },
    mode: { state: true },
    selected: { state: true },
    editing: { state: true },
    memoryNode: { state: true },
    error: { state: true },
  };

  hass?: HomeAssistant;
  narrow = false;
  payload?: PilotPayload;
  tab: Tab = "tree";
  mode: "list" | "graph" = "list";
  selected = "all";
  editing = "";
  memoryNode = "";
  error = "";

  private aggregator?: LiveAggregator;
  private api?: PilotApi;
  private unsubscribe?: Promise<() => Promise<void>>;

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.hass && !this.unsubscribe) this.subscribe(this.hass);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    void this.unsubscribe?.then((stop) => stop());
    this.unsubscribe = undefined;
  }

  protected override updated(changed: PropertyValues): void {
    if (changed.has("hass") && this.hass) {
      this.aggregator ??= new LiveAggregator(this.hass.language || "fr");
      this.api = new PilotApi(this.hass);
      if (!this.unsubscribe) this.subscribe(this.hass);
    }
  }

  private subscribe(hass: HomeAssistant): void {
    const subscription = new PilotApi(hass).subscribe((payload) => {
      this.payload = payload;
      this.error = "";
    });
    this.unsubscribe = subscription;
    subscription.catch((error: unknown) => {
      this.error = (error as { message?: string }).message ?? String(error);
      this.unsubscribe = undefined;
    });
  }

  private onSelect = (event: CustomEvent<string>) => {
    this.selected = event.detail;
    this.tab = "tree";
  };
  private onEdit = (event: CustomEvent<string>) => {
    this.editing = event.detail;
  };
  private onMemoryEdit = (event: CustomEvent<string>) => {
    this.memoryNode = event.detail;
  };
  private onClose = () => {
    this.editing = "";
    this.memoryNode = "";
  };

  protected override render() {
    return html`
      <header>
        <div class="brand">
          <vivid-pilot-logo size="34"></vivid-pilot-logo>
          <span>Vivid Pilot</span>
        </div>
        <nav aria-label="Modules">
          ${TABS.map(
            ([id, label]) =>
              html`<button
                type="button"
                class="tab ${this.tab === id ? "active" : ""}"
                aria-current=${this.tab === id ? "page" : "false"}
                @click=${() => (this.tab = id)}
              >
                ${label}
              </button>`,
          )}
        </nav>
        ${
          this.tab === "tree"
            ? html`<div class="modes" role="group" aria-label="Affichage">
                <button
                  type="button"
                  class=${this.mode === "list" ? "on" : ""}
                  @click=${() => (this.mode = "list")}
                >
                  Liste
                </button>
                <button
                  type="button"
                  class=${this.mode === "graph" ? "on" : ""}
                  @click=${() => (this.mode = "graph")}
                >
                  Graphe
                </button>
              </div>`
            : nothing
        }
      </header>
      ${this.renderBody()}
    `;
  }

  private renderBody() {
    if (this.error) return html`<p class="message">Erreur : ${this.error}</p>`;
    if (!this.hass || !this.payload || !this.aggregator || !this.api) {
      return html`<p class="message muted">Chargement…</p>`;
    }
    const model = new PanelModel(this.hass, this.payload, this.api, this.aggregator);
    return html`
      <div
        class="layout"
        @vp-select=${this.onSelect}
        @vp-edit-leaf=${this.onEdit}
        @vp-memory-edit=${this.onMemoryEdit}
        @vp-close=${this.onClose}
      >
        ${this.tab === "tree" ? this.renderTree(model) : html`<main class="full">${this.renderTab(model)}</main>`}
        ${
          this.editing
            ? html`<vivid-pilot-leaf-editor
                .model=${model}
                entityId=${this.editing}
              ></vivid-pilot-leaf-editor>`
            : nothing
        }
        ${
          this.memoryNode
            ? html`<vivid-pilot-memory-editor
                .model=${model}
                node=${this.memoryNode}
              ></vivid-pilot-memory-editor>`
            : nothing
        }
      </div>
    `;
  }

  private renderTree(model: PanelModel) {
    // The graph needs the whole width: it replaces the side tree.
    if (this.mode === "graph") {
      return html`<main class="full">
        <vivid-pilot-graph .model=${model} selected=${this.selected}></vivid-pilot-graph>
      </main>`;
    }
    return html`
      <aside><vivid-pilot-tree .model=${model} selected=${this.selected}></vivid-pilot-tree></aside>
      <main><vivid-pilot-node .model=${model} selected=${this.selected}></vivid-pilot-node></main>
    `;
  }

  private renderTab(model: PanelModel) {
    switch (this.tab) {
      case "memory":
        return html`<vivid-pilot-memory-tab .model=${model}></vivid-pilot-memory-tab>`;
      case "automation":
        return html`<vivid-pilot-automation-tab .model=${model}></vivid-pilot-automation-tab>`;
      default:
        return html`<vivid-pilot-utilities-tab .model=${model}></vivid-pilot-utilities-tab>`;
    }
  }

  static override styles = [
    themeTokens,
    sharedStyles,
    css`
      :host {
        display: block;
        min-height: 100vh;
        background: var(--vp-bg);
      }
      header {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 12px 16px;
        padding: 10px 24px;
        border-bottom: 1px solid var(--vp-divider);
        background: var(--vp-card);
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 18px;
        font-weight: 500;
      }
      nav,
      .modes {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      .modes {
        margin-left: auto;
        padding: 4px;
        border-radius: 999px;
        background: var(--vp-raised);
      }
      .tab,
      .modes button {
        min-height: 40px;
        padding: 0 14px;
        border: 0;
        border-radius: 999px;
        background: transparent;
        cursor: pointer;
        color: var(--vp-muted);
      }
      .tab.active,
      .modes button.on {
        color: var(--vp-text);
        font-weight: 700;
        background: var(--vp-selected);
      }
      .modes button.on {
        background: var(--vp-card);
      }
      .layout {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        padding: 20px 24px;
        max-width: 1440px;
        margin: 0 auto;
        box-sizing: border-box;
      }
      aside {
        flex: 1 1 280px;
        max-width: 360px;
        min-width: 0;
      }
      main {
        flex: 999 1 560px;
        min-width: 0;
      }
      main.full {
        flex: 1 1 100%;
      }
      .message {
        padding: 24px;
      }
    `,
  ];
}
