"""Fixed policy taxonomy for tagging claims.

Keyword-based, deliberately transparent: every topic is a readable word list,
so a mistag is auditable, not a black box. Tags answer "which topics get
walked back across seats and parties" — the theme rollup layer. Heuristic
only; the tagger never asserts what a claim *means*.

Matching is token-based for single words (so "bus" never matches
"business", "rail" never matches "trail") with explicit plural coverage;
multi-word phrases match as substrings, where embedded spaces make false
joins unlikely.
"""

from __future__ import annotations

from . import extract

# Topic -> match phrases (lowercased substring match on normalized claim text).
TOPICS: dict[str, tuple[str, ...]] = {
    "nhs": ("nhs", "hospital", "gp surgery", "waiting list", "a&e", "health service"),
    "economy": ("economy", "economic growth", "gdp", "recession", "business rates"),
    "cost_of_living": (
        "cost of living",
        "energy bills",
        "food prices",
        "inflation",
        "mortgage",
    ),
    "immigration": ("immigration", "asylum", "small boats", "rwanda", "border control", "migrant"),
    "crime": ("crime", "police", "antisocial behaviour", "knife crime", "prison"),
    "housing": ("housing", "housebuilding", "affordable homes", "renters", "homelessness"),
    "education": ("school", "teacher", "university", "tuition fees", "childcare", "ofsted"),
    "climate": (
        "climate",
        "net zero",
        "carbon",
        "renewable",
        "fossil fuel",
        "environment",
    ),
    "transport": ("rail", "bus", "hs2", "pothole", "railway"),
    "tax": ("tax", "national insurance", "vat", "income tax", "council tax"),
    "welfare": ("benefits", "universal credit", "welfare", "disability benefit", "pension"),
    "europe": ("brexit", "european union", "single market", "freedom of movement"),
    "defence": ("defence", "armed forces", "nato", "ukraine", "veterans"),
    "devolution": ("devolution", "scottish parliament", "senedd", "stormont", "westminster"),
    # NOTE: bare "vote" excluded — every "Vote for X" CTA would tag democracy
    # and drown the topic in asymmetry noise. "road" excluded likewise:
    # street addresses swamp genuine roads talk ("pothole" carries it).
    "democracy": ("election", "democracy", "electoral reform", "voter id"),
}


def tag_claim(text: str) -> list[str]:
    """Return sorted topic keys matching the claim text (may be empty)."""
    lowered = text.lower()
    toks = set(extract.tokens(lowered))
    matched = []
    for topic, phrases in TOPICS.items():
        for phrase in phrases:
            if " " in phrase or "&" in phrase:
                if phrase in lowered:
                    matched.append(topic)
                    break
            elif phrase in toks or f"{phrase}s" in toks or f"{phrase}es" in toks:
                matched.append(topic)
                break
    return sorted(matched)
