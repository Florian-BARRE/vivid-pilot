// ====== Code Summary ======
// Styles of the memory tab element (kept apart to keep each file short).

import { css } from "lit";

export const memoryTabStyles = css`
  :host {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .small {
    font-size: 12px;
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px 20px;
    padding: 16px 18px;
    background:
      radial-gradient(
        120% 160% at 0% 0%,
        color-mix(in srgb, #8a3ffc 10%, transparent),
        transparent 60%
      ),
      var(--vp-card);
  }
  .title {
    flex: 1 1 260px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .title-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, #8a3ffc 14%, transparent);
  }
  h1 {
    margin: 0;
    font-size: 22px;
    font-weight: 600;
  }
  .setting {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--vp-muted);
    cursor: pointer;
  }
  .setting input[type="number"] {
    width: 56px;
    min-height: 34px;
    border-radius: 9px;
    border: 1px solid var(--vp-divider);
    background: var(--vp-card);
    color: var(--vp-text);
    padding: 0 8px;
    font: inherit;
  }
  .how {
    padding: 0 18px;
  }
  .how summary {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 46px;
    cursor: pointer;
    color: var(--vp-muted);
    font-weight: 500;
    list-style: none;
  }
  .how summary::-webkit-details-marker {
    display: none;
  }
  .how ul {
    list-style: none;
    margin: 0 0 14px;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 10px;
  }
  .how li {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 10px 12px;
    border-radius: 12px;
    background: var(--vp-raised);
    font-size: 13px;
    line-height: 1.45;
  }
  .how li svg {
    flex: none;
    margin-top: 2px;
  }
  button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 34px;
    padding: 0 12px;
    border-radius: 10px;
    border: 1px solid var(--vp-divider);
    background: var(--vp-card);
    cursor: pointer;
    transition: background 0.15s ease;
  }
  button:hover:not(:disabled) {
    background: var(--vp-raised);
  }
  button:disabled {
    opacity: 0.35;
    cursor: default;
  }
  button.primary {
    border: 0;
    background: var(--vp-primary);
    color: var(--text-primary-color, #fff);
    font-weight: 600;
  }
  button.primary:hover:not(:disabled) {
    background: color-mix(in srgb, var(--vp-primary) 88%, black);
  }
  button.icon {
    width: 34px;
    padding: 0;
    justify-content: center;
    border-color: transparent;
    background: transparent;
    color: var(--vp-muted);
  }
  button.icon:hover:not(:disabled) {
    color: var(--vp-text);
  }
  .list {
    padding: 8px;
    display: flex;
    flex-direction: column;
  }
  .list-head {
    display: flex;
    padding: 6px 6px 10px;
  }
  .filters {
    display: flex;
    gap: 2px;
    padding: 3px;
    border-radius: 999px;
    background: var(--vp-raised);
  }
  .filters button {
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--vp-muted);
  }
  .filters button.on {
    background: var(--vp-card);
    color: var(--vp-text);
    font-weight: 600;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 14px;
    padding: 8px 10px;
    border-radius: 12px;
    transition: background 0.15s ease;
  }
  .row:hover {
    background: color-mix(in srgb, var(--vp-raised) 60%, transparent);
  }
  .row.level-1 {
    padding-left: 30px;
  }
  .row.level-2 {
    padding-left: 54px;
  }
  .row.level-0 + .row.level-1,
  .row.level-2 + .row.level-1 {
    margin-top: 4px;
    border-top: 1px solid var(--vp-divider);
    border-radius: 0 0 12px 12px;
  }
  .row.disabled .tile,
  .row.disabled .who,
  .row.disabled .state {
    opacity: 0.5;
  }
  .tile {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
    background: color-mix(in srgb, var(--accent) 14%, transparent);
  }
  .who {
    flex: 1 1 180px;
    min-width: 0;
  }
  .name {
    font-weight: 500;
  }
  .level-0 .name,
  .level-1 .name {
    font-weight: 600;
  }
  .status {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: var(--vp-muted);
  }
  .status .dot {
    width: 7px;
    height: 7px;
  }
  .status.ok .dot {
    background: #43b581;
  }
  .status.empty .dot {
    background: var(--vp-warning);
  }
  .state {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 0 1 220px;
    min-width: 160px;
  }
  .swatch {
    width: 48px;
    height: 10px;
    border-radius: 999px;
    flex: none;
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .actions .primary {
    margin-right: 6px;
  }
`;
