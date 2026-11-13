// ====== Code Summary ======
// VividPilotUtilitiesTab: maintenance tools — rescan the registries, the low
// battery threshold, what Vivid Pilot generated (entities per kind) and the
// corrections made, with a way back to each corrected entity.

import { LitElement, css, html, nothing } from "lit";

import { renderIcon } from "../theme/icon";
import { sharedStyles, themeTokens } from "../theme/styles";
import { UI_ICONS } from "../theme/ui-icons";
import { CATEGORIES } from "../tree/categories";
import type { PanelModel } from "../tree/panel-model";
import type { TreeLeaf } from "../tree/types";

/** How each generated domain is shown: label, icon, accent. */
const DOMAINS: Record<string, [string, string, string]> = {
  light: ["Groupes de lumières", UI_ICONS.bulb, "#f5b042"],
  switch: ["Groupes d'interrupteurs", UI_ICONS.power, "#5aa9ff"],
  sensor: ["Capteurs", UI_ICONS.bolt, "#ff5f6d"],
  binary_sensor: ["Capteurs ouvert / fermé", UI_ICONS.entity, "#43b581"],
  scene: ["Scènes mémoire", UI_ICONS.memory, "#8a3ffc"],
};

/** Words for what a correction changed. */
const OPTION_WORDS: Record<string, string> = {
  power_source: "source de puissance",
  voltage: "tension",
  nominal_power: "puissance nominale",
  upstream: "déjà mesuré",
  counted: "hors total",
};

const BATTERY_ICON = "M7 6h10v15H7zM10 3h4v3M10 11v6M14 11v6";

export class VividPilotUtilitiesTab extends LitElement {
  static override properties = {
    model: { attribute: false },
    scanned: { state: true },
  };

  model?: PanelModel;
  scanned = false;

  private edit(entityId: string): void {
    this.dispatchEvent(
      new CustomEvent("vp-edit-leaf", { detail: entityId, bubbles: true, composed: true }),
    );
  }

  protected override render() {
    const model = this.model;
    if (!model) return nothing;
    const generated = Object.values(model.payload.entities).flatMap((kinds) =>
      Object.values(kinds),
    );
    generated.push(...Object.values(model.payload.strips));
    const byDomain = new Map<string, number>();
    for (const entityId of generated) {
      const domain = entityId.split(".")[0];
      byDomain.set(domain, (byDomain.get(domain) ?? 0) + 1);
    }
    const leaves = [
      ...model.rooms.flatMap((room) => room.categories.flatMap((node) => node.leaves)),
      ...model.payload.tree.unassigned,
      ...model.payload.tree.ignored,
    ];
    const corrected = leaves.filter(
      (leaf) => leaf.source === "manual" || Object.keys(leaf.options ?? {}).length,
    );
    return html`
      <div class="tools">
        <section class="card tool">
          <span class="tile" style="--accent: #03a9f4"
            >${renderIcon(UI_ICONS.refresh, "#03a9f4", 18)}</span
          >
          <div class="tool-text">
            <h2>Rescanner</h2>
            <p class="muted">
              ${this.scanned ? "Scan relancé." : "Après une grosse réorganisation des pièces."}
            </p>
          </div>
          <button
            type="button"
            class="primary"
            @click=${async () => {
              await model.api.rescan();
              this.scanned = true;
            }}
          >
            Lancer
          </button>
        </section>
        <section class="card tool">
          <span class="tile" style="--accent: #43b581"
            >${renderIcon(BATTERY_ICON, "#43b581", 18)}</span
          >
          <div class="tool-text">
            <h2>Batterie faible</h2>
            <p class="muted">Seuil des alertes de batteries.</p>
          </div>
          <label class="unit"
            ><input
              type="number"
              min="1"
              max="90"
              step="1"
              .value=${String(model.payload.settings.battery_low)}
              @change=${(e: Event) =>
                model.api.updateSettings({
                  battery_low: Number((e.target as HTMLInputElement).value),
                })}
            />%</label
          >
        </section>
        <section class="card tool">
          <vivid-pilot-logo size="40"></vivid-pilot-logo>
          <div class="tool-text">
            <h2>Vivid Pilot ${model.payload.version}</h2>
            <p class="muted">${generated.length} entités générées</p>
          </div>
        </section>
      </div>
      <section class="card">
        <h2>${renderIcon(UI_ICONS.layers, "currentColor", 16)} Entités générées</h2>
        <div class="domains">
          ${[...byDomain.entries()].map(([domain, count]) => {
            const [label, icon, color] = DOMAINS[domain] ?? [domain, UI_ICONS.entity, "#9aa0a6"];
            return html`<div class="domain">
              <span class="tile" style="--accent: ${color}">${renderIcon(icon, color, 16)}</span>
              <div>
                <div class="count">${count}</div>
                <div class="muted small">${label}</div>
              </div>
            </div>`;
          })}
        </div>
        <p class="muted small">
          Toutes commencent par <span class="mono">vivid_pilot_</span> et suivent l'arbre.
        </p>
      </section>
      <section class="card">
        <h2>
          ${renderIcon(UI_ICONS.pencil, "currentColor", 16)} Corrections
          <span class="badge">${corrected.length}</span>
        </h2>
        ${
          corrected.length === 0
            ? html`<p class="muted small">Aucune : tout vient de la détection automatique.</p>`
            : html`<ul>
                ${corrected.map((leaf) => this.renderCorrection(model, leaf))}
              </ul>`
        }
      </section>
    `;
  }

