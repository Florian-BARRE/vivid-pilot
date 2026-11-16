// ====== Code Summary ======
// VividPilotNode: the right-hand view of the selected node — home, a room,
// a category of a room, "no room" or "ignored". A hero with live
// aggregates and actions (restore, turn off, memory settings), then one card
// per category; a card header opens that category, a leaf opens its editor.

import { LitElement, html, nothing } from "lit";
import { keyed } from "lit/directives/keyed.js";

import { plural, savedWhen, t } from "../i18n";
import { renderIcon } from "../theme/icon";
import { UI_ICONS } from "../theme/ui-icons";
import { sharedStyles, themeTokens } from "../theme/styles";
import { nodeViewStyles } from "./node-view.styles";
import { CATEGORIES, reasonLabel } from "../tree/categories";
import type { PanelModel } from "../tree/panel-model";
import {
  nodeKey,
  parseNodeKey,
  type CategoryNode,
  type CategoryId,
  type TreeLeaf,
} from "../tree/types";

const SWITCHABLE = new Set<CategoryId>(["light", "led", "switch"]);
const LIGHTS = new Set<CategoryId>(["light", "led"]);

interface ViewData {
  key: string | null;
  eyebrow: string;
  heading: string;
  note: string;
  cards: CategoryNode[];
  areaId: string | null;
  category: CategoryId | null;
}

export class VividPilotNode extends LitElement {
  static override properties = {
    model: { attribute: false },
    selected: { type: String },
  };

  model?: PanelModel;
  selected = "all";

  private emit(name: string, detail: string): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  private data(model: PanelModel): ViewData {
    const tree = model.payload.tree;
    if (this.selected === "unassigned" || this.selected === "ignored") {
      const unassigned = this.selected === "unassigned";
      return {
        key: null,
        eyebrow: unassigned ? t("node_to_sort") : t("node_excluded"),
        heading: unassigned ? t("node_unassigned") : t("node_ignored"),
        note: unassigned ? t("node_unassigned_note") : t("node_ignored_note"),
        cards: byCategory(unassigned ? tree.unassigned : tree.ignored),
        areaId: null,
        category: null,
      };
    }
    const { areaId, category } = parseNodeKey(this.selected);
    const room = areaId ? model.room(areaId) : undefined;
    const leaves = room
      ? room.categories.flatMap((node) => node.leaves)
      : tree.rooms.flatMap((r) => r.categories.flatMap((node) => node.leaves));
    const cards = byCategory(leaves).filter((node) => !category || node.category === category);
    return {
      key: this.selected,
      eyebrow: category
        ? t("crumb", { room: room?.name ?? t("all") })
        : room
          ? t("crumb_room")
          : t("all"),
      heading: category ? CATEGORIES[category].label : (room?.name ?? t("home")),
      note: room || category ? "" : plural("rooms", tree.rooms.length),
      cards,
      areaId,
      category,
    };
  }

  protected override render() {
    const model = this.model;
    if (!model) return nothing;
    const view = this.data(model);
    // A new selection plays the entrance again; live updates do not.
    return keyed(
      this.selected,
      html`<div class="view">
        ${this.renderHero(model, view)}
        ${
          view.cards.length === 0
            ? html`<p class="muted empty">${t("nothing_here")}</p>`
            : html`<div
                class="grid stagger ${view.category || view.cards.length === 1 ? "single" : ""}"
              >
                ${view.cards.map((node) => this.renderCard(model, view, node))}
                ${
                  view.key
                    ? html`<vivid-pilot-power-sources
                        .model=${model}
                        .areaId=${view.areaId}
                        .category=${view.category}
                      ></vivid-pilot-power-sources>`
                    : nothing
                }
              </div>`
        }
      </div>`,
    );
  }

  private renderHero(model: PanelModel, view: ViewData) {
    const fmt = (value: number) => model.aggregator.formatNumber(value);
    const chips: Array<[string, string, string, string]> = [];
    if (view.key) {
      const power = model.power(view.areaId, view.category);
      if (power !== null)
        chips.push([UI_ICONS.bolt, "#f5b042", t("chip_power"), `${fmt(power)} W`]);
      // Lamps and LEDs, as the side tree and the room's button count them.
      const lights = view.cards.filter((node) => LIGHTS.has(node.category));
      if (lights.length) {
        const all = lights.flatMap((node) => node.leaves);
        const on = all.filter((leaf) => model.hass.states[leaf.entity_id]?.state === "on").length;
        chips.push([UI_ICONS.bulb, "#ff5f6d", t("chip_lights"), `${on} / ${all.length}`]);
      }
      const temp = view.cards.find((node) => node.category === "temperature");
      const range = temp ? model.aggregator.range(temp, model.hass.states) : null;
      if (range) {
        const text =
          range.min === range.max
            ? `${fmt(range.min)} °C`
            : `${fmt(range.min)} – ${fmt(range.max)} °C`;
        chips.push([UI_ICONS.thermometer, "#5aa9ff", t("chip_temperature"), text]);
      }
    }
    const info = view.key ? model.node(view.key) : undefined;
    const switchable = view.key && (view.category ? SWITCHABLE.has(view.category) : true) && info;
    return html`
      <section class="hero card">
        <div class="title">
          <div class="eyebrow muted">${view.eyebrow}</div>
          <h1>${view.heading}</h1>
          ${view.note ? html`<div class="muted small">${view.note}</div>` : nothing}
          ${info ? this.renderMemoryLine(model, view.key!, info.memory) : nothing}
        </div>
        ${
          chips.length
            ? html`<div class="chips">
                ${chips.map(
                  ([icon, color, label, value]) =>
                    html`<div class="chip">
                      <span class="chip-icon" style="--accent: ${color}"
                        >${renderIcon(icon, color, 16)}</span
                      >
                      <div>
                        <div class="chip-value">${value}</div>
                        <div class="muted small">${label}</div>
                      </div>
                    </div>`,
                )}
              </div>`
            : nothing
        }
        ${
          switchable
            ? html`<div class="actions">
                <button
                  type="button"
                  class="primary"
                  @click=${() => model.api.group("turn_on", view.key!)}
                >
                  ${renderIcon(info!.memory.saved_at ? UI_ICONS.restore : UI_ICONS.power, "currentColor", 17)}
                  ${info!.memory.saved_at ? t("restore") : t("turn_on")}
                </button>
                <button type="button" @click=${() => model.api.group("turn_off", view.key!)}>
                  ${renderIcon(UI_ICONS.power, "currentColor", 17)} ${t("turn_off")}
                </button>
                <button
                  type="button"
                  class="icon-only"
                  title=${t("memory_settings")}
                  aria-label=${t("memory_settings")}
                  @click=${() => this.emit("vp-memory-edit", view.key!)}
                >
                  ${renderIcon(UI_ICONS.sliders, "currentColor", 18)}
                </button>
              </div>`
            : nothing
        }
      </section>
    `;
  }

