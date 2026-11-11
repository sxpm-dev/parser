import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "unit": {
      "examples": [
        {
          "source": "12h",
          "value": {
            "amount": "12",
            "unit": "h"
          }
        }
      ],
      "fields": {
        "amount": {
          "kind": "text",
          "pattern": "[0-9]+(?:\\.[0-9]+)?",
          "token": true
        },
        "unit": {
          "kind": "text",
          "pattern": "(?:ms|[smhdwy])",
          "token": true
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "12h",
          "value": {
            "parts": [
              {
                "amount": "12",
                "unit": "h"
              }
            ]
          }
        }
      ],
      "fields": {
        "parts": {
          "kind": "list",
          "item": [
            "unit",
            "bare"
          ],
          "min": 1,
          "separator": ""
        }
      }
    },
    "bare": {
      "examples": [
        {
          "source": "500",
          "value": {
            "amount": "500",
            "unit": "ms"
          }
        }
      ],
      "fields": {
        "amount": {
          "kind": "text",
          "pattern": "[0-9]+(?:\\.[0-9]+)?",
          "token": true
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
