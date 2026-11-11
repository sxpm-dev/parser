import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "root": {
      "examples": [
        {
          "source": "alice@example.org",
          "value": {
            "local": "alice",
            "domain": "example.org"
          }
        }
      ],
      "fields": {
        "local": {
          "kind": "text",
          "pattern": "[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+",
          "token": true
        },
        "domain": {
          "kind": "text",
          "pattern": "[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?",
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
