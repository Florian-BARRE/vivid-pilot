"""The words the integration writes itself follow Home Assistant's language."""

from custom_components.vivid_pilot.const import HOME_DEVICE_NAMES, NODE_MODELS
from custom_components.vivid_pilot.language import in_language


def test_in_language_picks_the_base_language_and_falls_back_to_english() -> None:
    assert in_language(HOME_DEVICE_NAMES, "fr-FR") == "Maison"
    assert in_language(HOME_DEVICE_NAMES, "en") == "Home"
    assert in_language(HOME_DEVICE_NAMES, "de") == "Home"
    assert in_language(HOME_DEVICE_NAMES, None) == "Home"
    assert in_language(NODE_MODELS, "fr") == ("Maison", "Pièce")
