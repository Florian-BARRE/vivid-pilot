// ====== Code Summary ======
// Bundle entry: defines the panel and its child elements once, even if the
// module is loaded twice by the frontend.

import { PANEL_ELEMENT_NAME, ROOM_ELEMENT_NAME, TREE_ELEMENT_NAME } from "./constants";
import { VividPilotRoom } from "./panel/room-view";
import { VividPilotTree } from "./panel/tree-sidebar";
import { VividPilotPanel } from "./panel/vivid-pilot-panel";

const ELEMENTS: Array<[string, CustomElementConstructor]> = [
  [TREE_ELEMENT_NAME, VividPilotTree],
  [ROOM_ELEMENT_NAME, VividPilotRoom],
  [PANEL_ELEMENT_NAME, VividPilotPanel],
];

for (const [name, element] of ELEMENTS) {
  if (!customElements.get(name)) customElements.define(name, element);
}
