// ====== Code Summary ======
// VividPilotPowerSources: the "Sources de puissance" card of a node view. It
// lists every power source feeding the node's total — measured meters, WLED
// estimates (current × voltage) and nominal powers — with its live value and
// whether it is counted, so computed values are visible next to the meters.

import { LitElement, css, html, nothing } from "lit";

import { renderIcon } from "../theme/icon";
import { sharedStyles, themeTokens } from "../theme/styles";
import { CATEGORIES } from "../tree/categories";
import type { PanelModel } from "../tree/panel-model";
import type { CategoryId, PowerSourceInfo } from "../tree/types";

const KIND_LABELS: Record<PowerSourceInfo["kind"], string> = {
  measured: "Mesurée",
  wled: "WLED calculée",
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

  /** Sources of the node: all of the area, or of one consumer category. */
  private sources(model: PanelModel): PowerSourceInfo[] {
    return model.payload.power.filter(
      (source) =>
        (this.areaId === null || source.area_id === this.areaId) &&
        (this.category === null || this.category === "power" || source.category === this.category),
    );
  }

  /** Live value: meters and strips are read from their states, nominal is fixed. */
  private value(model: PanelModel, source: PowerSourceInfo): number | null {
    if (source.kind === "measured") {
      const raw = model.number(source.entity_id);
      return raw === null ? null : raw * source.factor;
    }
    if (source.kind === "wled") return model.stripPower(source.leaf_id) ?? source.value;
    return source.value;
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
          <h2>Sources de puissance</h2>
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
                    >${this.areaId === null ? `${place?.room?.name ?? ""} · ` : ""}${source.entity_id}</span
                  >
                </span>
                <span class="pill kind-${source.kind}">${KIND_LABELS[source.kind]}</span>
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
