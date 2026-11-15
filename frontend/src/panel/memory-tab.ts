// ====== Code Summary ======
// VividPilotMemoryTab: every memory of the tree in one list — Maison, each
// room and its lights / LEDs / switches. Per memory: on / off switch,
// status, stored colours and date, Restore / Save now / Forget, and its
// settings. On top: the global switch, the debounce and the filters.

import { LitElement, html, nothing } from "lit";

import { HOME_ICON, renderIcon } from "../theme/icon";
import { sharedStyles, themeTokens } from "../theme/styles";
import { UI_ICONS } from "../theme/ui-icons";
import { memoryTabStyles } from "./memory-tab.styles";
import { CATEGORIES } from "../tree/categories";
import type { PanelModel } from "../tree/panel-model";
import { parseNodeKey, type NodeKey } from "../tree/types";

type Filter = "all" | "on" | "off";
const ROOM_ICON = "M4 21V9l8-6 8 6v12M9 21v-6h6v6";

/** "à 18:03" today, "hier à 22:10", else "le 12 nov. à 9:30". */
function savedWhen(iso: string, language: string): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" });
  const days = Math.round(
    (new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86_400_000,
  );
  if (days === 0) return `à ${time}`;
  if (days === 1) return `hier à ${time}`;
  return `le ${date.toLocaleDateString(language, { day: "numeric", month: "short" })} à ${time}`;
}

export class VividPilotMemoryTab extends LitElement {
  static override properties = {
    model: { attribute: false },
    filter: { state: true },
  };

  model?: PanelModel;
  filter: Filter = "all";

