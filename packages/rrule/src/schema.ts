import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "item": {
      "examples": [
        {
          "source": "FREQ=WEEKLY",
          "value": {
            "key": "FREQ",
            "value": "WEEKLY"
          }
        }
      ],
      "fields": {
        "key": {
          "kind": "text",
          "pattern": "[A-Z]+",
          "token": true
        },
        "value": {
          "kind": "text",
          "pattern": "[A-Z0-9,+-]+",
          "token": true
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "FREQ=WEEKLY",
          "value": {
            "items": [
              {
                "key": "FREQ",
                "value": "WEEKLY"
              }
            ]
          }
        }
      ],
      "fields": {
        "items": {
          "kind": "list",
          "item": [
            "item"
          ],
          "min": 1,
          "separator": ";"
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
