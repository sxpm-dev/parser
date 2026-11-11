import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "dimension": {
      "examples": [
        {
          "source": "12px",
          "value": {
            "amount": "12",
            "unit": "px"
          }
        }
      ],
      "fields": {
        "amount": {
          "kind": "text",
          "pattern": "[+-]?(?:[0-9]+(?:\\.[0-9]+)?|\\.[0-9]+)",
          "token": true
        },
        "unit": {
          "kind": "text",
          "pattern": "(?:%|px|em|rem|vh|vw|vmin|vmax|cm|mm|in|pt|pc|ch|ex|lh|rlh|svh|lvh|dvh)",
          "token": true
        }
      }
    },
    "zero": {
      "examples": [
        {
          "source": "0",
          "value": {
            "amount": "0",
            "unit": ""
          }
        }
      ],
      "fields": {}
    },
    "calc": {
      "examples": [
        {
          "source": "calc(100% - 2px)",
          "value": {
            "function": "calc",
            "arguments": "100% - 2px"
          }
        }
      ],
      "fields": {
        "arguments": {
          "kind": "text",
          "balanced": true
        }
      }
    },
    "min": {
      "examples": [
        {
          "source": "min(100% - 2px)",
          "value": {
            "function": "min",
            "arguments": "100% - 2px"
          }
        }
      ],
      "fields": {
        "arguments": {
          "kind": "text",
          "balanced": true
        }
      }
    },
    "max": {
      "examples": [
        {
          "source": "max(100% - 2px)",
          "value": {
            "function": "max",
            "arguments": "100% - 2px"
          }
        }
      ],
      "fields": {
        "arguments": {
          "kind": "text",
          "balanced": true
        }
      }
    },
    "clamp": {
      "examples": [
        {
          "source": "clamp(100% - 2px)",
          "value": {
            "function": "clamp",
            "arguments": "100% - 2px"
          }
        }
      ],
      "fields": {
        "arguments": {
          "kind": "text",
          "balanced": true
        }
      }
    },
    "var": {
      "examples": [
        {
          "source": "var(100% - 2px)",
          "value": {
            "function": "var",
            "arguments": "100% - 2px"
          }
        }
      ],
      "fields": {
        "arguments": {
          "kind": "text",
          "balanced": true
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "12px",
          "value": {
            "amount": "12",
            "unit": "px"
          }
        }
      ],
      "fields": {
        "": {
          "kind": "ref",
          "item": [
            "dimension",
            "zero",
            "calc",
            "min",
            "max",
            "clamp",
            "var"
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
