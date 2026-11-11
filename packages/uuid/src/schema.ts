import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "root": {
      "examples": [
        {
          "source": "550e8400-e29b-41d4-a716-446655440000",
          "value": {
            "time_low": "550e8400",
            "time_mid": "e29b",
            "time_hi": "41d4",
            "clock_seq": "a716",
            "node": "446655440000"
          }
        }
      ],
      "fields": {
        "time_low": {
          "kind": "text",
          "pattern": "[0-9A-Fa-f]{8}",
          "token": true
        },
        "time_mid": {
          "kind": "text",
          "pattern": "[0-9A-Fa-f]{4}",
          "token": true
        },
        "time_hi": {
          "kind": "text",
          "pattern": "[0-9A-Fa-f]{4}",
          "token": true
        },
        "clock_seq": {
          "kind": "text",
          "pattern": "[0-9A-Fa-f]{4}",
          "token": true
        },
        "node": {
          "kind": "text",
          "pattern": "[0-9A-Fa-f]{12}",
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