  private renderMemoryLine(
    model: PanelModel,
    key: string,
    memory: { active: boolean; saved_at: string | null; colors: number[][] },
  ) {
    const colors = memory.colors.map((c) => `rgb(${c.join(",")})`);
    const swatch =
      colors.length > 1
        ? `linear-gradient(90deg, ${colors.join(", ")})`
        : (colors[0] ?? "var(--vp-divider)");
    const text = !memory.active
      ? t("memory_disabled")
      : memory.saved_at
        ? t("memory_saved", { when: savedWhen(memory.saved_at) })
        : t("memory_nothing");
    return html`<div
      class="memory-line ${memory.active ? "" : "off"}"
      title=${model.generated(key, "scene:state") ?? ""}
    >
      ${renderIcon(UI_ICONS.memory, "currentColor", 14)}
      <span>${text}</span>
      ${memory.saved_at ? html`<span class="swatch" style="background: ${swatch}"></span>` : nothing}
    </div>`;
  }

  private renderCard(model: PanelModel, view: ViewData, node: CategoryNode) {
    const meta = CATEGORIES[node.category];
    const summary = model.aggregator.category(node, model.hass.states);
    const target = view.areaId
      ? nodeKey(view.areaId, node.category)
      : view.key
        ? nodeKey(null, node.category)
        : null;
    const power =
      target && SWITCHABLE.has(node.category) ? model.power(view.areaId, node.category) : null;
    const header = html`
      <div class="badge" style="background: color-mix(in srgb, ${meta.color} 18%, transparent)">
        ${renderIcon(meta.icon, meta.color)}
      </div>
      <div class="head-text">
        <h2>${meta.label}</h2>
        <div class="muted small">
          ${plural("members", node.leaves.length)}${
            power !== null ? ` · ${model.aggregator.formatNumber(power)} W` : ""
          }
        </div>
      </div>
      <div class="aggregate" style="--accent: ${meta.color}">${summary.text}</div>
    `;
    return html`
      <section class="card category">
        ${
          target && !view.category
            ? html`<button
                type="button"
                class="card-head link"
                @click=${() => this.emit("vp-select", target)}
              >
                ${header}
              </button>`
            : html`<div class="card-head">${header}</div>`
        }
        <ul>
          ${node.leaves.map((leaf) =>
            this.renderLeaf(model, leaf, !view.areaId && view.key !== null),
          )}
        </ul>
      </section>
    `;
  }

  private renderLeaf(model: PanelModel, leaf: TreeLeaf, showRoom: boolean) {
    const view = model.aggregator.leaf(leaf, model.hass.states);
    const meta = CATEGORIES[leaf.category];
    const lit = view.glow ?? null;
    const strip = model.stripPower(leaf.entity_id);
    const room = showRoom ? model.place(leaf.entity_id)?.room?.name : undefined;
    const manual = leaf.source === "manual";
    return html`
      <li>
        <button
          type="button"
          class="leaf ${view.available ? "" : "unavailable"} ${lit ? "lit" : ""}"
          title=${leaf.entity_id}
          style=${lit ? `--glow: ${lit}` : ""}
          @click=${() => this.emit("vp-edit-leaf", leaf.entity_id)}
        >
          <span class="leaf-icon" style="--accent: ${meta.color}"
            >${renderIcon(meta.icon, lit ? "#fff" : meta.color, 16)}</span
          >
          <span class="leaf-text">
            <span class="leaf-name">${leaf.name}</span>
            ${room ? html`<span class="muted small">${room}</span>` : nothing}
          </span>
          ${
            manual
              ? html`<span
                  class="fixed"
                  title=${t("fixed_by_hand", { reason: reasonLabel(leaf.reason) })}
                  >${renderIcon(UI_ICONS.pencil, "currentColor", 13)}</span
                >`
              : nothing
          }
          <span class="value">
            <span class=${view.active ? "on" : ""}>${view.text}</span>
            ${strip !== null ? html`<span class="muted small">${model.aggregator.formatNumber(strip)} W</span>` : nothing}
          </span>
        </button>
      </li>
    `;
  }

  static override styles = [themeTokens, sharedStyles, nodeViewStyles];
}

function byCategory(leaves: TreeLeaf[]): CategoryNode[] {
  const order = Object.keys(CATEGORIES) as CategoryId[];
  return order
    .map((category) => ({ category, leaves: leaves.filter((leaf) => leaf.category === category) }))
    .filter((node) => node.leaves.length > 0);
}
