// ====== Code Summary ======
// VividPilotPanel: the sidebar panel. It subscribes to the live tree, keeps
// the current selection (home, a room, unassigned or ignored entities) and
// lays out the tree sidebar next to the selected node's view. Module tabs
// other than "Arbre" are placeholders until their phase lands.

import { LitElement, css, html, type PropertyValues } from "lit";

import { PilotApi } from "../api/pilot-api";
import { sharedStyles, themeTokens } from "../theme/styles";
import { CATEGORIES } from "../tree/categories";
import { LiveAggregator, type RoomSummary } from "../tree/live-aggregator";
import type { CategoryNode, HomeTree, TreeLeaf } from "../tree/types";
import type { HomeAssistant } from "../types/home-assistant";

const TABS = ["Arbre", "Mémoire", "Automatisations", "Utilitaires"];

interface NodeView {
  eyebrow: string;
  heading: string;
  note: string;
  categories: CategoryNode[];
  summary: RoomSummary | null;
}

export class VividPilotPanel extends LitElement {
  static override properties = {
    hass: { attribute: false },
    narrow: { type: Boolean },
    tree: { state: true },
    selected: { state: true },
    error: { state: true },
  };

  hass?: HomeAssistant;
  narrow = false;
  tree?: HomeTree;
  selected = "home";
  error = "";

  private aggregator?: LiveAggregator;
  private unsubscribe?: Promise<() => Promise<void>>;

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.hass && !this.unsubscribe) this.subscribe(this.hass);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    void this.unsubscribe?.then((stop) => stop());
    this.unsubscribe = undefined;
  }

  protected override updated(changed: PropertyValues): void {
    // The frontend sets hass after creation: subscribe once it is there.
    if (changed.has("hass") && this.hass) {
      if (!this.aggregator) this.aggregator = new LiveAggregator(this.hass.language || "fr");
      if (!this.unsubscribe) this.subscribe(this.hass);
    }
  }

  private subscribe(hass: HomeAssistant): void {
    const subscription = new PilotApi(hass).subscribeTree((tree) => {
      this.tree = tree;
      this.error = "";
    });
    this.unsubscribe = subscription;
    subscription.catch((error: unknown) => {
      this.error = error instanceof Error ? error.message : String(error);
      this.unsubscribe = undefined;
    });
  }

  private onSelect(event: CustomEvent<string>): void {
    this.selected = event.detail;
  }

  protected override render() {
    return html`
      <header>
        <div class="brand">
          <div class="logo" aria-hidden="true"></div>
          <span>Vivid Pilot</span>
        </div>
        <nav aria-label="Modules">
          ${TABS.map(
            (tab, index) =>
              html`<span
                class="tab ${index === 0 ? "active" : ""}"
                aria-current=${index === 0 ? "page" : "false"}
                title=${index === 0 ? "" : "Bientôt"}
                >${tab}</span
              >`,
          )}
        </nav>
      </header>
      ${this.renderBody()}
    `;
  }

  private renderBody() {
    if (this.error) return html`<p class="message">Erreur : ${this.error}</p>`;
    if (!this.hass || !this.tree || !this.aggregator) {
      return html`<p class="message muted">Chargement…</p>`;
    }
    const view = this.view(this.tree);
    return html`
      <div class="layout">
        <aside>
          <vivid-pilot-tree
            .hass=${this.hass}
            .tree=${this.tree}
            .aggregator=${this.aggregator}
            selected=${this.selected}
            @vp-select=${this.onSelect}
          ></vivid-pilot-tree>
        </aside>
        <main>
          <vivid-pilot-room
            .hass=${this.hass}
            .aggregator=${this.aggregator}
            heading=${view.heading}
            eyebrow=${view.eyebrow}
            note=${view.note}
            .categories=${view.categories}
            .summary=${view.summary}
          ></vivid-pilot-room>
        </main>
      </div>
    `;
  }

  private view(tree: HomeTree): NodeView {
    const states = this.hass!.states;
    if (this.selected.startsWith("room:")) {
      const room = tree.rooms.find((item) => `room:${item.area_id}` === this.selected);
      if (room) {
        return {
          eyebrow: "Maison › Pièce",
          heading: room.name,
          note: "",
          categories: room.categories,
          summary: this.aggregator!.room(room, states),
        };
      }
    }
    if (this.selected === "unassigned") {
      return {
        eyebrow: "À ranger",
        heading: "Sans pièce",
        note: "Ces appareils n'ont pas de zone dans Home Assistant : donne-leur une pièce pour qu'ils entrent dans l'arbre.",
        categories: this.byCategory(tree.unassigned),
        summary: null,
      };
    }
    if (this.selected === "ignored") {
      return {
        eyebrow: "Exclus",
        heading: "Ignorés",
        note: "Mis de côté à la main : ils n'entrent dans aucun groupe ni total.",
        categories: [{ category: "ignored", leaves: tree.ignored }],
        summary: null,
      };
    }
    // Home: every room's leaves, one card per category.
    const leaves = tree.rooms.flatMap((room) => room.categories.flatMap((node) => node.leaves));
    return {
      eyebrow: "Tout",
      heading: "Maison",
      note: `${tree.rooms.length} pièce(s)`,
      categories: this.byCategory(leaves),
      summary: this.aggregator!.home(tree, states),
    };
  }

  private byCategory(leaves: TreeLeaf[]): CategoryNode[] {
    const order = Object.keys(CATEGORIES) as CategoryNode["category"][];
    return order
      .map((category) => ({
        category,
        leaves: leaves.filter((leaf) => leaf.category === category),
      }))
      .filter((node) => node.leaves.length > 0);
  }

  static override styles = [
    themeTokens,
    sharedStyles,
    css`
      :host {
        display: block;
        min-height: 100vh;
        background: var(--vp-bg);
      }
      header {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 16px;
        padding: 12px 24px;
        border-bottom: 1px solid var(--vp-divider);
        background: var(--app-header-background-color, var(--vp-card));
        color: var(--app-header-text-color, var(--vp-text));
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 18px;
        font-weight: 500;
      }
      .logo {
        width: 28px;
        height: 28px;
        border-radius: 9px;
        background: radial-gradient(circle at 30% 30%, #ffd58a, #f5b042 45%, #b07cff);
        box-shadow: 0 0 16px rgba(245, 176, 66, 0.45);
      }
      nav {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      .tab {
        padding: 8px 14px;
        border-radius: 999px;
        opacity: 0.7;
      }
      .tab.active {
        opacity: 1;
        font-weight: 700;
        background: var(--vp-selected);
      }
      .layout {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        padding: 20px 24px;
        max-width: 1440px;
        margin: 0 auto;
        box-sizing: border-box;
      }
      aside {
        flex: 1 1 280px;
        max-width: 360px;
      }
      main {
        flex: 999 1 560px;
        min-width: 0;
      }
      .message {
        padding: 24px;
      }
    `,
  ];
}