  private renderCorrection(model: PanelModel, leaf: TreeLeaf) {
    const meta = CATEGORIES[leaf.category];
    const changes = [
      ...(leaf.source === "manual" ? ["catégorie"] : []),
      ...Object.keys(leaf.options ?? {}).map((key) => OPTION_WORDS[key] ?? key),
    ];
    const room = model.place(leaf.entity_id)?.room?.name;
    return html`<li>
      <button
        type="button"
        class="leaf"
        title=${leaf.entity_id}
        @click=${() => this.edit(leaf.entity_id)}
      >
        <span class="tile" style="--accent: ${meta.color}"
          >${renderIcon(meta.icon, meta.color, 15)}</span
        >
        <span class="who">
          <span class="name">${leaf.name}</span>
          <span class="muted small">${room ?? "Sans pièce"} · ${meta.label}</span>
        </span>
        <span class="changes"
          >${changes.map((change) => html`<span class="pill manual">${change}</span>`)}</span
        >
      </button>
    </li>`;
  }

  static override styles = [
    themeTokens,
    sharedStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .tools {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 14px;
      }
      .card {
        padding: 16px 18px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .card.tool {
        flex-direction: row;
        align-items: center;
        gap: 14px;
      }
      .tool-text {
        flex: 1;
        min-width: 0;
      }
      .tile {
        width: 36px;
        height: 36px;
        border-radius: 11px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex: none;
        background: color-mix(in srgb, var(--accent) 14%, transparent);
      }
      h2 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        font-size: 15px;
        font-weight: 600;
      }
      p {
        margin: 2px 0 0;
        font-size: 13px;
      }
      .small {
        font-size: 12px;
      }
      .badge {
        font-size: 12px;
        padding: 2px 8px;
        border-radius: 999px;
        background: var(--vp-raised);
      }
      button {
        min-height: 38px;
        padding: 0 16px;
        border-radius: 11px;
        border: 1px solid var(--vp-divider);
        background: var(--vp-card);
        cursor: pointer;
      }
      button.primary {
        border: 0;
        background: var(--vp-primary);
        color: var(--text-primary-color, #fff);
        font-weight: 600;
      }
      .unit {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--vp-muted);
      }
      input[type="number"] {
        width: 64px;
        min-height: 36px;
        border-radius: 9px;
        border: 1px solid var(--vp-divider);
        background: var(--vp-card);
        color: var(--vp-text);
        padding: 0 8px;
        font: inherit;
      }
      .domains {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
        gap: 10px;
      }
      .domain {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: 12px;
        background: var(--vp-raised);
      }
      .count {
        font-size: 20px;
        font-weight: 700;
        line-height: 1.1;
      }
      ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .leaf {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 52px;
        padding: 6px 10px;
        border: 0;
        border-radius: 12px;
        background: transparent;
        text-align: left;
      }
      .leaf:hover {
        background: var(--vp-raised);
      }
      .who {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      .name {
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .changes {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 4px;
      }
    `,
  ];
}
