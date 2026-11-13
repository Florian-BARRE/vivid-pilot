// ====== Code Summary ======
// VividPilotLeafEditor: the sheet of one entity — category (with what was
// detected), room (moves the device or just the entity), power (counted,
// upstream meter, strip voltage, nominal power) and membership of the
// parent nodes' groups and memories. Every change is sent right away;
// the integration answers with a new payload.

import { LitElement, html, nothing } from "lit";

import { renderIcon } from "../theme/icon";
import { sharedStyles, themeTokens } from "../theme/styles";
import { leafEditorStyles } from "./leaf-editor.styles";
import { CATEGORIES, reasonLabel } from "../tree/categories";
import type { PanelModel } from "../tree/panel-model";
import { nodeKey, type CategoryId, type NodeKey, type TreeLeaf } from "../tree/types";

const EDITABLE: CategoryId[] = [
  "light",
  "led",
  "switch",
  "door",
  "window",
  "presence",
  "temperature",
  "humidity",
  "pressure",
  "co2",
  "power",
];
const SWITCHABLE = new Set<CategoryId>(["light", "led", "switch"]);
const VOLTAGES = [5, 12, 24];

export class VividPilotLeafEditor extends LitElement {
  static override properties = {
    model: { attribute: false },
    entityId: { type: String },
    scope: { state: true },
    error: { state: true },
  };

  model?: PanelModel;
  entityId = "";
  scope: "device" | "entity" = "device";
  error = "";

  private close(): void {
    this.dispatchEvent(new CustomEvent("vp-close", { bubbles: true, composed: true }));
  }

  private async run(action: () => Promise<unknown>): Promise<void> {
    try {
      this.error = "";
      await action();
    } catch (error) {
      const message = (error as { message?: string }).message ?? String(error);
      this.error = message;
    }
  }

  protected override render() {
    const model = this.model;
    const place = model?.place(this.entityId);
    if (!model || !place) return nothing;
    const { leaf, room } = place;
    const live = model.aggregator.leaf(leaf, model.hass.states);
    const meta = CATEGORIES[leaf.category];
    return html`
      <div class="backdrop" @click=${this.close}></div>
      <section class="sheet card" role="dialog" aria-modal="true" aria-label=${leaf.name}>
        <header>
          <div class="badge" style="background: color-mix(in srgb, ${meta.color} 22%, transparent)">
            ${renderIcon(meta.icon, meta.color, 22)}
          </div>
          <div class="head-text">
            <h1>${leaf.name}</h1>
            <div class="mono">${leaf.entity_id}${leaf.platform ? ` · ${leaf.platform}` : ""}</div>
          </div>
          <div class="live">${live.text}</div>
          <button type="button" class="icon" aria-label="Fermer" @click=${this.close}>✕</button>
        </header>
        ${this.error ? html`<p class="error" role="alert">${this.error}</p>` : nothing}
        ${this.renderCategory(model, leaf)} ${this.renderRoom(model, leaf, room?.area_id ?? null)}
        ${SWITCHABLE.has(leaf.category) || leaf.category === "power" ? this.renderPower(model, leaf, room?.area_id ?? null) : nothing}
        ${SWITCHABLE.has(leaf.category) && room ? this.renderMembership(model, leaf, room.area_id) : nothing}
        <footer>
          <button type="button" @click=${() => this.run(() => model.api.resetLeaf(leaf.entity_id))}>
            Remettre en auto
          </button>
          <button type="button" class="primary" @click=${this.close}>Terminé</button>
        </footer>
      </section>
    `;
  }

  private renderCategory(model: PanelModel, leaf: TreeLeaf) {
    const pick = (category: CategoryId | null) =>
      this.run(() => model.api.setCategory(leaf.entity_id, category));
    return html`
      <fieldset>
        <legend>Catégorie</legend>
        <div class="choices">
          ${EDITABLE.map(
            (category) =>
              html`<button
                type="button"
                aria-pressed=${leaf.category === category ? "true" : "false"}
                class=${leaf.category === category ? "on" : ""}
                @click=${() => pick(category)}
              >
                ${renderIcon(CATEGORIES[category].icon, CATEGORIES[category].color, 15)}
                ${CATEGORIES[category].label}
              </button>`,
          )}
          <button
            type="button"
            aria-pressed=${leaf.category === "ignored" ? "true" : "false"}
            class=${leaf.category === "ignored" ? "on" : ""}
            @click=${() => pick("ignored")}
          >
            Ignorer
          </button>
        </div>
        <div class="hint">
          <span class="pill ${leaf.source === "manual" ? "manual" : ""}"
            >${leaf.source === "manual" ? "corrigé" : "auto"}</span
          >
          ${leaf.source === "manual" ? "Choisi à la main." : `Détecté : ${reasonLabel(leaf.reason)}.`}
          ${
            leaf.source === "manual"
              ? html`<button type="button" class="link" @click=${() => pick(null)}>
                  Revenir à la détection
                </button>`
              : nothing
          }
        </div>
      </fieldset>
    `;
  }

