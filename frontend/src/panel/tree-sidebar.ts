// ====== Code Summary ======
// VividPilotTree: the left-hand tree (Maison → rooms → categories). Rooms
// expand in place; Maison, a room, a category, "Sans pièce" and "Ignorés"
// are all clickable and fire "vp-select" with the node key ("all",
// "<area>", "<area>__<category>", "unassigned", "ignored").

import { LitElement, css, html, nothing } from "lit";

import { renderIcon, CHEVRON_ICON, HOME_ICON } from "../theme/icon";
import { sharedStyles, themeTokens } from "../theme/styles";
import { CATEGORIES } from "../tree/categories";
import type { PanelModel } from "../tree/panel-model";
import { nodeKey, type RoomNode } from "../tree/types";

export class VividPilotTree extends LitElement {
  static override properties = {
    model: { attribute: false },
    selected: { type: String },
    expanded: { state: true },
  };

  model?: PanelModel;
  selected = "all";
  expanded = new Set<string>();

  private select(key: string): void {
    this.dispatchEvent(
      new CustomEvent("vp-select", { detail: key, bubbles: true, composed: true }),
    );
  }

  private toggle(areaId: string): void {
    const next = new Set(this.expanded);
    if (next.has(areaId)) next.delete(areaId);
    else next.add(areaId);
    this.expanded = next;
  }

  override willUpdate(): void {
    // Keep the branch of the selected node open.
    const area = this.selected.split("__")[0];
    if (this.model?.room(area) && !this.expanded.has(area)) {
      this.expanded = new Set([...this.expanded, area]);
    }
  }

  private watts(value: number | null) {
    return value === null
      ? nothing
      : html`<span class="power">${this.model!.aggregator.formatNumber(value)} W</span>`;
  }

  protected override render() {
    const model = this.model;
    if (!model) return nothing;
    const home = model.aggregator.home(model.payload.tree, model.hass.states);
    const fmt = (value: number) => model.aggregator.formatNumber(value);
    return html`
      <nav aria-label="Arbre" class="card">
        <button
          type="button"
          class="row home ${this.selected === "all" ? "selected" : ""}"
          @click=${() => this.select("all")}
        >
          ${renderIcon(HOME_ICON, "currentColor")}
          <span class="name">Maison</span>
          ${this.watts(model.power(null))}
        </button>
        <div class="summary muted">
          ${home.lightsOn}/${home.lightsTotal}
          allumées${
            home.temperature
              ? ` · ${fmt(home.temperature.min)}–${fmt(home.temperature.max)} °C`
              : ""
          }
        </div>
        <div class="rooms">${model.rooms.map((room) => this.renderRoom(room))}</div>
        ${this.renderExtra("unassigned", "Sans pièce", model.payload.tree.unassigned.length, true)}
        ${this.renderExtra("ignored", "Ignorés", model.payload.tree.ignored.length, false)}
      </nav>
    `;
  }

  private renderRoom(room: RoomNode) {
    const model = this.model!;
    const open = this.expanded.has(room.area_id);
    const summary = model.aggregator.room(room, model.hass.states);
    const lit = summary.lightsOn;
    return html`
      <div class="room">
        <div class="row ${this.selected === room.area_id ? "selected" : ""}">
          <button
            type="button"
            class="chevron ${open ? "open" : ""}"
            aria-expanded=${open ? "true" : "false"}
            aria-label=${open ? `Replier ${room.name}` : `Déplier ${room.name}`}
            @click=${() => this.toggle(room.area_id)}
          >
            ${renderIcon(CHEVRON_ICON, "currentColor", 14)}
          </button>
          <button type="button" class="room-button" @click=${() => this.select(room.area_id)}>
            <span class="name">${room.name}</span>
            <span class="muted small"
              >${lit > 0 ? `${lit} allumée${lit > 1 ? "s" : ""}` : "éteinte"}</span
            >
            ${this.watts(model.power(room.area_id))}
          </button>
        </div>
        ${
          open
            ? html`<div class="categories">
                ${room.categories.map((node) => {
                  const meta = CATEGORIES[node.category];
                  const key = nodeKey(room.area_id, node.category);
                  return html`<button
                    type="button"
                    class="category ${this.selected === key ? "selected" : ""}"
                    @click=${() => this.select(key)}
                  >
                    ${renderIcon(meta.icon, meta.color, 15)}
                    <span class="name">${meta.label}</span>
                    <span class="muted small"
                      >${model.aggregator.category(node, model.hass.states).text}</span
                    >
                  </button>`;
                })}
              </div>`
            : nothing
        }
      </div>
    `;
  }

  private renderExtra(key: string, label: string, count: number, warn: boolean) {
    if (count === 0) return nothing;
    return html`
      <button
        type="button"
        class="row extra ${warn ? "warn" : ""} ${this.selected === key ? "selected" : ""}"
        @click=${() => this.select(key)}
      >
        <span class="name">${label}</span>
        <span class="small">${count}</span>
      </button>
    `;
  }

  static override styles = [
    themeTokens,
    sharedStyles,
    css`
      nav {
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .row,
      .category {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        min-height: 44px;
        padding: 0 10px;
        border: 0;
        border-radius: 10px;
        background: transparent;
        cursor: pointer;
        text-align: left;
        box-sizing: border-box;
      }
      .selected {
        background: var(--vp-selected) !important;
      }
      .row:hover,
      .category:hover {
        background: var(--vp-raised);
      }
      .home .name {
        font-weight: 700;
      }
      .name {
        flex: 1;
        font-weight: 500;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .summary {
        font-size: 12px;
        padding: 0 10px 8px 38px;
      }
      .small {
        font-size: 12px;
        white-space: nowrap;
      }
      .power {
        font-size: 12px;
        font-weight: 700;
        min-width: 44px;
        text-align: right;
        white-space: nowrap;
      }
      .rooms {
        margin-left: 12px;
        border-left: 1px solid var(--vp-divider);
        padding-left: 6px;
      }
      .room .row {
        padding: 0 4px;
        gap: 2px;
      }
      .room .row:hover {
        background: transparent;
      }
      .chevron {
        width: 32px;
        height: 32px;
        flex: none;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: var(--vp-muted);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.15s;
      }
      .chevron.open {
        transform: rotate(90deg);
      }
      .room-button {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 44px;
        border: 0;
        border-radius: 10px;
        padding: 0 6px;
        background: transparent;
        cursor: pointer;
        text-align: left;
        min-width: 0;
      }
      .room-button:hover {
        background: var(--vp-raised);
      }
      .categories {
        display: flex;
        flex-direction: column;
        margin: 0 0 6px 30px;
      }
      .category {
        min-height: 38px;
        color: var(--vp-muted);
      }
      .category .name {
        color: var(--vp-text);
        font-weight: 400;
      }
      .extra {
        margin-top: 8px;
        border: 1px dashed var(--vp-divider);
      }
      .extra.warn {
        border-color: color-mix(in srgb, var(--vp-warning) 60%, transparent);
        background: color-mix(in srgb, var(--vp-warning) 10%, transparent);
      }
    `,
  ];
}