  private toast(message: string): void {
    this.dispatchEvent(
      new CustomEvent("vp-toast", { detail: message, bubbles: true, composed: true }),
    );
  }

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
    const filters: Array<[Filter, string]> = [
      ["all", `Toutes · ${keys.length}`],
      ["on", `Actives · ${on}`],
      ["off", `Désactivées · ${keys.length - on}`],
    ];
    return html`
      <section class="card head">
        <div class="title">
          <span class="title-icon">${renderIcon(UI_ICONS.memory, "#8a3ffc", 20)}</span>
          <div>
            <h1>Mémoires</h1>
            <div class="muted small">Le dernier éclairage de chaque pièce, rétabli d'un geste.</div>
          </div>
        </div>
        <label class="setting"
          ><input
            type="checkbox"
            role="switch"
            class="switch"
            .checked=${settings.memory_master}
            @change=${(e: Event) => model.api.updateSettings({ memory_master: (e.target as HTMLInputElement).checked })}
          />
          Automatique</label
        >
        <label class="setting" title="Attente après le dernier changement avant d'enregistrer"
          >${renderIcon(UI_ICONS.clock, "currentColor", 15)}
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
      <details class="card how">
        <summary>${renderIcon(UI_ICONS.info, "currentColor", 16)} Comment ça marche</summary>
        <ul>
          <li>
            ${renderIcon(UI_ICONS.sparkle, "#8a3ffc", 15)}
            <span
              ><strong>Automatique</strong> : un changement dans une mémoire est enregistré
              ${settings.memory_debounce} s plus tard, tant qu'un membre est allumé.</span
            >
          </li>
          <li>
            ${renderIcon(UI_ICONS.power, "#ff5f6d", 15)}
            <span
              ><strong>Jamais « tout éteint »</strong> : tout éteindre ne s'écrit pas ; Rétablir
              rallume le dernier état allumé.</span
            >
          </li>
          <li>
            ${renderIcon(UI_ICONS.save, "#03a9f4", 15)}
            <span><strong>Mémoriser</strong> enregistre tout de suite ce qui est allumé.</span>
          </li>
          <li>
            ${renderIcon(UI_ICONS.hidden, "var(--vp-muted)", 15)}
            <span
              ><strong>Désactivée</strong> : plus de mise à jour, la scène est indisponible ; le
              groupe marche toujours.</span
            >
          </li>
        </ul>
      </details>
      <section class="card list">
        <div class="list-head">
          <div class="filters" role="group" aria-label="Filtre">
            ${filters.map(
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
        </div>
        ${shown.map((key) => this.renderRow(model, key))}
      </section>
    `;
  }

  private renderRow(model: PanelModel, key: NodeKey) {
    const info = model.payload.nodes[key];
    const memory = info.memory;
    const enabled = info.settings.memory_enabled && model.payload.settings.memory_master;
    const empty = !memory.saved_at;
    const { areaId, category } = parseNodeKey(key);
    const level = areaId === null ? 0 : category ? 2 : 1;
    const meta = category ? CATEGORIES[category] : null;
    const icon = meta ? meta.icon : areaId ? ROOM_ICON : HOME_ICON;
    const color = meta ? meta.color : areaId ? "#03a9f4" : "#8a3ffc";
    const colors = memory.colors.map((c) => `rgb(${c.join(",")})`);
    const swatch =
      colors.length > 1
        ? `linear-gradient(90deg, ${colors.join(", ")})`
        : (colors[0] ?? "var(--vp-divider)");
    const status = !enabled ? "off" : empty ? "empty" : "ok";
    const statusText = { off: "Désactivée", empty: "Vide", ok: "À jour" }[status];
    const when = memory.saved_at
      ? `${savedWhen(memory.saved_at, model.hass.language || "fr")}${memory.count ? ` · ${memory.on}/${memory.count}` : ""}`
      : "Rien de mémorisé";
    return html`
      <div class="row level-${level} ${enabled ? "" : "disabled"}">
        <input
          type="checkbox"
          role="switch"
          class="switch"
          aria-label=${`Mémoire ${this.label(key)}`}
          .checked=${info.settings.memory_enabled}
          @change=${(e: Event) => model.api.updateNode(key, { memory_enabled: (e.target as HTMLInputElement).checked })}
        />
        <span class="tile" style="--accent: ${color}">${renderIcon(icon, color, 16)}</span>
        <div class="who" title=${model.generated(key, "scene:state") ?? ""}>
          <div class="name">${meta ? meta.label : this.label(key)}</div>
          <div class="status ${status}"><span class="dot"></span>${statusText}</div>
        </div>
        <div class="state">
          ${empty ? nothing : html`<span class="swatch" style="background: ${swatch}"></span>`}
          <span class="muted small">${when}</span>
        </div>
        <div class="actions">
          <button
            type="button"
            class=${empty ? "" : "primary"}
            ?disabled=${empty}
            @click=${() => model.api.memory("restore", key)}
          >
            ${renderIcon(UI_ICONS.restore, "currentColor", 15)} Rétablir
          </button>
          <button
            type="button"
            class="icon"
            title="Mémoriser maintenant"
            aria-label="Mémoriser maintenant"
            ?disabled=${!enabled}
            @click=${async () => this.toast(await model.saveMemory(key))}
          >
            ${renderIcon(UI_ICONS.save, "currentColor", 16)}
          </button>
          <button
            type="button"
            class="icon"
            title="Oublier l'état mémorisé"
            aria-label="Oublier l'état mémorisé"
            ?disabled=${empty}
            @click=${() => model.api.memory("forget", key)}
          >
            ${renderIcon(UI_ICONS.forget, "currentColor", 16)}
          </button>
          <button
            type="button"
            class="icon"
            title="Réglages de la mémoire"
            aria-label="Réglages de la mémoire"
            @click=${() => this.dispatchEvent(new CustomEvent("vp-memory-edit", { detail: key, bubbles: true, composed: true }))}
          >
            ${renderIcon(UI_ICONS.sliders, "currentColor", 16)}
          </button>
        </div>
      </div>
    `;
  }

  static override styles = [themeTokens, sharedStyles, memoryTabStyles];
}
