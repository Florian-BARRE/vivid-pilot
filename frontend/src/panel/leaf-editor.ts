// ====== Code Summary ======
// VividPilotLeafEditor: the sheet of one entity — category (with what was
// detected), room (moves the device or just the entity), power
// (VividPilotLeafPower) and membership of the parent nodes' groups and
// memories. Every change is sent right away;
// the integration answers with a new payload.

import { LitElement, html, nothing } from "lit";

import { renderIcon } from "../theme/icon";
import { sharedStyles, themeTokens } from "../theme/styles";
import { UI_ICONS } from "../theme/ui-icons";
import { leafEditorStyles } from "./leaf-editor.styles";
import { CATEGORIES, reasonLabel } from "../tree/categories";
import type { PanelModel } from "../tree/panel-model";
import { nodeKey, type CategoryId, type NodeKey, type TreeLeaf } from "../tree/types";

const EDITABLE: CategoryId[] = [
  "light",
  "led",
  "switch",
  "door",
  "window",
  "presence",
  "temperature",
  "humidity",
  "pressure",
  "co2",
  "illuminance",
  "battery",
  "power",
];
const SWITCHABLE = new Set<CategoryId>(["light", "led", "switch"]);
const ROOM_ICON = "M4 21V9l8-6 8 6v12M9 21v-6h6v6";

export class VividPilotLeafEditor extends LitElement {
  static override properties = {
    model: { attribute: false },
    entityId: { type: String },
    scope: { state: true },
    error: { state: true },
  };

  model?: PanelModel;
  entityId = "";
  scope: "device" | "entity" = "device";
  error = "";

  private close(): void {
    this.dispatchEvent(new CustomEvent("vp-close", { bubbles: true, composed: true }));
  }

  private async run(action: () => Promise<unknown>): Promise<void> {
    try {
      this.error = "";
      await action();
    } catch (error) {
      const message = (error as { message?: string }).message ?? String(error);
      this.error = message;
    }
  }

  protected override render() {
    const model = this.model;
    const place = model?.place(this.entityId);
    if (!model || !place) return nothing;
    const { leaf, room } = place;
    const live = model.aggregator.leaf(leaf, model.hass.states);
    const meta = CATEGORIES[leaf.category];
    return html`
      <div class="backdrop" @click=${this.close}></div>
      <section class="sheet card" role="dialog" aria-modal="true" aria-label=${leaf.name}>
        <header>
          <div class="badge" style="background: color-mix(in srgb, ${meta.color} 22%, transparent)">
            ${renderIcon(meta.icon, meta.color, 22)}
          </div>
          <div class="head-text">
            <h1>${leaf.name}</h1>
            <div class="mono">${leaf.entity_id}${leaf.platform ? ` · ${leaf.platform}` : ""}</div>
          </div>
          <div
            class="live ${live.glow ? "lit" : ""}"
            style=${live.glow ? `--glow: ${live.glow}` : ""}
          >
            ${live.text}
          </div>
          <button type="button" class="icon" aria-label="Fermer" @click=${this.close}>
            ${renderIcon(UI_ICONS.close, "currentColor", 18)}
          </button>
        </header>
        ${this.error ? html`<p class="error" role="alert">${this.error}</p>` : nothing}
        ${this.renderCategory(model, leaf)} ${this.renderRoom(model, leaf, room?.area_id ?? null)}
        ${
          SWITCHABLE.has(leaf.category) || leaf.category === "power"
            ? html`<vivid-pilot-leaf-power
                .model=${model}
                .leaf=${leaf}
                .areaId=${room?.area_id ?? null}
              ></vivid-pilot-leaf-power>`
            : nothing
        }
        ${SWITCHABLE.has(leaf.category) && room ? this.renderMembership(model, leaf, room.area_id) : nothing}
        <footer>
          <button
            type="button"
            class="ghost"
            title="Oublie toutes les corrections de cette entité"
            @click=${() => this.run(() => model.api.resetLeaf(leaf.entity_id))}
          >
            ${renderIcon(UI_ICONS.refresh, "currentColor", 16)} Tout remettre en auto
          </button>
          <button type="button" class="primary" @click=${this.close}>Terminé</button>
        </footer>
      </section>
    `;
  }

