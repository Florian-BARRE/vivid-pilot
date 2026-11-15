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
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin-top: 10px;
    padding: 5px 10px 5px 9px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--vp-card) 70%, transparent);
    border: 1px solid var(--vp-divider);
    color: var(--vp-muted);
    font-size: 12px;
    cursor: default;
  }
  .memory-line.off {
    opacity: 0.7;
  }
  .swatch {
    width: 34px;
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
    display: flex;
    align-items: center;
    gap: 10px;
    background: color-mix(in srgb, var(--vp-card) 75%, transparent);
    border: 1px solid var(--vp-divider);
    border-radius: 14px;
    padding: 10px 14px 10px 10px;
  }
  .chip-icon {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--accent) 16%, transparent);
    flex: none;
  }
  .chip-value {
    font-size: 17px;
    font-weight: 700;
    white-space: nowrap;
    line-height: 1.2;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .actions {
    flex-basis: 100%;
  }
  .actions button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 16px 0 13px;
    border-radius: 12px;
    border: 1px solid var(--vp-divider);
    background: var(--vp-card);
    cursor: pointer;
    font-weight: 500;
    transition:
      background 0.15s ease,
      transform 0.1s ease;
  }
  .actions button:hover {
    background: var(--vp-raised);
  }
  .actions button:active {
    transform: scale(0.97);
  }
  .actions button.primary {
    border: 0;
    background: var(--vp-primary);
    color: var(--text-primary-color, #fff);
    font-weight: 600;
    box-shadow: 0 4px 14px color-mix(in srgb, var(--vp-primary) 35%, transparent);
  }
  .actions button.primary:hover {
    background: color-mix(in srgb, var(--vp-primary) 88%, black);
  }
  .actions button.icon-only {
    width: 40px;
    padding: 0;
    justify-content: center;
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
    gap: 6px;
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
    font-size: 13px;
    white-space: nowrap;
    padding: 4px 10px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent) 14%, transparent);
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
    gap: 12px;
    width: 100%;
    min-height: 48px;
    padding: 6px 12px 6px 8px;
    border: 0;
    border-radius: 12px;
    background: transparent;
    cursor: pointer;
    text-align: left;
    box-sizing: border-box;
    transition: background 0.15s ease;
  }
  .leaf:hover {
    background: var(--vp-raised);
  }
  .leaf:focus-visible {
    outline: 2px solid var(--vp-primary);
  }
  .leaf.unavailable {
    opacity: 0.5;
  }
  .leaf-icon {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    transition:
      background 0.2s ease,
      box-shadow 0.2s ease;
  }
  .leaf.lit .leaf-icon {
    background: var(--glow);
    box-shadow: 0 0 14px color-mix(in srgb, var(--glow) 70%, transparent);
  }
  .leaf-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .leaf-name {
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .fixed {
    flex: none;
    display: flex;
    width: 24px;
    height: 24px;
    border-radius: 8px;
    align-items: center;
    justify-content: center;
    color: var(--vp-warning);
    background: color-mix(in srgb, var(--vp-warning) 16%, transparent);
  }
  .value {
    flex: none;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-size: 13px;
    min-width: 56px;
    color: var(--vp-muted);
  }
  .value .on {
    color: var(--vp-text);
    font-weight: 600;
  }
  .empty {
    padding: 24px;
  }
`;
