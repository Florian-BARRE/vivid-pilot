// ====== Code Summary ======
// VividPilotGraph: the tree drawn as a graph — Maison → rooms → the focused
// room's categories → the focused category's (or the room's lights')
// entities, with live values and curved links. Clicking a node selects it
// ("vp-select"); clicking an entity opens its editor ("vp-edit-leaf").

import { LitElement, css, html, nothing, svg } from "lit";

import { HOME_ICON, renderIcon } from "../theme/icon";
import { sharedStyles, themeTokens } from "../theme/styles";
import { UI_ICONS } from "../theme/ui-icons";
import { CATEGORIES } from "../tree/categories";
import type { PanelModel } from "../tree/panel-model";
import { nodeKey, parseNodeKey, type CategoryId } from "../tree/types";

const COLUMNS = [0, 250, 510, 790];
const WIDTHS = [210, 220, 240, 280];
const ROW = 56;
const GAP = 10;
/** Room of the graph's second column. */
const ROOM_ICON = "M4 21V9l8-6 8 6v12M9 21v-6h6v6";
const COLUMN_TITLES = ["Maison", "Pièces", "Catégories", "Entités"];

interface GraphNode {
  id: string;
  column: number;
  row: number;
  label: string;
  sub: string;
  value: string;
  color: string;
  icon: string;
  /** Lit: the icon tile glows in this color. */
  glow: string | null;
  selected: boolean;
  onClick: () => void;
  memory: boolean;
  fixed: boolean;
}

export class VividPilotGraph extends LitElement {
  static override properties = {
    model: { attribute: false },
    selected: { type: String },
  };

  model?: PanelModel;
  selected = "all";

  private emit(name: string, detail: string): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  protected override render() {
    const model = this.model;
    if (!model) return nothing;
    const fmt = (value: number | null) =>
      value === null ? "" : `${model.aggregator.formatNumber(value)} W`;
    const { areaId, category } = parseNodeKey(this.selected);
    const focus = model.room(areaId ?? "") ?? model.rooms[0];
    const nodes: GraphNode[] = [];
    const edges: Array<[string, string, string]> = [];

    const home = model.aggregator.home(model.payload.tree, model.hass.states);
    nodes.push(
      this.node(
        "all",
        0,
        0,
        "Maison",
        `${home.lightsOn}/${home.lightsTotal} allumées`,
        fmt(model.power(null)),
        "#8a3ffc",
        HOME_ICON,
        null,
        this.selected === "all",
        () => this.emit("vp-select", "all"),
        !!model.node("all"),
      ),
    );
    model.rooms.forEach((room, index) => {
      const summary = model.aggregator.room(room, model.hass.states);
      nodes.push(
        this.node(
          room.area_id,
          1,
          index,
          room.name,
          summary.lightsOn
            ? `${summary.lightsOn} allumée${summary.lightsOn > 1 ? "s" : ""}`
            : "éteinte",
          fmt(model.power(room.area_id)),
          "#03a9f4",
          ROOM_ICON,
          null,
          this.selected === room.area_id,
          () => this.emit("vp-select", room.area_id),
          !!model.node(room.area_id),
        ),
      );
      edges.push(["all", room.area_id, "var(--vp-divider)"]);
    });

    if (focus) {
      const focusedCategory: CategoryId | null =
        category && focus.area_id === areaId ? category : null;
      focus.categories.forEach((node, index) => {
        const meta = CATEGORIES[node.category];
        const key = nodeKey(focus.area_id, node.category);
        nodes.push(
          this.node(
            key,
            2,
            index,
            meta.label,
            model.aggregator.category(node, model.hass.states).text,
            fmt(model.power(focus.area_id, node.category)),
            meta.color,
            meta.icon,
            null,
            this.selected === key,
            () => this.emit("vp-select", key),
            !!model.node(key),
          ),
        );
        edges.push([focus.area_id, key, meta.color]);
      });
      const shown = focus.categories.filter((node) =>
        focusedCategory
          ? node.category === focusedCategory
          : ["light", "led", "switch"].includes(node.category),
      );
      let row = 0;
      for (const node of shown) {
        const meta = CATEGORIES[node.category];
        for (const leaf of node.leaves) {
          const live = model.aggregator.leaf(leaf, model.hass.states);
          const id = `leaf:${leaf.entity_id}`;
          nodes.push(
            this.node(
              id,
              3,
              row++,
              leaf.name,
              live.text,
              fmt(model.stripPower(leaf.entity_id)),
              meta.color,
              meta.icon,
              live.glow,
              false,
              () => this.emit("vp-edit-leaf", leaf.entity_id),
              false,
              leaf.source === "manual",
            ),
          );
          edges.push([nodeKey(focus.area_id, node.category), id, meta.color]);
        }
      }
    }

    const position = new Map(nodes.map((node) => [node.id, node]));
    const height = Math.max(...nodes.map((node) => (node.row + 1) * (ROW + GAP)), ROW) + GAP;
    const width = COLUMNS[3] + WIDTHS[3] + 4;
    return html`
      <div class="card frame">
        <div class="titles" style="width: ${width}px">
          ${COLUMN_TITLES.map(
            (title, index) =>
              html`<span style="left: ${COLUMNS[index]}px; width: ${WIDTHS[index]}px"
                >${title}</span
              >`,
          )}
        </div>
        <div class="canvas" style="width: ${width}px; height: ${height}px">
          <svg width=${width} height=${height} aria-hidden="true">
            ${edges.map(([from, to, color]) => {
              const a = position.get(from);
              const b = position.get(to);
              if (!a || !b) return nothing;
              const x1 = COLUMNS[a.column] + WIDTHS[a.column];
              const y1 = a.row * (ROW + GAP) + ROW / 2 + GAP;
              const x2 = COLUMNS[b.column];
              const y2 = b.row * (ROW + GAP) + ROW / 2 + GAP;
              const mid = (x1 + x2) / 2;
              const strong = a.selected || b.selected || b.column === 3;
              return svg`<path d="M${x1} ${y1} C${mid} ${y1} ${mid} ${y2} ${x2} ${y2}" fill="none" stroke=${color} stroke-opacity=${strong ? 0.75 : 0.3} stroke-width=${strong ? 2.2 : 1.5}></path>`;
            })}
          </svg>
          ${nodes.map(
            (node) =>
              html`<button
                type="button"
                class="node ${node.selected ? "selected" : ""} ${node.glow ? "lit" : ""}"
                style="left: ${COLUMNS[node.column]}px; top: ${node.row * (ROW + GAP) + GAP}px; width: ${WIDTHS[node.column]}px; --accent: ${node.color}; --glow: ${node.glow ?? "transparent"}"
                @click=${node.onClick}
              >
                <span class="tile"
                  >${renderIcon(node.icon, node.glow ? "#fff" : node.color, 16)}</span
                >
                <span class="text">
                  <span class="label">${node.label}</span>
                  <span class="sub">${node.sub}</span>
                </span>
                ${
                  node.memory
                    ? html`<span class="mark" title="A une mémoire (dernier état)"
                        >${renderIcon(UI_ICONS.memory, "currentColor", 13)}</span
                      >`
                    : nothing
                }
                ${
                  node.fixed
                    ? html`<span class="mark fixed" title="Corrigé à la main"
                        >${renderIcon(UI_ICONS.pencil, "currentColor", 12)}</span
                      >`
                    : nothing
                }
                <span class="value">${node.value}</span>
              </button>`,
          )}
        </div>
      </div>
    `;
  }

