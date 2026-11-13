// ====== Code Summary ======
// VividPilotRoom: the right-hand view of one node — a hero with the live
// summary, then one card per category listing its leaves with their live
// value and whether the category was detected or set by hand. Read only for
// now (phase 1); corrections arrive in phase 2.

import { LitElement, css, html, nothing } from "lit";

import { renderIcon } from "../theme/icon";
import { sharedStyles, themeTokens } from "../theme/styles";
import { CATEGORIES } from "../tree/categories";
import type { LiveAggregator, RoomSummary } from "../tree/live-aggregator";
import type { CategoryNode, TreeLeaf } from "../tree/types";
import type { HomeAssistant } from "../types/home-assistant";

export class VividPilotRoom extends LitElement {
  static override properties = {
    hass: { attribute: false },
    aggregator: { attribute: false },
    heading: { type: String },
    eyebrow: { type: String },
    note: { type: String },
    categories: { attribute: false },
    summary: { attribute: false },
  };

  hass?: HomeAssistant;
  aggregator?: LiveAggregator;
  heading = "";
  eyebrow = "";
  note = "";
  categories: CategoryNode[] = [];
  summary: RoomSummary | null = null;

  protected override render() {
    if (!this.hass || !this.aggregator) return nothing;
    return html`
      <section class="hero card">
        <div class="title">
          <div class="eyebrow muted">${this.eyebrow}</div>
          <h1>${this.heading}</h1>
          ${this.note ? html`<div class="muted small">${this.note}</div>` : nothing}
        </div>
        ${this.summary ? this.renderChips(this.summary) : nothing}
      </section>
      ${
        this.categories.length === 0
          ? html`<p class="muted empty">Rien à afficher ici.</p>`
          : html`<div class="grid">
              ${this.categories.map((node) => this.renderCategory(node))}
            </div>`
      }
    `;
  }

  private renderChips(summary: RoomSummary) {
    const fmt = (value: number) => this.aggregator!.formatNumber(value);
    const chips: Array<[string, string]> = [
      ["Allumées", `${summary.lightsOn} / ${summary.lightsTotal}`],
    ];
    if (summary.power !== null) chips.unshift(["Puissance (brute)", `${fmt(summary.power)} W`]);
    if (summary.temperature) {
      chips.push([
        "Température",
        `${fmt(summary.temperature.min)} – ${fmt(summary.temperature.max)} °C`,
      ]);
    }
    return html`<div class="chips">
      ${chips.map(
        ([label, value]) =>
          html`<div class="chip">
            <div class="muted small">${label}</div>
            <div class="chip-value">${value}</div>
          </div>`,
      )}
    </div>`;
  }

  private renderCategory(node: CategoryNode) {
    const meta = CATEGORIES[node.category];
    const summary = this.aggregator!.category(node, this.hass!.states);
    const range = meta.kind === "measure" ? this.aggregator!.range(node, this.hass!.states) : null;
    const fmt = (value: number) => this.aggregator!.formatNumber(value);
    return html`
      <section class="card category">
        <header>
          <div class="badge" style="background: color-mix(in srgb, ${meta.color} 18%, transparent)">
            ${renderIcon(meta.icon, meta.color)}
          </div>
          <div class="head-text">
            <h2>${meta.label}</h2>
            <div class="muted small">
              ${node.leaves.length}
              membre${node.leaves.length > 1 ? "s" : ""}${
                range && node.leaves.length > 1
                  ? ` · min ${fmt(range.min)} · max ${fmt(range.max)}`
                  : ""
              }
            </div>
          </div>
          <div class="aggregate">${summary.text}</div>
        </header>
        <ul>
          ${node.leaves.map((leaf) => this.renderLeaf(leaf))}
        </ul>
      </section>
    `;
  }

  private renderLeaf(leaf: TreeLeaf) {
    const view = this.aggregator!.leaf(leaf, this.hass!.states);
    const glow = view.glow ? `background: ${view.glow}; box-shadow: 0 0 10px ${view.glow}` : "";
    return html`
      <li class=${view.available ? "" : "unavailable"}>
        <span class="dot" style=${glow}></span>
        <div class="leaf-text">
          <div class="leaf-name">${leaf.name}</div>
          <div class="mono">${leaf.entity_id}</div>
        </div>
        <span
          class="pill ${leaf.source === "manual" ? "manual" : ""}"
          title=${leaf.source === "manual" ? "Catégorie choisie à la main" : `Détecté : ${leaf.reason}`}
          >${leaf.source === "manual" ? "corrigé" : "auto"}</span
        >
        <span class="value">${view.text}</span>
      </li>
    `;
  }

  static override styles = [
    themeTokens,
    sharedStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .hero {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 20px;
        padding: 20px 22px;
        background:
          radial-gradient(
            120% 140% at 0% 0%,
            color-mix(in srgb, #f5b042 14%, transparent),
            color-mix(in srgb, #b07cff 8%, transparent) 45%,
            transparent 75%
          ),
          var(--vp-card);
      }
      .title {
        flex: 1 1 240px;
      }
      .eyebrow {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      h1 {
        margin: 4px 0;
        font-size: 28px;
        font-weight: 500;
      }
      .small {
        font-size: 12px;
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .chip {
        background: var(--vp-raised);
        border-radius: 12px;
        padding: 10px 14px;
        min-width: 96px;
      }
      .chip-value {
        font-size: 18px;
        font-weight: 700;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 16px;
      }
      .category {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      header {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .badge {
        width: 34px;
        height: 34px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex: none;
      }
      .head-text {
        flex: 1;
        min-width: 0;
      }
      h2 {
        margin: 0;
        font-size: 15px;
        font-weight: 600;
      }
      .aggregate {
        font-weight: 700;
      }
      ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      li {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border-radius: 10px;
        background: var(--vp-raised);
      }
      li.unavailable {
        opacity: 0.55;
      }
      .leaf-text {
        flex: 1;
        min-width: 0;
      }
      .leaf-name {
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .value {
        font-size: 13px;
        min-width: 64px;
        text-align: right;
      }
      .empty {
        padding: 24px;
      }
    `,
  ];
}
