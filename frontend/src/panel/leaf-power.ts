// ====== Code Summary ======
// VividPilotLeafPower: the power block of the entity sheet — where the power
// of a light, LED strip or plug comes from (its meter, the WLED estimate, a
// nominal power), the strip voltage, the meter upstream and whether it counts
// in the totals. Every change is sent right away; a failure shows as a toast.

import { LitElement, css, html, nothing } from "lit";

import { renderIcon } from "../theme/icon";
import { sharedStyles, themeTokens } from "../theme/styles";
import { UI_ICONS } from "../theme/ui-icons";
import type { PanelModel } from "../tree/panel-model";
import type { TreeLeaf } from "../tree/types";
import { leafEditorStyles } from "./leaf-editor.styles";

const VOLTAGES = [5, 12, 24];

export class VividPilotLeafPower extends LitElement {
  static override properties = {
    model: { attribute: false },
    leaf: { attribute: false },
    areaId: { attribute: false },
  };

  model?: PanelModel;
  leaf?: TreeLeaf;
  areaId: string | null = null;

  private async run(action: () => Promise<unknown>): Promise<void> {
    try {
      await action();
    } catch (error) {
      const message = (error as { message?: string }).message ?? String(error);
      this.dispatchEvent(
        new CustomEvent("vp-toast", { detail: message, bubbles: true, composed: true }),
      );
    }
  }

  protected override render() {
    const { model, leaf, areaId } = this;
    if (!model || !leaf) return nothing;
    const options = leaf.options ?? {};
    const sources = model.sourcesFor(leaf);
    const set = (
      name: "nominal_power" | "voltage" | "upstream" | "counted" | "power_source",
      value: unknown,
    ) => this.run(() => model.api.setOptions(leaf.entity_id, { [name]: value as never }));
    const choice = model.payload.power_choices?.[leaf.entity_id];
    const effective = choice?.effective;
    const labels: Record<string, string> = {
      measured: "Mesure existante",
      wled: "Calcul WLED",
      nominal: "Nominale",
      none: "Aucune",
    };
    const meters = areaId
      ? model.meters(areaId).filter((meter) => meter.entity_id !== leaf.entity_id)
      : [];
    const fmt = (value: number | null) =>
      value === null ? "—" : `${model.aggregator.formatNumber(value)} W`;
    const sourceLabel = (kind: string, factor: number) =>
      kind === "measured" ? "Mesurée" : kind === "wled" ? `WLED · ${factor} V` : "Nominale";
    return html`
      <section class="block">
        <h2>${renderIcon(UI_ICONS.bolt, "currentColor", 16)} Puissance</h2>
        ${
          sources.length
            ? html`<ul class="sources">
                ${sources.map(
                  (source) =>
                    html`<li class=${source.counted ? "" : "off"} title=${source.entity_id}>
                      <span class="kind">${sourceLabel(source.kind, source.factor)}</span>
                      <span class="mono">${source.entity_id}</span>
                      ${source.counted ? nothing : html`<span class="pill">hors total</span>`}
                      <strong>${fmt(source.value)}</strong>
                    </li>`,
                )}
              </ul>`
            : html`<div class="note">
                ${renderIcon(UI_ICONS.info, "currentColor", 14)} Aucune puissance connue pour
                l'instant.
              </div>`
        }
        ${
          choice
            ? html`<div class="field">
                <span class="label">Source</span>
                <div class="segmented wrap">
                  ${(["auto", ...choice.available] as const).map(
                    (kind) =>
                      html`<button
                        type="button"
                        class=${choice.chosen === kind ? "on" : ""}
                        aria-pressed=${choice.chosen === kind ? "true" : "false"}
                        title=${
                          kind === "auto"
                            ? "La mesure de l'appareil, sinon le calcul WLED, sinon la puissance nominale"
                            : ""
                        }
                        @click=${() => set("power_source", kind === "auto" ? null : kind)}
                      >
                        ${
                          kind === "auto"
                            ? html`${renderIcon(UI_ICONS.sparkle, "currentColor", 14)} Auto ·
                              ${labels[choice.effective]}`
                            : labels[kind]
                        }
                      </button>`,
                  )}
                </div>
              </div>`
            : nothing
        }
        ${
          effective === "wled"
            ? html`<div class="field">
                <span class="label">Tension du bandeau</span>
                <div class="segmented">
                  ${VOLTAGES.map(
                    (volts) =>
                      html`<button
                        type="button"
                        class=${(options.voltage ?? 5) === volts ? "on" : ""}
                        aria-pressed=${(options.voltage ?? 5) === volts ? "true" : "false"}
                        @click=${() => set("voltage", volts === 5 ? null : volts)}
                      >
                        ${volts} V
                      </button>`,
                  )}
                </div>
              </div>`
            : nothing
        }
        ${
          effective === "nominal" || choice?.chosen === "nominal"
            ? html`<label class="field"
                ><span class="label">Puissance allumé</span>
                <span class="unit"
                  ><input
                    type="number"
                    min="0"
                    step="0.5"
                    .value=${options.nominal_power?.toString() ?? ""}
                    placeholder="0"
                    @change=${(event: Event) => {
                      const raw = (event.target as HTMLInputElement).value;
                      void set("nominal_power", raw === "" ? null : Number(raw));
                    }}
                  />W</span
                ></label
              >`
            : nothing
        }
        <label class="field"
          ><span
            class="label"
            title="Si une prise mesure déjà cet appareil, il sort des totaux pour ne pas compter deux fois"
            >Déjà mesuré par</span
          >
          <select
            @change=${(event: Event) => set("upstream", (event.target as HTMLSelectElement).value || null)}
          >
            <option value="" ?selected=${!options.upstream}>Rien, branché directement</option>
            ${meters.map(
              (meter) =>
                html`<option
                  value=${meter.entity_id}
                  ?selected=${options.upstream === meter.entity_id}
                >
                  ${meter.name}
                </option>`,
            )}
          </select></label
        >
        <label class="field toggle"
          ><span class="label">Compté dans les totaux</span>
          <input
            type="checkbox"
            role="switch"
            class="switch"
            .checked=${options.counted !== false}
            @change=${(event: Event) => set("counted", (event.target as HTMLInputElement).checked ? null : false)}
          />
        </label>
      </section>
    `;
  }

  static override styles = [
    themeTokens,
    sharedStyles,
    leafEditorStyles,
    css`
      :host {
        display: block;
      }
    `,
  ];
}
