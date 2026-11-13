// ====== Code Summary ======
// VividPilotUtilitiesTab: maintenance tools — rescan the registries, see
// what Vivid Pilot generated (entities per kind) and the corrections made,
// with a way back to each corrected entity.

import { LitElement, css, html, nothing } from "lit";

import { sharedStyles, themeTokens } from "../theme/styles";
import { CATEGORIES } from "../tree/categories";
import type { PanelModel } from "../tree/panel-model";

export class VividPilotUtilitiesTab extends LitElement {
  static override properties = {
    model: { attribute: false },
    scanned: { state: true },
  };

  model?: PanelModel;
  scanned = false;

  protected override render() {
    const model = this.model;
    if (!model) return nothing;
    const generated = Object.values(model.payload.entities).flatMap((kinds) =>
      Object.values(kinds),
    );
    generated.push(...Object.values(model.payload.strips));
    const byDomain = new Map<string, number>();
    for (const entityId of generated) {
      const domain = entityId.split(".")[0];
      byDomain.set(domain, (byDomain.get(domain) ?? 0) + 1);
    }
    const leaves = [
      ...model.rooms.flatMap((room) => room.categories.flatMap((node) => node.leaves)),
      ...model.payload.tree.unassigned,
      ...model.payload.tree.ignored,
    ];
    const corrected = leaves.filter(
      (leaf) => leaf.source === "manual" || Object.keys(leaf.options ?? {}).length,
    );
    return html`
      <section class="card">
        <h1>Utilitaires</h1>
        <div class="row">
          <button
            type="button"
            class="primary"
            @click=${async () => {
              await model.api.rescan();
              this.scanned = true;
            }}
          >
            Rescanner les appareils
          </button>
          <span class="muted small"
            >${this.scanned ? "Scan relancé." : "L'arbre se met à jour tout seul ; à utiliser après une grosse réorganisation."}</span
          >
        </div>
        <div class="muted small">Vivid Pilot ${model.payload.version}</div>
      </section>
      <section class="card">
        <h2>Entités générées · ${generated.length}</h2>
        <div class="chips">
          ${[...byDomain.entries()].map(([domain, count]) => html`<span class="pill">${domain} · ${count}</span>`)}
        </div>
        <p class="muted small">
          Toutes commencent par <span class="mono">vivid_pilot_</span> et suivent l'arbre.
        </p>
      </section>
      <section class="card">
        <h2>Corrections · ${corrected.length}</h2>
        ${
          corrected.length === 0
            ? html`<p class="muted small">Aucune : tout vient de la détection automatique.</p>`
            : html`<ul>
                ${corrected.map(
                  (leaf) =>
                    html`<li>
                      <button
                        type="button"
                        class="leaf"
                        @click=${() =>
                          this.dispatchEvent(
                            new CustomEvent("vp-edit-leaf", {
                              detail: leaf.entity_id,
                              bubbles: true,
                              composed: true,
                            }),
                          )}
                      >
                        <span class="name">${leaf.name}</span>
                        <span class="muted small"
                          >${CATEGORIES[leaf.category].label}${Object.keys(leaf.options ?? {}).length ? ` · ${Object.keys(leaf.options ?? {}).join(", ")}` : ""}</span
                        >
                      </button>
                    </li>`,
                )}
              </ul>`
        }
      </section>
    `;
  }

  static override styles = [
    themeTokens,
    sharedStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .card {
        padding: 16px 18px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      h1 {
        margin: 0;
        font-size: 22px;
        font-weight: 500;
      }
      h2 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
      p {
        margin: 0;
      }
      .row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 12px;
      }
      .small {
        font-size: 12px;
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      button {
        min-height: 44px;
        padding: 0 16px;
        border-radius: 12px;
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
      ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .leaf {
        width: 100%;
        display: flex;
        justify-content: space-between;
        gap: 10px;
        text-align: left;
      }
      .name {
        font-weight: 500;
      }
    `,
  ];
}
