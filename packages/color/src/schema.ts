import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "hex": {
      "examples": [
        {
          "source": "#ff00cc",
          "value": {
            "format": "hex",
            "raw": "ff00cc"
          }
        }
      ],
      "fields": {
        "raw": {
          "kind": "text",
          "pattern": "(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})",
          "token": true
        }
      }
    },
    "rgb": {
      "examples": [
        {
          "source": "rgb(12 34 56)",
          "value": {
            "format": "rgb",
            "raw": "12 34 56"
          }
        }
      ],
      "fields": {
        "raw": {
          "kind": "text",
          "balanced": true
        }
      }
    },
    "rgba": {
      "examples": [
        {
          "source": "rgba(12 34 56)",
          "value": {
            "format": "rgba",
            "raw": "12 34 56"
          }
        }
      ],
      "fields": {
        "raw": {
          "kind": "text",
          "balanced": true
        }
      }
    },
    "hsl": {
      "examples": [
        {
          "source": "hsl(12 34 56)",
          "value": {
            "format": "hsl",
            "raw": "12 34 56"
          }
        }
      ],
      "fields": {
        "raw": {
          "kind": "text",
          "balanced": true
        }
      }
    },
    "hsla": {
      "examples": [
        {
          "source": "hsla(12 34 56)",
          "value": {
            "format": "hsla",
            "raw": "12 34 56"
          }
        }
      ],
      "fields": {
        "raw": {
          "kind": "text",
          "balanced": true
        }
      }
    },
    "hwb": {
      "examples": [
        {
          "source": "hwb(12 34 56)",
          "value": {
            "format": "hwb",
            "raw": "12 34 56"
          }
        }
      ],
      "fields": {
        "raw": {
          "kind": "text",
          "balanced": true
        }
      }
    },
    "lab": {
      "examples": [
        {
          "source": "lab(12 34 56)",
          "value": {
            "format": "lab",
            "raw": "12 34 56"
          }
        }
      ],
      "fields": {
        "raw": {
          "kind": "text",
          "balanced": true
        }
      }
    },
    "lch": {
      "examples": [
        {
          "source": "lch(12 34 56)",
          "value": {
            "format": "lch",
            "raw": "12 34 56"
          }
        }
      ],
      "fields": {
        "raw": {
          "kind": "text",
          "balanced": true
        }
      }
    },
    "oklab": {
      "examples": [
        {
          "source": "oklab(12 34 56)",
          "value": {
            "format": "oklab",
            "raw": "12 34 56"
          }
        }
      ],
      "fields": {
        "raw": {
          "kind": "text",
          "balanced": true
        }
      }
    },
    "oklch": {
      "examples": [
        {
          "source": "oklch(12 34 56)",
          "value": {
            "format": "oklch",
            "raw": "12 34 56"
          }
        }
      ],
      "fields": {
        "raw": {
          "kind": "text",
          "balanced": true
        }
      }
    },
    "color": {
      "examples": [
        {
          "source": "color(12 34 56)",
          "value": {
            "format": "color",
            "raw": "12 34 56"
          }
        }
      ],
      "fields": {
        "raw": {
          "kind": "text",
          "balanced": true
        }
      }
    },
    "color-mix": {
      "examples": [
        {
          "source": "color-mix(12 34 56)",
          "value": {
            "format": "color-mix",
            "raw": "12 34 56"
          }
        }
      ],
      "fields": {
        "raw": {
          "kind": "text",
          "balanced": true
        }
      }
    },
    "named": {
      "examples": [
        {
          "source": "rebeccapurple",
          "value": {
            "format": "named",
            "raw": "rebeccapurple"
          }
        }
      ],
      "fields": {
        "raw": {
          "kind": "text",
          "pattern": "[A-Za-z]+",
          "token": true
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "#ff00cc",
          "value": {
            "format": "hex",
            "raw": "ff00cc"
          }
        }
      ],
      "fields": {
        "": {
          "kind": "ref",
          "item": [
            "hex",
            "rgb",
            "rgba",
            "hsl",
            "hsla",
            "hwb",
            "lab",
            "lch",
            "oklab",
            "oklch",
            "color",
            "color-mix",
            "named"
          ]
        }
      }
    }
  },
  "encodings": {
    "json": {
      "from": "value",
      "format": "json"
    }
  }
});
