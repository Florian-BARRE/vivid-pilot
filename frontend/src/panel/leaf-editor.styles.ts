// ====== Code Summary ======
// Styles of the leaf editor element (kept apart to keep each file short).

import { css } from "lit";

export const leafEditorStyles = css`
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
    width: min(720px, calc(100vw - 24px));
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
    align-items: center;
    gap: 12px;
  }
  .badge {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
  }
  .head-text {
    flex: 1;
    min-width: 0;
  }
  .head-text .mono {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 500;
  }
  .live {
    font-weight: 700;
    white-space: nowrap;
  }
  fieldset {
    border: 1px solid var(--vp-divider);
    border-radius: 12px;
    padding: 12px;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }
  legend {
    font-weight: 600;
    padding: 0 6px;
  }
  .choices,
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  button {
    min-height: 40px;
    padding: 0 12px;
    border-radius: 10px;
    border: 1px solid var(--vp-divider);
    background: var(--vp-raised);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  button.on {
    border-color: var(--vp-primary);
    background: var(--vp-selected);
    font-weight: 600;
  }
  button.primary {
    border: 0;
    background: var(--vp-primary);
    color: var(--text-primary-color, #fff);
    font-weight: 600;
  }
  button.icon {
    width: 40px;
    justify-content: center;
    padding: 0;
  }
  button.link {
    border: 0;
    background: none;
    color: var(--vp-primary);
    min-height: 0;
    padding: 0;
    text-decoration: underline;
  }
  select,
  input[type="number"] {
    min-height: 40px;
    border-radius: 10px;
    border: 1px solid var(--vp-divider);
    background: var(--vp-card);
    color: var(--vp-text);
    padding: 0 10px;
    font: inherit;
  }
  input[type="number"] {
    width: 90px;
  }
  .label {
    min-width: 150px;
    color: var(--vp-muted);
  }
  .hint {
    font-size: 12px;
    color: var(--vp-muted);
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .radio,
  .check {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 40px;
    cursor: pointer;
  }
  .sources {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .sources li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 10px;
    background: var(--vp-raised);
    min-width: 0;
  }
  .sources .mono {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .member {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    padding: 4px 8px;
    border-radius: 10px;
    background: var(--vp-raised);
  }
  .member .name {
    flex: 1;
    min-width: 160px;
    font-weight: 500;
  }
  footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  .error {
    margin: 0;
    padding: 10px 12px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--error-color, #db4437) 15%, transparent);
  }
`;
