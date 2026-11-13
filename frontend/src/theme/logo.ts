// ====== Code Summary ======
// VividPilotLogo: the Vivid logo (glowing V tile) with the Pilot badge — a
// steering wheel at the bottom right. Same drawing as docs/assets/logo.svg.

import { LitElement, css, html } from "lit";

export class VividPilotLogo extends LitElement {
  static override properties = { size: { type: Number } };

  size = 32;

  protected override render() {
    return html`<svg
      width=${this.size}
      height=${this.size}
      viewBox="0 0 256 256"
      role="img"
      aria-label="Vivid Pilot"
    >
      <defs>
        <linearGradient id="vp-fill" x1="0.15" y1="0.1" x2="0.9" y2="0.95">
          <stop offset="0" stop-color="#ffb347"></stop>
          <stop offset="0.45" stop-color="#ff5f6d"></stop>
          <stop offset="1" stop-color="#8a3ffc"></stop>
        </linearGradient>
        <radialGradient id="vp-bg" cx="0.5" cy="0.42" r="0.75">
          <stop offset="0" stop-color="#26232e"></stop>
          <stop offset="1" stop-color="#121117"></stop>
        </radialGradient>
        <filter id="vp-bloom" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="16"></feGaussianBlur>
        </filter>
        <clipPath id="vp-tile"><rect width="256" height="256" rx="58"></rect></clipPath>
      </defs>
      <g clip-path="url(#vp-tile)">
        <rect width="256" height="256" fill="url(#vp-bg)"></rect>
        <circle
          cx="128"
          cy="128"
          r="74"
          fill="url(#vp-fill)"
          opacity="0.75"
          filter="url(#vp-bloom)"
        ></circle>
        <circle cx="128" cy="128" r="66" fill="url(#vp-fill)"></circle>
        <path
          d="M97 101 L128 162 L159 101"
          fill="none"
          stroke="#ffffff"
          stroke-width="17"
          stroke-linecap="round"
          stroke-linejoin="round"
        ></path>
        <circle cx="196" cy="196" r="44" fill="#121117"></circle>
        <circle cx="196" cy="196" r="35" fill="#ffffff"></circle>
        <g fill="none" stroke="#2a1f3d" stroke-width="5.5" stroke-linecap="round">
          <circle cx="196" cy="196" r="21"></circle>
          <path d="M196 201 V217 M191.7 193.5 L177.8 185.5 M200.3 193.5 L214.2 185.5"></path>
        </g>
        <circle cx="196" cy="196" r="6" fill="#2a1f3d"></circle>
      </g>
    </svg>`;
  }

  static override styles = css`
    :host {
      display: inline-flex;
      line-height: 0;
    }
    svg {
      border-radius: 22%;
      box-shadow: 0 0 18px rgba(255, 95, 109, 0.35);
    }
  `;
}
