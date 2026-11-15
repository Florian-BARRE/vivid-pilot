<p align="center">
  <img src="../assets/headers/entities.jpg" alt="Entities and services" width="100%" />
</p>

<sub><a href="../../README.md">Vivid Pilot</a> › <a href="../README.md">Documentation</a> › Entities and services</sub>

# Entities and services

Everything Vivid Pilot generates, how it is named, what it carries, and the
services it adds.

## Naming

Entity ids follow the tree: `vivid_pilot_<room>_<kind>[_<suffix>]`, and
`vivid_pilot_all_…` for the home (`salon` is the area id of the Salon). Names
stay readable: "Salon · LEDs".

Each room gets a virtual device **Room · Salon**, placed in the room's area, that
holds its entities; the home's entities belong to a **Home** device without an
area. Unique ids are stable (`<area_id>__<kind>__<what>`), so renaming an area
or an entity id in Home Assistant keeps history and dashboards.

## Every entity

| Node                          | Entities                                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Lamps, LEDs of a room         | `light.vivid_pilot_<room>_light` / `_led` (group), `scene.…_state` (memory), `sensor.…_power`, `sensor.…_energy` |
| Switches of a room            | `switch.vivid_pilot_<room>_switch`, `scene.…_switch_state`, `sensor.…_switch_power`, `sensor.…_switch_energy`   |
| A WLED strip                  | `sensor.vivid_pilot_<strip>_power`                                                                           |
| Doors, windows, presence      | `binary_sensor.vivid_pilot_<room>_door` / `_window` / `_presence`                                            |
| Temperature, humidity, pressure, CO₂, illuminance | `sensor.vivid_pilot_<room>_<measure>` (mean), `…_min`, `…_max`                           |
| Batteries                     | `sensor.vivid_pilot_<room>_battery` (lowest level)                                                           |
| A room                        | `scene.vivid_pilot_<room>_state`, `sensor.vivid_pilot_<room>_power`, `sensor.vivid_pilot_<room>_energy`       |
| The home                      | the same over every room: `light.vivid_pilot_all_light`, `light.vivid_pilot_all_led`, `switch.vivid_pilot_all_switch`, `scene.vivid_pilot_all_state`, `sensor.vivid_pilot_all_power`, `…_energy`, `…_battery`, every measure… |

A node exists only while it has members: no windows in the kitchen, no
`binary_sensor.vivid_pilot_cuisine_window`.

## Attributes

Every generated entity carries two attributes that say where it sits in the
tree. [Vivid Cards](../guides/vivid-cards.md) finds Vivid Pilot's entities from
these two only, never from names or entity ids: renaming never breaks a card.

| Attribute           | Values                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `vivid_pilot_node`  | `all`, a room (`salon`), a kind of a room (`salon__led`) or of the home (`all__battery`)    |
| `vivid_pilot_kind`  | `group`, `state` (memory scene), `any` (openings), `mean`, `min`, `max`, `power`, `energy`, `battery`, `strip_power` |

And, by kind:

| Kind                    | Attributes                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------- |
| Groups, scenes, measures | `entity_id`: the members                                                           |
| `any`                   | `count_on`, `members_on`                                                            |
| `min`, `max`            | the sensor holding the value                                                        |
| `battery`               | `source`, `low`, `low_count`, `low_threshold`                                       |
| `strip_power`           | `light`: the strip                                                                  |
| `state` (scene)         | `saved_at` once a lighting is stored; unavailable while the memory is turned off    |

## Services

| Service                | Data           | Does                                     |
| ---------------------- | -------------- | ---------------------------------------- |
| `vivid_pilot.save`     | `node`         | saves the node's lighting now, if something is on |
| `vivid_pilot.restore`  | `node`         | restores the node's memory               |
| `vivid_pilot.forget`   | `node`         | erases the node's memory                 |

`node` is `all`, a room (`salon`) or a kind of a room (`salon__light`,
`salon__led`, `salon__switch`). See [lighting memory](../concepts/memory.md).

## In automations

The generated entities are regular entities. Two examples:

```yaml
# Leaving: everything off (memories keep the last lighting).
action: light.turn_off
target:
  entity_id:
    - light.vivid_pilot_all_light
    - light.vivid_pilot_all_led
```

```yaml
# A window left open for 10 minutes.
trigger:
  - trigger: state
    entity_id: binary_sensor.vivid_pilot_all_window
    to: "on"
    for: "00:10:00"
```

## See also

- [How it reads your home](../concepts/tree.md): the tree these entities follow.
- [Architecture](../architecture.md): how they are generated.
