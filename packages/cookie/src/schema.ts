import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "item": {
      "examples": [
        {
          "source": "session=abc123",
          "value": {
            "name": "session",
            "value": "abc123"
          }
        }
      ],
      "fields": {
        "name": {
          "kind": "text",
          "pattern": "[^=;\\s]+",
          "token": true
        },
        "value": {
          "kind": "text",
          "pattern": "[^;\\r\\n]+",
          "token": true
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "session=abc123",
          "value": {
            "items": [
              {
                "name": "session",
                "value": "abc123"
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
          "separator": "; "
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