  private renderCategory(model: PanelModel, leaf: TreeLeaf) {
    const pick = (category: CategoryId | null) =>
      this.run(() => model.api.setCategory(leaf.entity_id, category));
    const manual = leaf.source === "manual";
    return html`
      <section class="block">
        <h2>${renderIcon(UI_ICONS.layers, "currentColor", 16)} Catégorie</h2>
        <div class="choices">
          ${EDITABLE.map(
            (category) =>
              html`<button
                type="button"
                aria-pressed=${leaf.category === category ? "true" : "false"}
                class="chip ${leaf.category === category ? "on" : ""}"
                style="--accent: ${CATEGORIES[category].color}"
                @click=${() => pick(category)}
              >
                ${renderIcon(CATEGORIES[category].icon, CATEGORIES[category].color, 15)}
                ${CATEGORIES[category].label}
              </button>`,
          )}
          <button
            type="button"
            aria-pressed=${leaf.category === "ignored" ? "true" : "false"}
            class="chip ${leaf.category === "ignored" ? "on" : ""}"
            style="--accent: var(--vp-muted)"
            @click=${() => pick("ignored")}
          >
            ${renderIcon(UI_ICONS.hidden, "currentColor", 15)} Ignorer
          </button>
        </div>
        <div class="note ${manual ? "manual" : ""}">
          ${renderIcon(manual ? UI_ICONS.pencil : UI_ICONS.sparkle, "currentColor", 14)}
          ${manual ? "Choisi à la main" : `Détecté : ${reasonLabel(leaf.reason)}`}
          ${
            manual
              ? html`<button type="button" class="link" @click=${() => pick(null)}>
                  Revenir à la détection
                </button>`
              : nothing
          }
        </div>
      </section>
    `;
  }

  private renderRoom(model: PanelModel, leaf: TreeLeaf, areaId: string | null) {
    const move = (event: Event) => {
      const value = (event.target as HTMLSelectElement).value || null;
      void this.run(() => model.api.moveLeaf(leaf.entity_id, value, this.scope));
    };
    const scopes: Array<["device" | "entity", string, string]> = [
      ["device", "Tout l'appareil", UI_ICONS.device],
      ["entity", "Cette entité", UI_ICONS.entity],
    ];
    return html`
      <section class="block">
        <h2>${renderIcon(ROOM_ICON, "currentColor", 16)} Pièce</h2>
        <div class="row">
          <select aria-label="Pièce" @change=${move}>
            <option value="" ?selected=${areaId === null}>Sans pièce</option>
            ${model
              .areas()
              .map(
                (area) =>
                  html`<option value=${area.id} ?selected=${area.id === areaId}>
                    ${area.name}
                  </option>`,
              )}
          </select>
          ${
            leaf.device_id
              ? html`<div class="segmented" role="group" aria-label="Ce qui change de pièce">
                  ${scopes.map(
                    ([scope, label, icon]) =>
                      html`<button
                        type="button"
                        class=${this.scope === scope ? "on" : ""}
                        aria-pressed=${this.scope === scope ? "true" : "false"}
                        @click=${() => (this.scope = scope)}
                      >
                        ${renderIcon(icon, "currentColor", 15)} ${label}
                      </button>`,
                  )}
                </div>`
              : nothing
          }
        </div>
        <div class="note">
          ${renderIcon(UI_ICONS.info, "currentColor", 14)}
          ${
            leaf.device_id && this.scope === "entity"
              ? "Seule cette entité change de zone dans Home Assistant ; le reste de l'appareil reste où il est."
              : "Change la zone de l'appareil dans Home Assistant, avec toutes ses entités."
          }
        </div>
      </section>
    `;
  }

  private renderMembership(model: PanelModel, leaf: TreeLeaf, areaId: string) {
    const parents: Array<[NodeKey, string]> = [
      [
        nodeKey(areaId, leaf.category),
        `${model.room(areaId)?.name} · ${CATEGORIES[leaf.category].label}`,
      ],
      [nodeKey(areaId), model.room(areaId)?.name ?? areaId],
      ["all", "Maison"],
    ];
    const toggle = (
      key: NodeKey,
      list: "group_excluded" | "memory_excluded",
      included: boolean,
    ) => {
      const settings = model.node(key)?.settings;
      if (!settings) return;
      const current = new Set(settings[list]);
      if (included) current.delete(leaf.entity_id);
      else current.add(leaf.entity_id);
      void this.run(() => model.api.updateNode(key, { [list]: [...current] }));
    };
    const shown = parents.filter(([key]) => model.node(key));
    return html`
      <section class="block">
        <h2>${renderIcon(UI_ICONS.memory, "currentColor", 16)} Groupes et mémoires</h2>
        <div class="members">
          <span></span>
          <span class="col" title="Le nœud allume et éteint cette entité">Groupe</span>
          <span class="col" title="Le nœud rétablit l'état de cette entité">Mémoire</span>
          ${shown.map(([key, label]) => {
            const settings = model.node(key)!.settings;
            return html`<span class="name">${label}</span>
              <input
                type="checkbox"
                role="switch"
                class="switch"
                aria-label=${`${label} : groupe`}
                .checked=${!settings.group_excluded.includes(leaf.entity_id)}
                @change=${(e: Event) => toggle(key, "group_excluded", (e.target as HTMLInputElement).checked)}
              />
              <input
                type="checkbox"
                role="switch"
                class="switch"
                aria-label=${`${label} : mémoire`}
                .checked=${!settings.memory_excluded.includes(leaf.entity_id)}
                @change=${(e: Event) => toggle(key, "memory_excluded", (e.target as HTMLInputElement).checked)}
              />`;
          })}
        </div>
      </section>
    `;
  }

  static override styles = [themeTokens, sharedStyles, leafEditorStyles];
}
