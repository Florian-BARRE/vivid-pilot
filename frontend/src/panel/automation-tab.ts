// ====== Code Summary ======
// VividPilotAutomationTab: presence lighting, room by room. For each room
// with presence sensors and lights: on / off, delay before turning off, the
// sensors used and the generated switch. Rooms without presence sensors are
// listed with what is missing.

import { LitElement, css, html, nothing } from "lit";

import { sharedStyles, themeTokens } from "../theme/styles";
import type { PanelModel } from "../tree/panel-model";

export class VividPilotAutomationTab extends LitElement {
  static override properties = { model: { attribute: false } };

  model?: PanelModel;

  protected override render() {
    const model = this.model;
    if (!model) return nothing;
    const rooms = model.rooms;
    const ready = rooms.filter((room) => model.payload.presence[room.area_id]?.available);
    const missing = rooms.filter((room) => !model.payload.presence[room.area_id]?.available);
    return html`
      <section class="card head">
        <h1>Éclairage automatique</h1>
        <p class="muted">
          Quand quelqu'un entre dans une pièce éteinte, elle se rallume dans son dernier état
          mémorisé. Quand elle est vide depuis le délai choisi, ses lumières s'éteignent. Désactivé
          par défaut, pièce par pièce.
        </p>
      </section>
      ${ready.map((room) => {
        const presence = model.payload.presence[room.area_id];
        return html`<section class="card room">
          <div class="who">
            <h2>${room.name}</h2>
            <div class="muted small">
              Capteurs : ${presence.sensors.map((id) => model.stateName(id)).join(", ")}
            </div>
            <div class="mono">${model.generated(room.area_id, "switch:auto_lighting") ?? ""}</div>
          </div>
          <label class="check"
            >Éteindre après
            <input
              type="number"
              min="1"
              max="240"
              .value=${String(presence.delay)}
              @change=${(e: Event) =>
                model.api.updatePresence(room.area_id, {
                  delay: Number((e.target as HTMLInputElement).value),
                })}
            />
            min sans présence</label
          >
          <label class="check"
            ><input
              type="checkbox"
              role="switch"
              .checked=${presence.enabled}
              @change=${(e: Event) =>
                model.api.updatePresence(room.area_id, {
                  enabled: (e.target as HTMLInputElement).checked,
                })}
            />
            ${presence.enabled ? "Activé" : "Désactivé"}</label
          >
        </section>`;
      })}
      ${
        missing.length
          ? html`<section class="card missing">
              <h2>Pièces sans capteur de présence</h2>
              <p class="muted small">
                Ajoute un capteur de mouvement ou de présence à la zone de la pièce (ou reclasse-en
                un dans l'arbre) pour y activer l'éclairage automatique.
              </p>
              <div class="chips">
                ${missing.map((room) => html`<span class="pill">${room.name}</span>`)}
              </div>
            </section>`
          : nothing
      }
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
      }
      h1 {
        margin: 0 0 4px;
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
      .room {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 16px;
      }
      .who {
        flex: 1 1 260px;
        min-width: 0;
      }
      .small {
        font-size: 12px;
      }
      .check {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 44px;
      }
      input[type="number"] {
        width: 64px;
        min-height: 36px;
        border-radius: 8px;
        border: 1px solid var(--vp-divider);
        background: var(--vp-card);
        color: var(--vp-text);
        padding: 0 8px;
        font: inherit;
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }
    `,
  ];
}
