// ====== Code Summary ======
// renderIcon: a stroke icon from a path, sized and coloured by the caller.

import { html } from "lit";

export function renderIcon(path: string, color: string, size = 18) {
  return html`<svg
    width=${size}
    height=${size}
    viewBox="0 0 24 24"
    fill="none"
    stroke=${color}
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d=${path}></path>
  </svg>`;
}

export const HOME_ICON = "M3 11l9-8 9 8M5 10v10h14V10";
export const CHEVRON_ICON = "M9 6l6 6-6 6";
