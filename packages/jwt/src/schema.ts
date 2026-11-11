import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "root": {
      "examples": [
        {
          "source": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.SflKxwRJSMe",
          "value": {
            "header": "eyJhbGciOiJIUzI1NiJ9",
            "payload": "eyJzdWIiOiIxMjM0In0",
            "signature": "SflKxwRJSMe"
          }
        }
      ],
      "fields": {
        "header": {
          "kind": "text",
          "pattern": "[A-Za-z0-9_-]+",
          "token": true
        },
        "payload": {
          "kind": "text",
          "pattern": "[A-Za-z0-9_-]+",
          "token": true
        },
        "signature": {
          "kind": "text",
          "pattern": "[A-Za-z0-9_-]+",
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