  private node(
    id: string,
    column: number,
    row: number,
    label: string,
    sub: string,
    value: string,
    color: string,
    icon: string,
    glow: string | null,
    selected: boolean,
    onClick: () => void,
    memory: boolean,
    fixed = false,
  ): GraphNode {
    return {
      id,
      column,
      row,
      label,
      sub,
      value,
      color,
      icon,
      glow,
      selected,
      onClick,
      memory,
      fixed,
    };
  }

  static override styles = [
    themeTokens,
    sharedStyles,
    css`
      .frame {
        overflow: auto;
      }
      .canvas {
        position: relative;
      }
      .canvas > svg {
        position: absolute;
        inset: 0;
      }
      .frame {
        padding: 14px 16px 16px;
      }
      .titles {
        position: relative;
        height: 22px;
      }
      .titles span {
        position: absolute;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--vp-muted);
        padding-left: 4px;
      }
      .node {
        position: absolute;
        height: ${ROW}px;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 12px 0 10px;
        border-radius: 14px;
        border: 1px solid var(--vp-divider);
        background: var(--vp-card);
        cursor: pointer;
        text-align: left;
        transition:
          border-color 0.15s ease,
          box-shadow 0.15s ease,
          transform 0.1s ease;
      }
      .node:hover {
        border-color: color-mix(in srgb, var(--accent) 55%, transparent);
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
      }
      .node:active {
        transform: scale(0.98);
      }
      .node.selected {
        border-color: var(--accent);
        background: color-mix(in srgb, var(--accent) 8%, var(--vp-card));
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
      }
      .tile {
        width: 30px;
        height: 30px;
        border-radius: 9px;
        flex: none;
        display: flex;
        align-items: center;
        justify-content: center;
        background: color-mix(in srgb, var(--accent) 14%, transparent);
      }
      .node.lit .tile {
        background: var(--glow);
        box-shadow: 0 0 12px color-mix(in srgb, var(--glow) 70%, transparent);
      }
      .mark {
        flex: none;
        display: flex;
        color: var(--vp-muted);
      }
      .mark.fixed {
        color: var(--vp-warning);
      }
      .text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      .label,
      .sub {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .label {
        font-weight: 600;
      }
      .sub {
        font-size: 12px;
        color: var(--vp-muted);
      }
      .value {
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
      }
    `,
  ];
}