  private renderRoom(model: PanelModel, leaf: TreeLeaf, areaId: string | null) {
    const move = (event: Event) => {
      const value = (event.target as HTMLSelectElement).value || null;
      void this.run(() => model.api.moveLeaf(leaf.entity_id, value, this.scope));
    };
    return html`
      <fieldset>
        <legend>Pièce</legend>
        <div class="row">
          <select aria-label="Pièce" @change=${move}>
            <option value="" ?selected=${areaId === null}>Sans pièce</option>
            ${model
              .areas()
              .map(
                (area) =>
                  html`<option value=${area.id} ?selected=${area.id === areaId}>
                    ${area.name}
                  </option>`,
              )}
          </select>
          ${
            leaf.device_id
              ? html`<label class="radio"
                    ><input
                      type="radio"
                      name="scope"
                      .checked=${this.scope === "device"}
                      @change=${() => (this.scope = "device")}
                    />
                    Tout l'appareil</label
                  >
                  <label class="radio"
                    ><input
                      type="radio"
                      name="scope"
                      .checked=${this.scope === "entity"}
                      @change=${() => (this.scope = "entity")}
                    />
                    Cette entité seulement</label
                  >`
              : nothing
          }
        </div>
        <div class="hint">
          La pièce est la zone de l'appareil dans Home Assistant : la changer ici la change dans HA.
        </div>
      </fieldset>
    `;
  }

  private renderPower(model: PanelModel, leaf: TreeLeaf, areaId: string | null) {
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
    return html`
      <fieldset>
        <legend>Puissance</legend>
        ${
          sources.length
            ? html`<ul class="sources">
                ${sources.map(
                  (source) =>
                    html`<li>
                      <span
                        >${source.kind === "measured" ? "Mesurée" : source.kind === "wled" ? `Calculée WLED (${source.factor} V)` : "Nominale"}</span
                      >
                      <span class="mono">${source.entity_id}</span>
                      <strong>${fmt(source.value)}</strong>
                      ${source.counted ? nothing : html`<span class="pill">hors total</span>`}
                    </li>`,
                )}
              </ul>`
            : html`<div class="hint">Aucune puissance connue pour l'instant.</div>`
        }
        ${
          choice
            ? html`<div class="row">
                  <span class="label">Source de la puissance</span>
                  ${(["auto", ...choice.available] as const).map(
                    (kind) =>
                      html`<button
                        type="button"
                        class=${choice.chosen === kind ? "on" : ""}
                        aria-pressed=${choice.chosen === kind ? "true" : "false"}
                        @click=${() => set("power_source", kind === "auto" ? null : kind)}
                      >
                        ${kind === "auto" ? `Auto (${labels[choice.effective]})` : labels[kind]}
                      </button>`,
                  )}
                </div>
                <div class="hint">
                  Auto : la mesure d'un capteur de l'appareil si elle existe, sinon le calcul WLED,
                  sinon la puissance nominale. Choisir une autre source que la mesure retire ce
                  capteur des totaux.
                </div>`
            : nothing
        }
        ${
          effective === "wled"
            ? html`<div class="row">
                <span class="label">Tension du bandeau</span>
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
              </div>`
            : nothing
        }
        ${
          effective === "nominal" || choice?.chosen === "nominal"
            ? html`<label class="row"
                ><span class="label">Puissance nominale</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  .value=${options.nominal_power?.toString() ?? ""}
                  placeholder="W"
                  @change=${(event: Event) => {
                    const raw = (event.target as HTMLInputElement).value;
                    void set("nominal_power", raw === "" ? null : Number(raw));
                  }}
                />
                <span class="muted">W quand c'est allumé</span></label
              >`
            : nothing
        }
        <label class="row check"
          ><input
            type="checkbox"
            .checked=${options.counted !== false}
            @change=${(event: Event) => set("counted", (event.target as HTMLInputElement).checked ? null : false)}
          />
          Compté dans les totaux</label
        >
        <label class="row"
          ><span class="label">Déjà mesuré par</span>
          <select
            @change=${(event: Event) => set("upstream", (event.target as HTMLSelectElement).value || null)}
          >
            <option value="" ?selected=${!options.upstream}>Rien (branché directement)</option>
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
        <div class="hint">
          Si une prise mesure déjà cet appareil, choisis-la : il sort des totaux pour ne pas compter
          deux fois.
        </div>
      </fieldset>
    `;
  }

  private renderMembership(model: PanelModel, leaf: TreeLeaf, areaId: string) {
    const parents: Array<[NodeKey, string]> = [
      [
        nodeKey(areaId, leaf.category),
        `${model.room(areaId)?.name} · ${CATEGORIES[leaf.category].label}`,
      ],
      [nodeKey(areaId), model.room(areaId)?.name ?? areaId],
      ["all", "Maison"],
    ];
    const toggle = (
      key: NodeKey,
      list: "group_excluded" | "memory_excluded",
      included: boolean,
    ) => {
      const settings = model.node(key)?.settings;
      if (!settings) return;
      const current = new Set(settings[list]);
      if (included) current.delete(leaf.entity_id);
      else current.add(leaf.entity_id);
      void this.run(() => model.api.updateNode(key, { [list]: [...current] }));
    };
    return html`
      <fieldset>
        <legend>Groupes et mémoires</legend>
        <div class="hint">
          « Groupe » : ce que le nœud allume et éteint. « Mémoire » : ce qu'il rétablit.
        </div>
        ${parents
          .filter(([key]) => model.node(key))
          .map(([key, label]) => {
            const settings = model.node(key)!.settings;
            return html`<div class="member">
              <span class="name">${label}</span>
              <label class="check"
                ><input
                  type="checkbox"
                  .checked=${!settings.group_excluded.includes(leaf.entity_id)}
                  @change=${(e: Event) => toggle(key, "group_excluded", (e.target as HTMLInputElement).checked)}
                />Groupe</label
              >
              <label class="check"
                ><input
                  type="checkbox"
                  .checked=${!settings.memory_excluded.includes(leaf.entity_id)}
                  @change=${(e: Event) => toggle(key, "memory_excluded", (e.target as HTMLInputElement).checked)}
                />Mémoire</label
              >
            </div>`;
          })}
      </fieldset>
    `;
  }

  static override styles = [themeTokens, sharedStyles, leafEditorStyles];
}
