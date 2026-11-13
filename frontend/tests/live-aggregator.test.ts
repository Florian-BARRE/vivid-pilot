// ====== Code Summary ======
// Unit tests of LiveAggregator: leaf texts, category summaries, room and
// home summaries computed from fake Home Assistant states.

import { describe, expect, it } from "vitest";

import { LiveAggregator } from "../src/tree/live-aggregator";
import type { CategoryNode, HomeTree, RoomNode, TreeLeaf } from "../src/tree/types";
import type { HassEntityState } from "../src/types/home-assistant";

const leaf = (entity_id: string, category: TreeLeaf["category"]): TreeLeaf => ({
  entity_id,
  name: entity_id,
  category,
  source: "auto",
  reason: "",
  device_id: null,
});

const state = (
  entity_id: string,
  value: string,
  attributes: HassEntityState["attributes"] = {},
): HassEntityState => ({ entity_id, state: value, attributes });

const states: Record<string, HassEntityState> = {
  "light.lamp": state("light.lamp", "on", { brightness: 204 }),
  "light.strip": state("light.strip", "on", { rgb_color: [176, 124, 255] }),
  "light.off": state("light.off", "off"),
  "binary_sensor.window": state("binary_sensor.window", "on"),
  "sensor.t1": state("sensor.t1", "20.9", { unit_of_measurement: "°C" }),
  "sensor.t2": state("sensor.t2", "21.8", { unit_of_measurement: "°C" }),
  "sensor.p1": state("sensor.p1", "64", { unit_of_measurement: "W" }),
  "sensor.p2": state("sensor.p2", "12.5", { unit_of_measurement: "W" }),
  "sensor.dead": state("sensor.dead", "unavailable"),
};

const salon: RoomNode = {
  area_id: "salon",
  name: "Salon",
  icon: null,
  floor_id: null,
  categories: [
    { category: "light", leaves: [leaf("light.lamp", "light"), leaf("light.off", "light")] },
    { category: "led", leaves: [leaf("light.strip", "led")] },
    { category: "window", leaves: [leaf("binary_sensor.window", "window")] },
    {
      category: "temperature",
      leaves: [leaf("sensor.t1", "temperature"), leaf("sensor.t2", "temperature")],
    },
    { category: "power", leaves: [leaf("sensor.p1", "power"), leaf("sensor.dead", "power")] },
  ],
};

describe("LiveAggregator", () => {
  const aggregator = new LiveAggregator("fr-FR");

  it("describes leaves", () => {
    expect(aggregator.leaf(leaf("light.lamp", "light"), states).text).toBe("80 %");
    expect(aggregator.leaf(leaf("light.strip", "led"), states).glow).toBe("rgb(176,124,255)");
    expect(aggregator.leaf(leaf("light.off", "light"), states).text).toBe("éteinte");
    expect(aggregator.leaf(leaf("binary_sensor.window", "window"), states).text).toBe("ouverte");
    expect(aggregator.leaf(leaf("sensor.dead", "power"), states).available).toBe(false);
    expect(aggregator.leaf(leaf("sensor.missing", "power"), states).text).toBe("indisponible");
  });

  it("summarises categories", () => {
    const [lights, , , temperature, power] = salon.categories as CategoryNode[];
    expect(aggregator.category(lights, states).text).toBe("1/2");
    expect(aggregator.category(temperature, states).text).toBe("21,4 °C");
    expect(aggregator.range(temperature, states)).toEqual({ min: 20.9, mean: 21.35, max: 21.8 });
    expect(aggregator.category(power, states).text).toBe("64 W");
  });

  it("summarises rooms and the home", () => {
    expect(aggregator.room(salon, states)).toEqual({
      lightsOn: 2,
      lightsTotal: 3,
      power: 64,
      temperature: { min: 20.9, max: 21.8 },
    });
    const bureau: RoomNode = {
      ...salon,
      area_id: "bureau",
      categories: [{ category: "power", leaves: [leaf("sensor.p2", "power")] }],
    };
    const tree: HomeTree = { rooms: [salon, bureau], unassigned: [], ignored: [] };
    expect(aggregator.home(tree, states)).toEqual({
      lightsOn: 2,
      lightsTotal: 3,
      power: 76.5,
      temperature: { min: 20.9, max: 21.8 },
    });
  });
});
