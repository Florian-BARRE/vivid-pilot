// ====== Code Summary ======
// Bundle entry: defines the <vivid-pilot-panel> element once, even if the
// module is loaded twice by the frontend.

import { PANEL_ELEMENT_NAME } from "./constants";
import { VividPilotPanel } from "./panel/vivid-pilot-panel";

if (!customElements.get(PANEL_ELEMENT_NAME)) {
  customElements.define(PANEL_ELEMENT_NAME, VividPilotPanel);
}
