import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "root": {
      "examples": [
        {
          "source": "application/json",
          "value": {
            "type": "application",
            "subtype": "json"
          }
        }
      ],
      "fields": {
        "type": {
          "kind": "text",
          "pattern": "[A-Za-z0-9!#$&^_.+-]+",
          "token": true
        },
        "subtype": {
          "kind": "text",
          "pattern": "[A-Za-z0-9!#$&^_.+-]+",
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
