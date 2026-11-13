// ====== Code Summary ======
// Bundle entry: defines the panel and its child elements once, even if the
// module is loaded twice by the frontend.

import { ELEMENT_NAMES } from "./constants";
import { VividPilotGraph } from "./panel/graph-view";
import { VividPilotLeafEditor } from "./panel/leaf-editor";
import { VividPilotMemoryEditor } from "./panel/memory-editor";
import { VividPilotMemoryTab } from "./panel/memory-tab";
import { VividPilotNode } from "./panel/node-view";
import { VividPilotPowerSources } from "./panel/power-sources";
import { VividPilotTree } from "./panel/tree-sidebar";
import { VividPilotUtilitiesTab } from "./panel/utilities-tab";
import { VividPilotPanel } from "./panel/vivid-pilot-panel";
import { VividPilotLogo } from "./theme/logo";

const ELEMENTS: Array<[string, CustomElementConstructor]> = [
  [ELEMENT_NAMES.logo, VividPilotLogo],
  [ELEMENT_NAMES.tree, VividPilotTree],
  [ELEMENT_NAMES.powerSources, VividPilotPowerSources],
  [ELEMENT_NAMES.node, VividPilotNode],
  [ELEMENT_NAMES.graph, VividPilotGraph],
  [ELEMENT_NAMES.leafEditor, VividPilotLeafEditor],
  [ELEMENT_NAMES.memoryTab, VividPilotMemoryTab],
  [ELEMENT_NAMES.memoryEditor, VividPilotMemoryEditor],
  [ELEMENT_NAMES.utilitiesTab, VividPilotUtilitiesTab],
  [ELEMENT_NAMES.panel, VividPilotPanel],
];

for (const [name, element] of ELEMENTS) {
  if (!customElements.get(name)) customElements.define(name, element);
}
