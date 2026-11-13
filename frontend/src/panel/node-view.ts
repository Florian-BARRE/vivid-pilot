// ====== Code Summary ======
// VividPilotNode: the right-hand view of the selected node — Maison, a room,
// a category of a room, "Sans pièce" or "Ignorés". A hero with live
// aggregates and actions (restore, turn off, memory settings), then one card
// per category; a card header opens that category, a leaf opens its editor.

import { LitElement, html, nothing } from "lit";

import { renderIcon } from "../theme/icon";
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
        eyebrow: unassigned ? "À ranger" : "Exclus",
        heading: unassigned ? "Sans pièce" : "Ignorés",
        note: unassigned
          ? "Ces appareils n'ont pas de zone dans Home Assistant. Ouvre-les pour leur donner une pièce, ou ignore-les."
          : "Mis de côté à la main : ils n'entrent dans aucun groupe, total ni mémoire.",
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
      eyebrow: category ? `Maison › ${room?.name ?? "Tout"}` : room ? "Maison › Pièce" : "Tout",
      heading: category ? CATEGORIES[category].label : (room?.name ?? "Maison"),
      note: room || category ? "" : `${tree.rooms.length} pièce${tree.rooms.length > 1 ? "s" : ""}`,
      cards,
      areaId,
      category,
    };
  }

  protected override render() {
    const model = this.model;
    if (!model) return nothing;
    const view = this.data(model);
    return html`
      ${this.renderHero(model, view)}
      ${
        view.cards.length === 0
          ? html`<p class="muted empty">Rien à afficher ici.</p>`
          : html`<div class="grid ${view.category ? "single" : ""}">
              ${view.cards.map((node) => this.renderCard(model, view, node))}
            </div>`
      }
    `;
  }

  private renderHero(model: PanelModel, view: ViewData) {
    const fmt = (value: number) => model.aggregator.formatNumber(value);
    const chips: Array<[string, string]> = [];
    if (view.key) {
      const power = model.power(view.areaId, view.category);
      if (power !== null) chips.push(["Puissance", `${fmt(power)} W`]);
      const lights = view.cards.filter((node) => SWITCHABLE.has(node.category));
      if (lights.length) {
        const all = lights.flatMap((node) => node.leaves);
        const on = all.filter((leaf) => model.hass.states[leaf.entity_id]?.state === "on").length;
        chips.push(["Allumés", `${on} / ${all.length}`]);
      }
      const temp = view.cards.find((node) => node.category === "temperature");
      const range = temp ? model.aggregator.range(temp, model.hass.states) : null;
      if (range) chips.push(["Température", `${fmt(range.min)} – ${fmt(range.max)} °C`]);
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
                  ([label, value]) =>
                    html`<div class="chip">
                      <div class="muted small">${label}</div>
                      <div class="chip-value">${value}</div>
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
                  ${info!.memory.saved_at ? "Rétablir" : "Allumer"}
                </button>
                <button type="button" @click=${() => model.api.group("turn_off", view.key!)}>
                  Éteindre
                </button>
                <button type="button" @click=${() => this.emit("vp-memory-edit", view.key!)}>
                  Mémoire…
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
    const when = memory.saved_at
      ? new Date(memory.saved_at).toLocaleString(model.hass.language || "fr")
      : null;
    const gradient = memory.colors.length
      ? `linear-gradient(90deg, ${memory.colors.map((c) => `rgb(${c.join(",")})`).join(", ")}${memory.colors.length === 1 ? ", rgb(" + memory.colors[0].join(",") + ")" : ""})`
      : "var(--vp-divider)";
    return html`<div class="memory-line">
      <span class="bar" style="background: ${gradient}"></span>
      <span class="muted small">
        ${
          !memory.active
            ? "Mémoire désactivée"
            : when
              ? `État mémorisé le ${when}`
              : "Pas encore d'état mémorisé"
        }
        · <span class="mono">${model.generated(key, "scene:state") ?? ""}</span>
      </span>
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
          ${node.leaves.length}
          membre${node.leaves.length > 1 ? "s" : ""}${
            power !== null ? ` · ${model.aggregator.formatNumber(power)} W` : ""
          }
        </div>
      </div>
      <div class="aggregate">${summary.text}</div>
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
          ${node.leaves.map((leaf) => this.renderLeaf(model, leaf, !view.areaId && view.key !== null))}
        </ul>
      </section>
    `;
  }

  private renderLeaf(model: PanelModel, leaf: TreeLeaf, showRoom: boolean) {
    const view = model.aggregator.leaf(leaf, model.hass.states);
    const glow = view.glow ? `background: ${view.glow}; box-shadow: 0 0 10px ${view.glow}` : "";
    const strip = model.stripPower(leaf.entity_id);
    const room = showRoom ? model.place(leaf.entity_id)?.room?.name : undefined;
    return html`
      <li>
        <button
          type="button"
          class="leaf ${view.available ? "" : "unavailable"}"
          @click=${() => this.emit("vp-edit-leaf", leaf.entity_id)}
        >
          <span class="dot" style=${glow}></span>
          <span class="leaf-text">
            <span class="leaf-name">${leaf.name}</span>
            <span class="mono">${room ? `${room} · ` : ""}${leaf.entity_id}</span>
          </span>
          <span
            class="pill ${leaf.source === "manual" ? "manual" : ""}"
            title=${reasonLabel(leaf.reason)}
            >${leaf.source === "manual" ? "corrigé" : "auto"}</span
          >
          <span class="value"
            >${view.text}${strip !== null ? html`<br /><span class="muted">${model.aggregator.formatNumber(strip)} W</span>` : nothing}</span
          >
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
