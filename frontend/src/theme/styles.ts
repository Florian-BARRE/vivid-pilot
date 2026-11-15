// ====== Code Summary ======
// Shared styles of the panel. Every colour comes from the user's Home
// Assistant theme (light or dark, any custom theme), with neutral fallbacks;
// only category accents and halos are Vivid's own.

import { css } from "lit";

export const themeTokens = css`
  :host {
    --vp-bg: var(--primary-background-color, #fafafa);
    --vp-card: var(--card-background-color, var(--ha-card-background, #ffffff));
    --vp-raised: var(--secondary-background-color, #f3f4f6);
    --vp-text: var(--primary-text-color, #212121);
    --vp-muted: var(--secondary-text-color, #666666);
    --vp-divider: var(--divider-color, rgba(0, 0, 0, 0.12));
    --vp-primary: var(--primary-color, #03a9f4);
    --vp-selected: color-mix(in srgb, var(--vp-primary) 16%, transparent);
    --vp-radius: var(--ha-card-border-radius, 12px);
    --vp-warning: var(--warning-color, #ffa600);
    --vp-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
    --vp-ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
    color: var(--vp-text);
    font-family: var(--ha-font-family-body, Roboto, Noto, sans-serif);
    font-size: 14px;
  }
`;

export const sharedStyles = css`
  .card {
    background: var(--vp-card);
    border: 1px solid var(--vp-divider);
    border-radius: calc(var(--vp-radius) + 4px);
  }
  .muted {
    color: var(--vp-muted);
  }
  .mono {
    font-family: "Roboto Mono", ui-monospace, monospace;
    font-size: 11px;
    color: var(--vp-muted);
  }
  .pill {
    font-size: 11px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 999px;
    background: var(--vp-raised);
    color: var(--vp-muted);
    white-space: nowrap;
  }
  .pill.manual {
    background: color-mix(in srgb, var(--vp-warning) 18%, transparent);
    color: var(--vp-text);
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex: none;
    background: var(--vp-divider);
  }
  button {
    font: inherit;
    color: inherit;
  }
  /* Every button answers the press; :host raises the rule above each
     element's own transitions so press, hover and rotation all ease. */
  :host button {
    transition:
      scale 160ms var(--vp-ease-out),
      transform 220ms var(--vp-ease-out),
      background-color 150ms ease,
      border-color 150ms ease,
      color 150ms ease,
      box-shadow 200ms ease,
      opacity 150ms ease;
  }
  :host button:active:not(:disabled) {
    scale: 0.96;
  }
  :host button:is(.leaf, .row, .room-button, .category, .node, .extra):active:not(:disabled) {
    scale: 0.985;
  }
  /* Content that just appeared (a view, a tab) settles in. */
  .enter {
    animation: vp-enter 280ms var(--vp-ease-out) both;
  }
  .stagger > * {
    animation: vp-enter 320ms var(--vp-ease-out) both;
  }
  .stagger > :nth-child(2) {
    animation-delay: 40ms;
  }
  .stagger > :nth-child(3) {
    animation-delay: 70ms;
  }
  .stagger > :nth-child(4) {
    animation-delay: 95ms;
  }
  .stagger > :nth-child(n + 5) {
    animation-delay: 115ms;
  }
  @keyframes vp-enter {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }
  @keyframes vp-fade {
    from {
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .enter,
    .stagger > * {
      animation-name: vp-fade;
    }
    :host button:active:not(:disabled) {
      scale: 1;
    }
  }
  /* A switch drawn from a checkbox (role="switch"). */
  input.switch {
    appearance: none;
    position: relative;
    flex: none;
    width: 38px;
    height: 22px;
    margin: 0;
    border-radius: 11px;
    background: color-mix(in srgb, var(--vp-text) 22%, transparent);
    cursor: pointer;
    transition: background 0.2s ease;
  }
  input.switch::after {
    content: "";
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    transition: transform 0.2s ease;
  }
  input.switch:checked {
    background: var(--vp-primary);
  }
  input.switch:checked::after {
    transform: translateX(16px);
  }
  input.switch:focus-visible {
    outline: 2px solid var(--vp-primary);
    outline-offset: 2px;
  }
`;
