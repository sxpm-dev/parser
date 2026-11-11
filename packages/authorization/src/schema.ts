import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "root": {
      "examples": [
        {
          "source": "Bearer abc123",
          "value": {
            "scheme": "Bearer",
            "credentials": "abc123"
          }
        }
      ],
      "fields": {
        "scheme": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_-]*",
          "token": true
        },
        "credentials": {
          "kind": "text",
          "pattern": "[^\\s]+",
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
