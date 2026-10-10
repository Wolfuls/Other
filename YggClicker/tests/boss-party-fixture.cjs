// Reproducible combat-only balance fixture; no player save/history is required.
module.exports={
  "levels": {
    "meta": 150,
    "mitsuru": 101,
    "megumin": 261,
    "vishunal": 123,
    "richter": 118,
    "tordeliese": 124,
    "waku": 232,
    "max": 244,
    "jewel": 116,
    "queen": 101
  },
  "concentration": {
    "meta": {
      "action": 0,
      "accuracy": 0,
      "evasion": 0,
      "power": 0,
      "vitality": 0,
      "armor": 0
    },
    "mitsuru": {
      "action": 0,
      "accuracy": 0,
      "evasion": 0,
      "power": 0,
      "vitality": 0,
      "armor": 0
    },
    "megumin": {
      "action": 0,
      "accuracy": 60,
      "evasion": 0,
      "power": 200,
      "vitality": 0,
      "armor": 0
    },
    "vishunal": {
      "action": 0,
      "accuracy": 0,
      "evasion": 0,
      "power": 0,
      "vitality": 0,
      "armor": 0
    },
    "richter": {
      "action": 0,
      "accuracy": 0,
      "evasion": 0,
      "power": 30,
      "vitality": 0,
      "armor": 0
    },
    "tordeliese": {
      "action": 0,
      "accuracy": 0,
      "evasion": 0,
      "power": 0,
      "vitality": 0,
      "armor": 0
    },
    "waku": {
      "action": 100,
      "accuracy": 0,
      "evasion": 0,
      "power": 100,
      "vitality": 0,
      "armor": 0
    },
    "max": {
      "action": 0,
      "accuracy": 0,
      "evasion": 0,
      "power": 0,
      "vitality": 0,
      "armor": 0
    },
    "jewel": {
      "action": 0,
      "accuracy": 0,
      "evasion": 0,
      "power": 0,
      "vitality": 0,
      "armor": 0
    },
    "queen": {
      "action": 0,
      "accuracy": 0,
      "evasion": 0,
      "power": 0,
      "vitality": 0,
      "armor": 0
    }
  },
  "perkEnabled": {
    "meta": {
      "mohican-slayer": true,
      "attack-plus": true,
      "lock-plus": true,
      "metal-shield": true,
      "metal-blade": true,
      "spinning-rush": true,
      "metal-storm": true,
      "full-metal-burst": true
    },
    "mitsuru": {
      "wire-self": true,
      "spark-shot": true,
      "wire-action": true,
      "tour-de-france": true,
      "spaghetti-code": true,
      "cat-cradle": true,
      "radioactivity": false
    },
    "megumin": {
      "explosion-girl": true,
      "wide-explosion": true,
      "blast-barrier": true,
      "quick-chant": true,
      "crimson-flame": true,
      "king-of-worlds": true,
      "laws-of-heaven": true,
      "rising-heat": true,
      "destruction": false,
      "eternal-hammer": false
    },
    "vishunal": {
      "mad-dog": true,
      "legal-launcher": true,
      "missile-missile": true,
      "rabid-dog": false
    },
    "richter": {
      "z-bom": true,
      "dx-bom": true,
      "bom-ber": true,
      "gx-bom": true,
      "vx-bom": true,
      "ex-bom": true
    },
    "tordeliese": {
      "greedy-gale": true,
      "retreating-wind": true,
      "folding-gale": true,
      "severing-storm": true,
      "demonic-hammer": true,
      "for-whom-the-storm": false,
      "annihilation": false
    },
    "waku": {
      "deceptive-hitbox": true,
      "expanded-hurtbox": true,
      "floor-clip": true,
      "monado-smash": true,
      "invisible-wall": true,
      "vanishing-hurtbox": true,
      "vanishing-hitbox": false,
      "full-screen-hurtbox": false,
      "next-frame": false
    },
    "max": {
      "gm": true,
      "handout": true,
      "plot-armor": true,
      "mouth-wrestling": true,
      "named-npc": true
    },
    "jewel": {
      "side-income": true,
      "yellow-glow": true,
      "crimson-fist": true,
      "crystal-radiance": true,
      "iolite-shield": true,
      "adamant-fist": true,
      "rainbow-armor": true,
      "black-egg": false
    },
    "queen": {
      "queens-bless": true,
      "royal-presence": true,
      "royal-blessing": true,
      "royal-intimidation": true,
      "insolent": true,
      "killer-queen": false
    }
  },
  "runaway": {
    "meta": {
      "runawayRate": 0,
      "criticalReserve": 1.4749593911816756,
      "activationType": "awakening",
      "runawayCollapsed": false,
      "runawaySymptom": null,
      "baseRunawayPressure": 0.02,
      "temporaryRunawayPressure": 0,
      "thresholdArmedState": {
        "50": true,
        "70": true,
        "90": true,
        "110": true,
        "120": true,
        "130": true,
        "140": true,
        "150": true
      }
    },
    "mitsuru": {
      "runawayRate": 0,
      "criticalReserve": 0,
      "activationType": "recovery",
      "runawayCollapsed": false,
      "runawaySymptom": null,
      "baseRunawayPressure": 0.02,
      "temporaryRunawayPressure": 0,
      "thresholdArmedState": {
        "50": true,
        "70": true,
        "90": true,
        "110": true,
        "120": true,
        "130": true,
        "140": true,
        "150": true
      }
    },
    "megumin": {
      "runawayRate": 57.920451980656644,
      "criticalReserve": 0,
      "activationType": "awakening",
      "runawayCollapsed": false,
      "runawaySymptom": null,
      "baseRunawayPressure": 0.03,
      "temporaryRunawayPressure": 0,
      "thresholdArmedState": {
        "50": false,
        "70": true,
        "90": true,
        "110": true,
        "120": true,
        "130": true,
        "140": true,
        "150": true
      }
    },
    "vishunal": {
      "runawayRate": 0,
      "criticalReserve": 0,
      "activationType": "reaction",
      "runawayCollapsed": false,
      "runawaySymptom": null,
      "baseRunawayPressure": 0.01,
      "temporaryRunawayPressure": 0,
      "thresholdArmedState": {
        "50": true,
        "70": true,
        "90": true,
        "110": true,
        "120": true,
        "130": true,
        "140": true,
        "150": true
      }
    },
    "richter": {
      "runawayRate": 0,
      "criticalReserve": 0,
      "activationType": "awakening",
      "runawayCollapsed": false,
      "runawaySymptom": null,
      "baseRunawayPressure": 0.02,
      "temporaryRunawayPressure": 0,
      "thresholdArmedState": {
        "50": true,
        "70": true,
        "90": true,
        "110": true,
        "120": true,
        "130": true,
        "140": true,
        "150": true
      }
    },
    "tordeliese": {
      "runawayRate": 0,
      "criticalReserve": 0,
      "activationType": "recovery",
      "runawayCollapsed": false,
      "runawaySymptom": null,
      "baseRunawayPressure": 0.005,
      "temporaryRunawayPressure": 0,
      "thresholdArmedState": {
        "50": true,
        "70": true,
        "90": true,
        "110": true,
        "120": true,
        "130": true,
        "140": true,
        "150": true
      }
    },
    "waku": {
      "runawayRate": 18.014043265592147,
      "criticalReserve": 0,
      "activationType": "reaction",
      "runawayCollapsed": false,
      "runawaySymptom": null,
      "baseRunawayPressure": 0.01,
      "temporaryRunawayPressure": 0,
      "thresholdArmedState": {
        "50": true,
        "70": true,
        "90": true,
        "110": true,
        "120": true,
        "130": true,
        "140": true,
        "150": true
      }
    },
    "max": {
      "runawayRate": 0,
      "criticalReserve": 0,
      "activationType": "recovery",
      "runawayCollapsed": false,
      "runawaySymptom": null,
      "baseRunawayPressure": 0.005,
      "temporaryRunawayPressure": 0,
      "thresholdArmedState": {
        "50": true,
        "70": true,
        "90": true,
        "110": true,
        "120": true,
        "130": true,
        "140": true,
        "150": true
      }
    },
    "jewel": {
      "runawayRate": 0,
      "criticalReserve": 0,
      "activationType": "awakening",
      "runawayCollapsed": false,
      "runawaySymptom": null,
      "baseRunawayPressure": 0.02,
      "temporaryRunawayPressure": 0,
      "thresholdArmedState": {
        "50": true,
        "70": true,
        "90": true,
        "110": true,
        "120": true,
        "130": true,
        "140": true,
        "150": true
      }
    },
    "queen": {
      "runawayRate": 24.39739103076674,
      "criticalReserve": 0,
      "activationType": "reaction",
      "runawayCollapsed": false,
      "runawaySymptom": null,
      "baseRunawayPressure": 0.03,
      "temporaryRunawayPressure": 0,
      "thresholdArmedState": {
        "50": true,
        "70": true,
        "90": true,
        "110": true,
        "120": true,
        "130": true,
        "140": true,
        "150": true
      }
    }
  },
  "upgrades": {
    "stabilization": 60,
    "retake": 1,
    "reversal": 1,
    "fightingSpirit": 1,
    "badLuck": 1,
    "reward": 129,
    "overkill": 1
  },
  "formationRows": {
    "meta": "front",
    "mitsuru": "front",
    "megumin": "rear",
    "vishunal": "front",
    "richter": "front",
    "tordeliese": "front",
    "waku": "front",
    "max": "rear",
    "jewel": "front",
    "queen": "rear"
  },
  "selectedCharacterId": "waku",
  "unlockedPerks": {
    "meta": [
      "attack-plus",
      "mohican-slayer",
      "metal-blade",
      "metal-storm",
      "full-metal-burst",
      "lock-plus",
      "spinning-rush",
      "metal-shield"
    ],
    "mitsuru": [
      "wire-self",
      "spark-shot",
      "wire-action",
      "tour-de-france",
      "spaghetti-code",
      "cat-cradle"
    ],
    "megumin": [
      "explosion-girl",
      "wide-explosion",
      "blast-barrier",
      "crimson-flame",
      "king-of-worlds",
      "laws-of-heaven",
      "rising-heat",
      "quick-chant",
      "destruction",
      "eternal-hammer"
    ],
    "vishunal": [
      "legal-launcher",
      "mad-dog",
      "missile-missile",
      "rabid-dog"
    ],
    "richter": [
      "z-bom",
      "dx-bom",
      "bom-ber",
      "vx-bom",
      "ex-bom",
      "gx-bom"
    ],
    "tordeliese": [
      "greedy-gale",
      "retreating-wind",
      "severing-storm",
      "demonic-hammer",
      "folding-gale",
      "for-whom-the-storm"
    ],
    "waku": [
      "deceptive-hitbox",
      "floor-clip",
      "vanishing-hurtbox",
      "expanded-hurtbox",
      "invisible-wall",
      "monado-smash",
      "full-screen-hurtbox",
      "next-frame",
      "vanishing-hitbox"
    ],
    "max": [
      "handout",
      "named-npc",
      "gm",
      "mouth-wrestling",
      "plot-armor"
    ],
    "jewel": [
      "crimson-fist",
      "adamant-fist",
      "crystal-radiance",
      "yellow-glow",
      "iolite-shield",
      "rainbow-armor",
      "side-income",
      "black-egg"
    ],
    "queen": [
      "queens-bless",
      "royal-presence",
      "royal-blessing",
      "royal-intimidation",
      "insolent"
    ]
  }
};
