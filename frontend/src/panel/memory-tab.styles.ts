// ====== Code Summary ======
// Styles of the memory tab element (kept apart to keep each file short).

import { css } from "lit";

export const memoryTabStyles = css`
  :host {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 16px;
    padding: 16px 18px;
  }
  .title {
    flex: 1 1 260px;
  }
  h1 {
    margin: 0;
    font-size: 22px;
    font-weight: 500;
  }
  .filters {
    display: flex;
    gap: 4px;
    padding: 4px;
    border-radius: 999px;
    background: var(--vp-raised);
  }
  button {
    min-height: 40px;
    padding: 0 12px;
    border-radius: 10px;
    border: 1px solid var(--vp-divider);
    background: var(--vp-raised);
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .filters button {
    border: 0;
    border-radius: 999px;
    background: transparent;
  }
  .filters button.on {
    background: var(--vp-card);
    font-weight: 700;
  }
  button.primary {
    border: 0;
    background: var(--vp-primary);
    color: var(--text-primary-color, #fff);
    font-weight: 600;
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
  .list {
    padding: 6px;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    padding: 8px 10px;
    border-radius: 12px;
  }
  .row + .row {
    border-top: 1px solid var(--vp-divider);
  }
  .row.level-1 {
    padding-left: 30px;
  }
  .row.level-2 {
    padding-left: 54px;
  }
  .row.disabled {
    opacity: 0.6;
  }
  .switch {
    display: flex;
    align-items: center;
    min-height: 44px;
  }
  .who {
    flex: 1 1 240px;
    min-width: 0;
  }
  .name {
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .level-2 .name {
    font-weight: 400;
  }
  .who .mono {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .state {
    flex: 0 1 200px;
    min-width: 140px;
  }
  .bar {
    height: 10px;
    border-radius: 999px;
  }
  .small {
    font-size: 12px;
    margin-top: 4px;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .status-à-jour {
    background: color-mix(in srgb, #4caf50 20%, transparent);
    color: var(--vp-text);
  }
  .status-vide {
    background: color-mix(in srgb, var(--vp-warning) 20%, transparent);
    color: var(--vp-text);
  }
  .note {
    font-size: 13px;
    margin: 0 4px;
  }
`;
