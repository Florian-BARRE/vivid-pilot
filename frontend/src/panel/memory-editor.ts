// ====== Code Summary ======
// VividPilotMemoryEditor: the settings of one node's memory — which
// categories it covers, and for each detected member whether the node's
// group drives it and whether its memory restores it.

import { LitElement, css, html, nothing } from "lit";

import { sharedStyles, themeTokens } from "../theme/styles";
import { CATEGORIES } from "../tree/categories";
import type { PanelModel } from "../tree/panel-model";
import { parseNodeKey, type CategoryId, type NodeKey, type TreeLeaf } from "../tree/types";

const CAPABLE: CategoryId[] = ["light", "led", "switch"];

export class VividPilotMemoryEditor extends LitElement {
  static override properties = {
    model: { attribute: false },
    node: { type: String },
  };

  model?: PanelModel;
  node: NodeKey = "all";

  private close(): void {
    this.dispatchEvent(new CustomEvent("vp-close", { bubbles: true, composed: true }));
  }

  private leaves(model: PanelModel): TreeLeaf[] {
    const { areaId, category } = parseNodeKey(this.node);
    const rooms = areaId ? model.rooms.filter((room) => room.area_id === areaId) : model.rooms;
    return rooms.flatMap((room) =>
      room.categories
        .filter(
          (node) => CAPABLE.includes(node.category) && (!category || node.category === category),
        )
        .flatMap((node) => node.leaves),
    );
  }

  protected override render() {
    const model = this.model;
    const info = model?.node(this.node);
    if (!model || !info) return nothing;
    const settings = info.settings;
    const { areaId, category } = parseNodeKey(this.node);
    const title = `${areaId ? (model.room(areaId)?.name ?? areaId) : "Maison"}${category ? ` · ${CATEGORIES[category].label}` : ""}`;
    const update = (patch: Parameters<PanelModel["api"]["updateNode"]>[1]) =>
      model.api.updateNode(this.node, patch);
    const toggleList = (
      list: "group_excluded" | "memory_excluded",
      entityId: string,
      included: boolean,
    ) => {
      const next = new Set(settings[list]);
      if (included) next.delete(entityId);
      else next.add(entityId);
      void update({ [list]: [...next] });
    };
    const toggleCategory = (value: CategoryId, on: boolean) => {
      const next = new Set(settings.memory_categories);
      if (on) next.add(value);
      else next.delete(value);
      void update({ memory_categories: [...next] });
    };
    return html`
      <div class="backdrop" @click=${this.close}></div>
      <section class="sheet card" role="dialog" aria-modal="true" aria-label=${`Mémoire ${title}`}>
        <header>
          <div>
            <div class="muted eyebrow">Mémoire</div>
            <h1>${title}</h1>
            <div class="mono">${model.generated(this.node, "scene:state") ?? ""}</div>
          </div>
          <button type="button" class="icon" aria-label="Fermer" @click=${this.close}>✕</button>
        </header>
        <label class="check"
          ><input
            type="checkbox"
            role="switch"
            .checked=${settings.memory_enabled}
            @change=${(e: Event) => update({ memory_enabled: (e.target as HTMLInputElement).checked })}
          />
          Mémoire active</label
        >
        ${
          category
            ? nothing
            : html`<fieldset>
                <legend>Ce que la mémoire couvre</legend>
                <div class="chips">
                  ${CAPABLE.map(
                    (value) =>
                      html`<label
                        class="chip ${settings.memory_categories.includes(value) ? "on" : ""}"
                        ><input
                          type="checkbox"
                          .checked=${settings.memory_categories.includes(value)}
                          @change=${(e: Event) => toggleCategory(value, (e.target as HTMLInputElement).checked)}
                        />
                        ${CATEGORIES[value].label}</label
                      >`,
                  )}
                </div>
              </fieldset>`
        }
        <fieldset>
          <legend>Membres détectés</legend>
          <div class="hint">
            « Groupe » : ce que ce nœud allume et éteint. « Mémoire » : ce qu'il rétablit.
          </div>
          <div class="table" role="table">
            <div class="tr th" role="row">
              <span>Appareil</span><span>Catégorie</span><span>Groupe</span><span>Mémoire</span>
            </div>
            ${this.leaves(model).map((leaf) => {
              const coveredCategory =
                category !== null || settings.memory_categories.includes(leaf.category);
              return html`<div class="tr" role="row">
                <span class="name">${leaf.name}</span>
                <span class="muted">${CATEGORIES[leaf.category].label}</span>
                <span
                  ><input
                    type="checkbox"
                    aria-label="Dans le groupe"
                    .checked=${!settings.group_excluded.includes(leaf.entity_id)}
                    @change=${(e: Event) => toggleList("group_excluded", leaf.entity_id, (e.target as HTMLInputElement).checked)}
                /></span>
                <span
                  ><input
                    type="checkbox"
                    aria-label="Dans la mémoire"
                    ?disabled=${!coveredCategory}
                    .checked=${coveredCategory && !settings.memory_excluded.includes(leaf.entity_id)}
                    @change=${(e: Event) => toggleList("memory_excluded", leaf.entity_id, (e.target as HTMLInputElement).checked)}
                /></span>
              </div>`;
            })}
          </div>
        </fieldset>
        <footer>
          <button type="button" @click=${() => model.api.memory("forget", this.node)}>
            Oublier
          </button>
          <button type="button" @click=${() => model.api.memory("save", this.node)}>
            Mémoriser maintenant
          </button>
          <button
            type="button"
            class="primary"
            @click=${() => model.api.memory("restore", this.node)}
          >
            Rétablir
          </button>
        </footer>
      </section>
    `;
  }

  static override styles = [
    themeTokens,
    sharedStyles,
    css`
      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        z-index: 10;
      }
      .sheet {
        position: fixed;
        z-index: 11;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: min(760px, calc(100vw - 24px));
        max-height: calc(100vh - 48px);
        overflow: auto;
        padding: 18px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
      }
      .eyebrow {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      h1 {
        margin: 2px 0;
        font-size: 22px;
        font-weight: 500;
      }
      fieldset {
        border: 1px solid var(--vp-divider);
        border-radius: 12px;
        padding: 12px;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      legend {
        font-weight: 600;
        padding: 0 6px;
      }
      .hint {
        font-size: 12px;
        color: var(--vp-muted);
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .chip,
      .check {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 44px;
        cursor: pointer;
      }
      .chip {
        padding: 0 14px;
        border-radius: 999px;
        border: 1px solid var(--vp-divider);
        background: var(--vp-raised);
      }
      .chip.on {
        border-color: var(--vp-primary);
        background: var(--vp-selected);
      }
      .table {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .tr {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 110px 70px 70px;
        gap: 8px;
        align-items: center;
        min-height: 40px;
        padding: 0 10px;
        border-radius: 10px;
        background: var(--vp-raised);
      }
      .tr.th {
        background: none;
        font-size: 12px;
        color: var(--vp-muted);
        min-height: 24px;
      }
      .name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      input[type="checkbox"] {
        width: 18px;
        height: 18px;
      }
      button {
        min-height: 40px;
        padding: 0 14px;
        border-radius: 10px;
        border: 1px solid var(--vp-divider);
        background: var(--vp-raised);
        cursor: pointer;
      }
      button.primary {
        border: 0;
        background: var(--vp-primary);
        color: var(--text-primary-color, #fff);
        font-weight: 600;
      }
      button.icon {
        width: 40px;
        padding: 0;
      }
      footer {
        display: flex;
        justify-content: flex-end;
        flex-wrap: wrap;
        gap: 8px;
      }
    `,
  ];
}
