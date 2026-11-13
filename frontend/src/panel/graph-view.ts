// ====== Code Summary ======
// VividPilotGraph: the tree drawn as a graph — Maison → rooms → the focused
// room's categories → the focused category's (or the room's lights')
// entities, with live values and curved links. Clicking a node selects it
// ("vp-select"); clicking an entity opens its editor ("vp-edit-leaf").

import { LitElement, css, html, nothing, svg } from "lit";

import { sharedStyles, themeTokens } from "../theme/styles";
import { CATEGORIES } from "../tree/categories";
import type { PanelModel } from "../tree/panel-model";
import { nodeKey, parseNodeKey, type CategoryId } from "../tree/types";

const COLUMNS = [0, 230, 470, 720];
const WIDTHS = [190, 200, 210, 280];
const ROW = 56;
const GAP = 10;

interface GraphNode {
  id: string;
  column: number;
  row: number;
  label: string;
  sub: string;
  value: string;
  color: string;
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
        "#e8eaf0",
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
          summary.lightsOn ? `${summary.lightsOn} allumée(s)` : "éteinte",
          fmt(model.power(room.area_id)),
          "var(--vp-primary)",
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
              live.glow ?? "var(--vp-divider)",
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
              return svg`<path d="M${x1} ${y1} C${mid} ${y1} ${mid} ${y2} ${x2} ${y2}" fill="none" stroke=${color} stroke-opacity="0.7" stroke-width="2"></path>`;
            })}
          </svg>
          ${nodes.map(
            (node) =>
              html`<button
                type="button"
                class="node ${node.selected ? "selected" : ""}"
                style="left: ${COLUMNS[node.column]}px; top: ${node.row * (ROW + GAP) + GAP}px; width: ${WIDTHS[node.column]}px"
                @click=${node.onClick}
              >
                <span
                  class="dot"
                  style="background: ${node.color}; box-shadow: 0 0 8px ${node.color}"
                ></span>
                <span class="text">
                  <span class="label">${node.label}</span>
                  <span class="sub">${node.sub}</span>
                </span>
                ${node.memory ? html`<span class="pill">état</span>` : nothing}
                ${node.fixed ? html`<span class="pill manual">corrigé</span>` : nothing}
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
    selected: boolean,
    onClick: () => void,
    memory: boolean,
    fixed = false,
  ): GraphNode {
    return { id, column, row, label, sub, value, color, selected, onClick, memory, fixed };
  }

  static override styles = [
    themeTokens,
    sharedStyles,
    css`
      .frame {
        padding: 12px;
        overflow: auto;
      }
      .canvas {
        position: relative;
      }
      svg {
        position: absolute;
        inset: 0;
      }
      .node {
        position: absolute;
        height: ${ROW}px;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 10px;
        border-radius: 12px;
        border: 1px solid var(--vp-divider);
        background: var(--vp-card);
        cursor: pointer;
        text-align: left;
      }
      .node:hover {
        background: var(--vp-raised);
      }
      .node.selected {
        border-color: var(--vp-primary);
        background: var(--vp-selected);
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
