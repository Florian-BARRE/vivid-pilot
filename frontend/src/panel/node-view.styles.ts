// ====== Code Summary ======
// Styles of the node view element (kept apart to keep each file short).

import { css } from "lit";

export const nodeViewStyles = css`
  :host {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .hero {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 16px 20px;
    padding: 20px 22px;
    background:
      radial-gradient(
        120% 140% at 0% 0%,
        color-mix(in srgb, #ff5f6d 12%, transparent),
        color-mix(in srgb, #8a3ffc 8%, transparent) 45%,
        transparent 75%
      ),
      var(--vp-card);
  }
  .title {
    flex: 1 1 260px;
    min-width: 0;
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
  .memory-line {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 8px;
    min-width: 0;
  }
  .bar {
    width: 72px;
    height: 8px;
    border-radius: 999px;
    flex: none;
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
    white-space: nowrap;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .actions button {
    height: 44px;
    padding: 0 16px;
    border-radius: 12px;
    border: 1px solid var(--vp-divider);
    background: var(--vp-raised);
    cursor: pointer;
  }
  .actions button.primary {
    border: 0;
    background: var(--vp-primary);
    color: var(--text-primary-color, #fff);
    font-weight: 600;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 16px;
  }
  .grid.single {
    grid-template-columns: minmax(0, 1fr);
  }
  .category {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }
  .card-head {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px;
    border: 0;
    border-radius: 12px;
    background: transparent;
    text-align: left;
    width: 100%;
  }
  .card-head.link {
    cursor: pointer;
  }
  .card-head.link:hover {
    background: var(--vp-raised);
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
  .leaf {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 52px;
    padding: 6px 10px;
    border: 0;
    border-radius: 10px;
    background: var(--vp-raised);
    cursor: pointer;
    text-align: left;
    box-sizing: border-box;
  }
  .leaf:hover {
    outline: 2px solid color-mix(in srgb, var(--vp-primary) 40%, transparent);
  }
  .leaf.unavailable {
    opacity: 0.55;
  }
  .leaf-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .leaf-name,
  .leaf-text .mono {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .leaf-name {
    font-weight: 500;
  }
  .pill {
    flex: none;
  }
  .value {
    flex: none;
    font-size: 13px;
    min-width: 64px;
    text-align: right;
  }
  .empty {
    padding: 24px;
  }
`;
