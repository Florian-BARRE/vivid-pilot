// ====== Code Summary ======
// VividPilotTree: the left-hand tree (Maison → rooms → categories). Rooms
// expand in place; home, a room, a category, "no room" and "ignored"
// are all clickable and fire "vp-select" with the node key ("all",
// "<area>", "<area>__<category>", "unassigned", "ignored").

import { plural, t } from "../i18n";
import { LitElement, css, html, nothing, type PropertyValues } from "lit";

import { renderIcon, CHEVRON_ICON, HOME_ICON } from "../theme/icon";
import { sharedStyles, themeTokens } from "../theme/styles";
import { UI_ICONS } from "../theme/ui-icons";
import { CATEGORIES } from "../tree/categories";
import type { PanelModel } from "../tree/panel-model";
import { nodeKey, type RoomNode } from "../tree/types";

/** Open every room / fold every room. */
const UNFOLD_ICON = "M7 15l5 5 5-5M7 9l5-5 5 5";
const FOLD_ICON = "M7 20l5-5 5 5M7 4l5 5 5-5";

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

  override willUpdate(changed: PropertyValues<this>): void {
    // Open the branch of a newly selected node, once: the user can fold it
    // afterwards, even while it stays selected.
    if (!changed.has("selected")) return;
    const area = this.selected.split("__")[0];
    if (this.model?.room(area) && !this.expanded.has(area)) {
      this.expanded = new Set([...this.expanded, area]);
    }
  }

  /** Every room open, or every room folded when they all are open. */
  private toggleAll(): void {
    const rooms = this.model?.rooms.map((room) => room.area_id) ?? [];
    const allOpen = rooms.length > 0 && rooms.every((area) => this.expanded.has(area));
    this.expanded = allOpen ? new Set() : new Set(rooms);
  }

  private watts(value: number | null) {
    return value === null
      ? nothing
      : html`<span class="power ${value === 0 ? "idle" : ""}"
          >${this.model!.aggregator.formatNumber(value)} W</span
        >`;
  }

  protected override render() {
    const model = this.model;
    if (!model) return nothing;
    const home = model.aggregator.home(model.payload.tree, model.hass.states);
    const fmt = (value: number) => model.aggregator.formatNumber(value);
    const allOpen =
      model.rooms.length > 0 && model.rooms.every((room) => this.expanded.has(room.area_id));
    return html`
      <nav aria-label=${t("tree")} class="card">
        <button
          type="button"
          class="row home ${this.selected === "all" ? "selected" : ""}"
          @click=${() => this.select("all")}
        >
          ${renderIcon(HOME_ICON, "currentColor")}
          <span class="name">${t("home")}</span>
          ${this.watts(model.power(null))}
        </button>
        <div class="summary muted">
          <span title=${t("lights_on")}
            >${renderIcon(UI_ICONS.bulb, "currentColor", 13)}
            ${home.lightsOn}/${home.lightsTotal}</span
          >
          ${
            home.temperature
              ? html`<span title=${t("temperatures")}
                  >${renderIcon(UI_ICONS.thermometer, "currentColor", 13)}
                  ${fmt(home.temperature.min)}–${fmt(home.temperature.max)} °C</span
                >`
              : nothing
          }
          <button
            type="button"
            class="fold-all"
            title=${allOpen ? t("fold_all") : t("unfold_all")}
            aria-label=${allOpen ? t("fold_all") : t("unfold_all")}
            @click=${this.toggleAll}
          >
            ${renderIcon(allOpen ? FOLD_ICON : UNFOLD_ICON, "currentColor", 15)}
          </button>
        </div>
        <div class="rooms">${model.rooms.map((room) => this.renderRoom(room))}</div>
        ${this.renderExtra("unassigned", t("node_unassigned"), UI_ICONS.inbox, model.payload.tree.unassigned.length, true)}
        ${this.renderExtra("ignored", t("node_ignored"), UI_ICONS.hidden, model.payload.tree.ignored.length, false)}
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
            aria-label=${open ? t("fold", { name: room.name }) : t("unfold", { name: room.name })}
            @click=${() => this.toggle(room.area_id)}
          >
            ${renderIcon(CHEVRON_ICON, "currentColor", 14)}
          </button>
          <button type="button" class="room-button" @click=${() => this.select(room.area_id)}>
            <span class="name">${room.name}</span>
            ${
              lit > 0
                ? html`<span class="lit" title=${plural("lit", lit)}
                    >${renderIcon(UI_ICONS.bulb, "currentColor", 13)}${lit}</span
                  >`
                : nothing
            }
            ${this.watts(model.power(room.area_id))}
          </button>
        </div>
        <div class="fold ${open ? "open" : ""}" ?inert=${!open}>
          <div class="categories">
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
          </div>
        </div>
      </div>
    `;
  }

  private renderExtra(key: string, label: string, icon: string, count: number, warn: boolean) {
    if (count === 0) return nothing;
    return html`
      <button
        type="button"
        class="row extra ${warn ? "warn" : ""} ${this.selected === key ? "selected" : ""}"
        @click=${() => this.select(key)}
      >
        ${renderIcon(icon, "currentColor", 16)}
        <span class="name">${label}</span>
        <span class="count">${count}</span>
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
        overflow-wrap: anywhere;
        line-height: 1.3;
        text-align: left;
      }
      .summary {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 12px;
        padding: 0 10px 8px 38px;
      }
      .summary span,
      .lit {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .lit {
        font-size: 12px;
        font-weight: 600;
        color: #e8a33a;
        padding: 2px 7px 2px 5px;
        border-radius: 999px;
        background: color-mix(in srgb, #f5b042 16%, transparent);
      }
      .count {
        font-size: 12px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 999px;
        background: var(--vp-raised);
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
      .power.idle {
        font-weight: 400;
        color: var(--vp-muted);
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
      .fold-all {
        margin-left: auto;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: var(--vp-muted);
        cursor: pointer;
      }
      .fold-all:hover {
        background: var(--vp-raised);
        color: var(--vp-text);
      }
      /* Rooms fold by animating their row height (0fr ↔ 1fr). */
      .fold {
        display: grid;
        grid-template-rows: 0fr;
        opacity: 0;
        transition:
          grid-template-rows 240ms var(--vp-ease-out),
          opacity 180ms ease;
      }
      .fold.open {
        grid-template-rows: 1fr;
        opacity: 1;
      }
      .fold > .categories {
        overflow: hidden;
        min-height: 0;
      }
      @media (prefers-reduced-motion: reduce) {
        .fold {
          transition: opacity 150ms ease;
        }
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
        padding: 0 0 6px 30px;
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
        margin-top: 6px;
        color: var(--vp-muted);
      }
      .extra .name {
        color: var(--vp-text);
      }
      .extra.warn {
        color: var(--vp-warning);
      }
      .extra.warn .count {
        background: color-mix(in srgb, var(--vp-warning) 18%, transparent);
      }
    `,
  ];
}
