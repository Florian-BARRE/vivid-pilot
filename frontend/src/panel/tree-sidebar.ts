// ====== Code Summary ======
// VividPilotTree: the left-hand tree (Maison → rooms → categories). Rooms
// expand in place; clicking Maison, a room, "Sans pièce" or "Ignorés"
// fires a "vp-select" event with the selection key.

import { LitElement, css, html, nothing } from "lit";

import { renderIcon, CHEVRON_ICON, HOME_ICON } from "../theme/icon";
import { sharedStyles, themeTokens } from "../theme/styles";
import { CATEGORIES } from "../tree/categories";
import type { LiveAggregator } from "../tree/live-aggregator";
import type { HomeTree, RoomNode } from "../tree/types";
import type { HomeAssistant } from "../types/home-assistant";

export class VividPilotTree extends LitElement {
  static override properties = {
    hass: { attribute: false },
    tree: { attribute: false },
    aggregator: { attribute: false },
    selected: { type: String },
    expanded: { state: true },
  };

  hass?: HomeAssistant;
  tree?: HomeTree;
  aggregator?: LiveAggregator;
  selected = "home";
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

  protected override render() {
    if (!this.hass || !this.tree || !this.aggregator) return nothing;
    const home = this.aggregator.home(this.tree, this.hass.states);
    return html`
      <nav aria-label="Arbre" class="card">
        <button
          type="button"
          class="row home ${this.selected === "home" ? "selected" : ""}"
          @click=${() => this.select("home")}
        >
          ${renderIcon(HOME_ICON, "currentColor")}
          <span class="name">Maison</span>
          ${home.power === null ? nothing : html`<span class="power">${this.aggregator.formatNumber(home.power)} W</span>`}
        </button>
        <div class="summary muted">
          ${home.lightsOn}/${home.lightsTotal} allumées
          ${
            home.temperature
              ? html` ·
                ${this.aggregator.formatNumber(home.temperature.min)}–${this.aggregator.formatNumber(home.temperature.max)}
                °C`
              : nothing
          }
        </div>
        <div class="rooms">${this.tree.rooms.map((room) => this.renderRoom(room))}</div>
        ${this.renderExtra("unassigned", "Sans pièce", this.tree.unassigned.length, true)}
        ${this.renderExtra("ignored", "Ignorés", this.tree.ignored.length, false)}
      </nav>
    `;
  }

  private renderRoom(room: RoomNode) {
    const hass = this.hass!;
    const aggregator = this.aggregator!;
    const open = this.expanded.has(room.area_id);
    const key = `room:${room.area_id}`;
    const summary = aggregator.room(room, hass.states);
    return html`
      <div class="room">
        <div class="row ${this.selected === key ? "selected" : ""}">
          <button
            type="button"
            class="chevron ${open ? "open" : ""}"
            aria-expanded=${open ? "true" : "false"}
            aria-label=${open ? `Replier ${room.name}` : `Déplier ${room.name}`}
            @click=${() => this.toggle(room.area_id)}
          >
            ${renderIcon(CHEVRON_ICON, "currentColor", 14)}
          </button>
          <button type="button" class="room-button" @click=${() => this.select(key)}>
            <span class="name">${room.name}</span>
            <span class="muted small"
              >${summary.lightsOn > 0 ? `${summary.lightsOn} allumée(s)` : "éteinte"}</span
            >
            ${summary.power === null ? nothing : html`<span class="power">${aggregator.formatNumber(summary.power)} W</span>`}
          </button>
        </div>
        ${
          open
            ? html`<div class="categories">
                ${room.categories.map((node) => {
                  const meta = CATEGORIES[node.category];
                  return html`<div class="category">
                    ${renderIcon(meta.icon, meta.color, 15)}
                    <span class="name">${meta.label}</span>
                    <span class="muted small">${aggregator.category(node, hass.states).text}</span>
                  </div>`;
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
      .row {
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
      .row.selected {
        background: var(--vp-selected);
      }
      .row:hover:not(.selected) {
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
      }
      .power {
        font-size: 12px;
        font-weight: 700;
        min-width: 44px;
        text-align: right;
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
      .chevron {
        width: 32px;
        height: 32px;
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
        background: transparent;
        cursor: pointer;
        text-align: left;
        min-width: 0;
      }
      .categories {
        display: flex;
        flex-direction: column;
        margin: 0 0 6px 34px;
      }
      .category {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
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
