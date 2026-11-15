// ====== Code Summary ======
// Styles of the leaf editor element (kept apart to keep each file short).

import { css } from "lit";

export const leafEditorStyles = css`
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(10, 10, 16, 0.42);
    backdrop-filter: blur(3px);
    z-index: 10;
    animation: fade 0.15s ease;
  }
  .sheet {
    position: fixed;
    z-index: 11;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(680px, calc(100vw - 24px));
    max-height: calc(100vh - 48px);
    overflow: auto;
    padding: 20px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: rise 0.18s ease;
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translate(-50%, -47%);
    }
  }
  header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-bottom: 4px;
  }
  .badge {
    width: 46px;
    height: 46px;
    border-radius: 14px;
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
    font-weight: 600;
  }
  .live {
    font-weight: 600;
    font-size: 13px;
    white-space: nowrap;
    padding: 5px 12px;
    border-radius: 999px;
    background: var(--vp-raised);
  }
  .live.lit {
    background: color-mix(in srgb, var(--glow) 22%, transparent);
    box-shadow: 0 0 14px color-mix(in srgb, var(--glow) 35%, transparent);
  }
  .block {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    border-radius: 14px;
    background: color-mix(in srgb, var(--vp-raised) 55%, transparent);
    min-width: 0;
  }
  h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--vp-muted);
  }
  .choices,
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  button {
    min-height: 36px;
    padding: 0 12px;
    border-radius: 10px;
    border: 1px solid var(--vp-divider);
    background: var(--vp-card);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition:
      background 0.15s ease,
      border-color 0.15s ease;
  }
  button:hover {
    border-color: color-mix(in srgb, var(--vp-primary) 45%, transparent);
  }
  .chip {
    min-height: 34px;
    font-size: 13px;
  }
  .chip.on {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 16%, var(--vp-card));
    font-weight: 600;
  }
  button.primary {
    border: 0;
    min-height: 40px;
    padding: 0 20px;
    background: var(--vp-primary);
    color: var(--text-primary-color, #fff);
    font-weight: 600;
  }
  button.ghost {
    border-color: transparent;
    background: transparent;
    color: var(--vp-muted);
  }
  button.ghost:hover {
    color: var(--vp-text);
    background: var(--vp-raised);
  }
  button.icon {
    width: 38px;
    justify-content: center;
    padding: 0;
    border-color: transparent;
    background: transparent;
    color: var(--vp-muted);
  }
  button.icon:hover {
    background: var(--vp-raised);
    color: var(--vp-text);
  }
  button.link {
    border: 0;
    background: none;
    color: var(--vp-primary);
    min-height: 0;
    padding: 0;
    font-weight: 600;
  }
  .segmented {
    display: inline-flex;
    padding: 3px;
    gap: 2px;
    border-radius: 12px;
    background: var(--vp-raised);
  }
  .segmented.wrap {
    flex-wrap: wrap;
  }
  .segmented button {
    min-height: 32px;
    border: 0;
    border-radius: 9px;
    background: transparent;
    color: var(--vp-muted);
  }
  .segmented button.on {
    background: var(--vp-card);
    color: var(--vp-text);
    font-weight: 600;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
  }
  select,
  input[type="number"] {
    min-height: 38px;
    border-radius: 10px;
    border: 1px solid var(--vp-divider);
    background: var(--vp-card);
    color: var(--vp-text);
    padding: 0 10px;
    font: inherit;
  }
  input[type="number"] {
    width: 80px;
  }
  .field {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
  }
  .field.toggle {
    justify-content: space-between;
    cursor: pointer;
  }
  .label {
    min-width: 140px;
    color: var(--vp-muted);
  }
  .unit {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--vp-muted);
  }
  .note {
    font-size: 12px;
    color: var(--vp-muted);
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .note.manual {
    color: var(--vp-warning);
  }
  .note.manual .link {
    margin-left: 4px;
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
    padding: 8px 12px;
    border-radius: 10px;
    background: var(--vp-card);
    min-width: 0;
  }
  .sources li.off {
    opacity: 0.6;
  }
  .sources .kind {
    font-weight: 600;
    white-space: nowrap;
  }
  .sources .mono {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .members {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: 10px 22px;
  }
  .members .col {
    font-size: 12px;
    color: var(--vp-muted);
    text-align: center;
    cursor: help;
  }
  .members .name {
    font-weight: 500;
  }
  .members .switch {
    justify-self: center;
  }
  footer {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    padding-top: 4px;
  }
  .error {
    margin: 0;
    padding: 10px 12px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--error-color, #db4437) 15%, transparent);
  }
`;
