// ====== Code Summary ======
// VividPilotMemoryEditor: the settings of one node's memory — which
// categories it covers, and for each detected member whether the node's
// group drives it and whether its memory restores it.

import { LitElement, css, html, nothing } from "lit";

import { renderIcon } from "../theme/icon";
import { sharedStyles, themeTokens } from "../theme/styles";
import { UI_ICONS } from "../theme/ui-icons";
import { leafEditorStyles } from "./leaf-editor.styles";
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
    const scene = model.generated(this.node, "scene:state") ?? "";
    return html`
      <div class="backdrop" @click=${this.close}></div>
      <section class="sheet card" role="dialog" aria-modal="true" aria-label=${`Mémoire ${title}`}>
        <header>
          <div class="badge" style="background: color-mix(in srgb, #8a3ffc 18%, transparent)">
            ${renderIcon(UI_ICONS.memory, "#8a3ffc", 22)}
          </div>
          <div class="head-text">
            <h1>Mémoire · ${title}</h1>
            <div class="mono">${scene}</div>
          </div>
          <input
            type="checkbox"
            role="switch"
            class="switch"
            title="Mémoire active"
            aria-label="Mémoire active"
            .checked=${settings.memory_enabled}
            @change=${(e: Event) => update({ memory_enabled: (e.target as HTMLInputElement).checked })}
          />
          <button type="button" class="icon" aria-label="Fermer" @click=${this.close}>
            ${renderIcon(UI_ICONS.close, "currentColor", 18)}
          </button>
        </header>
        ${
          category
            ? nothing
            : html`<section class="block">
                <h2>${renderIcon(UI_ICONS.layers, "currentColor", 16)} Ce qu'elle couvre</h2>
                <div class="choices">
                  ${CAPABLE.map((value) => {
                    const on = settings.memory_categories.includes(value);
                    const meta = CATEGORIES[value];
                    return html`<button
                      type="button"
                      class="chip ${on ? "on" : ""}"
                      style="--accent: ${meta.color}"
                      aria-pressed=${on ? "true" : "false"}
                      @click=${() => toggleCategory(value, !on)}
                    >
                      ${renderIcon(meta.icon, meta.color, 15)} ${meta.label}
                    </button>`;
                  })}
                </div>
              </section>`
        }
        <section class="block">
          <h2>${renderIcon(UI_ICONS.device, "currentColor", 16)} Membres</h2>
          <div class="members">
            <span></span>
            <span class="col" title="Ce que ce nœud allume et éteint">Groupe</span>
            <span class="col" title="Ce que ce nœud rétablit">Mémoire</span>
            ${this.leaves(model).map((leaf) => {
              const meta = CATEGORIES[leaf.category];
              const coveredCategory =
                category !== null || settings.memory_categories.includes(leaf.category);
              return html`<span class="name"
                  >${renderIcon(meta.icon, meta.color, 15)} ${leaf.name}</span
                >
                <input
                  type="checkbox"
                  role="switch"
                  class="switch"
                  aria-label=${`${leaf.name} : groupe`}
                  .checked=${!settings.group_excluded.includes(leaf.entity_id)}
                  @change=${(e: Event) => toggleList("group_excluded", leaf.entity_id, (e.target as HTMLInputElement).checked)}
                />
                <input
                  type="checkbox"
                  role="switch"
                  class="switch"
                  aria-label=${`${leaf.name} : mémoire`}
                  ?disabled=${!coveredCategory}
                  .checked=${coveredCategory && !settings.memory_excluded.includes(leaf.entity_id)}
                  @change=${(e: Event) => toggleList("memory_excluded", leaf.entity_id, (e.target as HTMLInputElement).checked)}
                />`;
            })}
          </div>
        </section>
        <footer>
          <span class="group">
            <button
              type="button"
              class="ghost"
              @click=${() => model.api.memory("forget", this.node)}
            >
              ${renderIcon(UI_ICONS.forget, "currentColor", 16)} Oublier
            </button>
            <button
              type="button"
              class="ghost"
              @click=${async () =>
                this.dispatchEvent(
                  new CustomEvent("vp-toast", {
                    detail: await model.saveMemory(this.node),
                    bubbles: true,
                    composed: true,
                  }),
                )}
            >
              ${renderIcon(UI_ICONS.save, "currentColor", 16)} Mémoriser
            </button>
          </span>
          <button
            type="button"
            class="primary"
            @click=${() => model.api.memory("restore", this.node)}
          >
            ${renderIcon(UI_ICONS.restore, "currentColor", 16)} Rétablir
          </button>
        </footer>
      </section>
    `;
  }

  static override styles = [
    themeTokens,
    sharedStyles,
    leafEditorStyles,
    css`
      .members .name {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      input.switch:disabled {
        opacity: 0.35;
        cursor: default;
      }
      footer .group {
        display: flex;
        gap: 4px;
      }
      button.primary {
        gap: 8px;
      }
    `,
  ];
}
