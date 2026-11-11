import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "item": {
      "examples": [
        {
          "source": "NODE_ENV=production",
          "value": {
            "key": "NODE_ENV",
            "value": "production"
          }
        }
      ],
      "fields": {
        "key": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_]*",
          "token": true
        },
        "value": {
          "kind": "text",
          "pattern": "[^\\r\\n]+",
          "token": true
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "NODE_ENV=production",
          "value": {
            "items": [
              {
                "key": "NODE_ENV",
                "value": "production"
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
          "separator": "\n",
          "trailing": true
        }
      }
    }
  },
  "encodings": {
    "json": {
      "from": "value",
      "format": "json"
    }
  },
  "lexical": {
    "whitespace": "horizontal"
  }
});
