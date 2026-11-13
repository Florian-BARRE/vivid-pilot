// ====== Code Summary ======
// VividPilotMemoryTab: every memory of the tree in one list — Maison, each
// room and its lights / LEDs / switches. Per memory: on / off switch,
// status, stored colours and date, Restore / Save now / Forget, and its
// settings. On top: the global switch, the debounce and the filters.

import { LitElement, html, nothing } from "lit";

import { sharedStyles, themeTokens } from "../theme/styles";
import { memoryTabStyles } from "./memory-tab.styles";
import { CATEGORIES } from "../tree/categories";
import type { PanelModel } from "../tree/panel-model";
import { parseNodeKey, type NodeKey } from "../tree/types";

type Filter = "all" | "on" | "off";

export class VividPilotMemoryTab extends LitElement {
  static override properties = {
    model: { attribute: false },
    filter: { state: true },
  };

  model?: PanelModel;
  filter: Filter = "all";

  private label(key: NodeKey): string {
    const { areaId, category } = parseNodeKey(key);
    const room = areaId ? (this.model!.room(areaId)?.name ?? areaId) : "Maison";
    return category ? `${room} · ${CATEGORIES[category].label}` : room;
  }

  protected override render() {
    const model = this.model;
    if (!model) return nothing;
    const keys = Object.keys(model.payload.nodes);
    const enabled = (key: NodeKey) => model.payload.nodes[key].settings.memory_enabled;
    const on = keys.filter(enabled).length;
    const shown = keys.filter(
      (key) => this.filter === "all" || (this.filter === "on") === enabled(key),
    );
    const settings = model.payload.settings;
    return html`
      <section class="card head">
        <div class="title">
          <h1>Mémoires</h1>
          <div class="muted">
            ${keys.length} mémoires · ${on} actives · ${keys.length - on} désactivées
          </div>
        </div>
        <div class="filters" role="group" aria-label="Filtre">
          ${(
            [
              ["all", `Toutes · ${keys.length}`],
              ["on", `Actives · ${on}`],
              ["off", `Désactivées · ${keys.length - on}`],
            ] as Array<[Filter, string]>
          ).map(
            ([id, label]) =>
              html`<button
                type="button"
                class=${this.filter === id ? "on" : ""}
                aria-pressed=${this.filter === id ? "true" : "false"}
                @click=${() => (this.filter = id)}
              >
                ${label}
              </button>`,
          )}
        </div>
        <label class="check"
          ><input
            type="checkbox"
            role="switch"
            .checked=${settings.memory_master}
            @change=${(e: Event) => model.api.updateSettings({ memory_master: (e.target as HTMLInputElement).checked })}
          />
          Mémorisation automatique</label
        >
        <label class="check"
          >Délai
          <input
            type="number"
            min="0.5"
            max="60"
            step="0.5"
            .value=${String(settings.memory_debounce)}
            @change=${(e: Event) => model.api.updateSettings({ memory_debounce: Number((e.target as HTMLInputElement).value) })}
          />
          s</label
        >
      </section>
      <section class="card list">${shown.map((key) => this.renderRow(model, key))}</section>
      <p class="muted note">
        Désactivée : la mémoire n'est plus mise à jour et sa scène devient indisponible ; le groupe
        continue de marcher et le dernier état est gardé. Une mémoire n'enregistre jamais un état «
        tout éteint ».
      </p>
    `;
  }

  private renderRow(model: PanelModel, key: NodeKey) {
    const info = model.payload.nodes[key];
    const memory = info.memory;
    const enabled = info.settings.memory_enabled && model.payload.settings.memory_master;
    const empty = !memory.saved_at;
    const { areaId, category } = parseNodeKey(key);
    const level = areaId === null ? 0 : category ? 2 : 1;
    const colors = memory.colors.map((c) => `rgb(${c.join(",")})`);
    const bar =
      colors.length > 1
        ? `linear-gradient(90deg, ${colors.join(", ")})`
        : (colors[0] ?? "var(--vp-divider)");
    const when = memory.saved_at
      ? new Date(memory.saved_at).toLocaleString(model.hass.language || "fr")
      : "jamais mémorisée";
    const status = !enabled ? "désactivée" : empty ? "vide" : "à jour";
    return html`
      <div class="row level-${level} ${enabled ? "" : "disabled"}">
        <label class="switch">
          <input
            type="checkbox"
            role="switch"
            aria-label=${`Mémoire ${this.label(key)}`}
            .checked=${info.settings.memory_enabled}
            @change=${(e: Event) => model.api.updateNode(key, { memory_enabled: (e.target as HTMLInputElement).checked })}
          />
        </label>
        <div class="who">
          <div class="name">
            ${this.label(key)}
            <span class="pill status-${status.replace(" ", "-")}">${status}</span>
          </div>
          <div class="mono">${model.generated(key, "scene:state") ?? ""}</div>
        </div>
        <div class="state">
          <div class="bar" style="background: ${bar}"></div>
          <div class="muted small">
            ${when}${memory.count ? ` · ${memory.on}/${memory.count} allumés` : ""}
          </div>
        </div>
        <div class="actions">
          <button
            type="button"
            class="primary"
            ?disabled=${empty}
            @click=${() => model.api.memory("restore", key)}
          >
            Rétablir
          </button>
          <button type="button" ?disabled=${!enabled} @click=${() => model.api.memory("save", key)}>
            Mémoriser
          </button>
          <button type="button" ?disabled=${empty} @click=${() => model.api.memory("forget", key)}>
            Oublier
          </button>
          <button
            type="button"
            @click=${() => this.dispatchEvent(new CustomEvent("vp-memory-edit", { detail: key, bubbles: true, composed: true }))}
          >
            Réglages
          </button>
        </div>
      </div>
    `;
  }

  static override styles = [themeTokens, sharedStyles, memoryTabStyles];
}
