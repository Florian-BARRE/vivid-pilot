// ====== Code Summary ======
// VividPilotPowerSources: the "Puissance calculée" card of a node view. It
// lists the power Vivid Pilot computes itself, with no meter behind it — WLED
// estimates (current × voltage) and nominal powers — with its live value and
// whether it is counted. Measured meters already have their own card.

import { LitElement, css, html, nothing } from "lit";

import { renderIcon } from "../theme/icon";
import { sharedStyles, themeTokens } from "../theme/styles";
import { CATEGORIES } from "../tree/categories";
import type { PanelModel } from "../tree/panel-model";
import type { CategoryId, PowerSourceInfo } from "../tree/types";

type ComputedKind = Exclude<PowerSourceInfo["kind"], "measured">;

const KIND_LABELS: Record<ComputedKind, string> = {
  wled: "WLED",
  nominal: "Nominale",
};

export class VividPilotPowerSources extends LitElement {
  static override properties = {
    model: { attribute: false },
    areaId: { attribute: false },
    category: { attribute: false },
  };

  model?: PanelModel;
  areaId: string | null = null;
  category: CategoryId | null = null;

  /** Computed sources of the node: all of the area, or of one consumer category. */
  private sources(model: PanelModel): PowerSourceInfo[] {
    return model.payload.power.filter(
      (source) =>
        source.kind !== "measured" &&
        (this.areaId === null || source.area_id === this.areaId) &&
        (this.category === null || this.category === "power" || source.category === this.category),
    );
  }

  /** Live value: a strip reads its computed sensor, a nominal power follows its light. */
  private value(model: PanelModel, source: PowerSourceInfo): number | null {
    if (source.kind === "wled") return model.stripPower(source.leaf_id) ?? source.value;
    // Same rule as PowerModel.value: nominal watts scaled by brightness while on.
    const state = model.hass.states[source.entity_id];
    if (!state || state.state === "unavailable" || state.state === "unknown") return null;
    if (state.state !== "on") return 0;
    const brightness = Number(state.attributes.brightness);
    return source.factor * (Number.isFinite(brightness) ? brightness / 255 : 1);
  }

  /** Entity shown under the name: the generated strip sensor, else the consumer. */
  private shownEntity(model: PanelModel, source: PowerSourceInfo): string {
    return (
      (source.kind === "wled" ? model.payload.strips[source.leaf_id] : undefined) ?? source.leaf_id
    );
  }

  protected override render() {
    const model = this.model;
    if (!model) return nothing;
    const sources = this.sources(model);
    if (sources.length === 0) return nothing;
    const fmt = (value: number) => model.aggregator.formatNumber(value);
    const counted = sources
      .filter((source) => source.counted)
      .reduce((sum, source) => sum + (this.value(model, source) ?? 0), 0);
    return html`
      <section class="card">
        <div class="head">
          ${renderIcon(CATEGORIES.power.icon, CATEGORIES.power.color)}
          <h2>Puissance calculée</h2>
          <span class="total">${fmt(counted)} W comptés</span>
        </div>
        <ul>
          ${sources.map((source) => {
            const value = this.value(model, source);
            const place = model.place(source.leaf_id);
            return html`<li>
              <button
                type="button"
                class="row ${source.counted ? "" : "off"}"
                @click=${() =>
                  this.dispatchEvent(
                    new CustomEvent("vp-edit-leaf", {
                      detail: source.leaf_id,
                      bubbles: true,
                      composed: true,
                    }),
                  )}
              >
                <span class="text">
                  <span class="name">${place?.leaf.name ?? source.leaf_id}</span>
                  <span class="mono"
                    >${this.areaId === null ? `${place?.room?.name ?? ""} · ` : ""}${this.shownEntity(model, source)}</span
                  >
                </span>
                <span class="pill kind-${source.kind}"
                  >${KIND_LABELS[source.kind as ComputedKind]}</span
                >
                ${source.counted ? nothing : html`<span class="pill">hors total</span>`}
                <span class="value">${value === null ? "—" : `${fmt(value)} W`}</span>
              </button>
            </li>`;
          })}
        </ul>
      </section>
    `;
  }

  static override styles = [
    themeTokens,
    sharedStyles,
    css`
      .card {
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .head {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 4px;
      }
      h2 {
        margin: 0;
        flex: 1;
        font-size: 15px;
        font-weight: 600;
      }
      .total {
        font-weight: 700;
        white-space: nowrap;
      }
      ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        min-height: 48px;
        padding: 6px 10px;
        border: 0;
        border-radius: 10px;
        background: var(--vp-raised);
        cursor: pointer;
        text-align: left;
        box-sizing: border-box;
      }
      .row:hover {
        outline: 2px solid color-mix(in srgb, var(--vp-primary) 40%, transparent);
      }
      .row.off {
        opacity: 0.6;
      }
      .text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      .name,
      .text .mono {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .name {
        font-weight: 500;
      }
      .pill {
        flex: none;
      }
      .kind-wled {
        color: var(--vp-primary);
      }
      .value {
        flex: none;
        min-width: 64px;
        text-align: right;
        font-weight: 600;
      }
    `,
  ];
}
