# ====== Code Summary ======
# Public facade of the tree package: categories, detection, model, builder
# and the live PilotTree engine.

from .builder import TreeBuilder
from .categories import CATEGORY_ORDER, Category, LeafSource
from .detector import CategoryDetector, DetectorSettings
from .engine import PilotTree
from .model import CategoryNode, HomeTree, RoomNode, TreeLeaf

__all__ = [
    "CATEGORY_ORDER",
    "Category",
    "CategoryDetector",
    "CategoryNode",
    "DetectorSettings",
    "HomeTree",
    "LeafSource",
    "PilotTree",
    "RoomNode",
    "TreeBuilder",
    "TreeLeaf",
]
