import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "pair": {
      "examples": [
        {
          "source": "max-age=3600",
          "value": {
            "name": "max-age",
            "value": "3600"
          }
        }
      ],
      "fields": {
        "name": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_-]*",
          "token": true
        },
        "value": {
          "kind": "text",
          "pattern": "[^,\\s]+",
          "token": true
        }
      }
    },
    "flag": {
      "examples": [
        {
          "source": "no-cache",
          "value": {
            "name": "no-cache"
          }
        }
      ],
      "fields": {
        "name": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_-]*",
          "token": true
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "max-age=3600, no-cache",
          "value": {
            "directives": [
              {
                "name": "max-age",
                "value": "3600"
              },
              {
                "name": "no-cache"
              }
            ]
          }
        }
      ],
      "fields": {
        "directives": {
          "kind": "list",
          "item": [
            "pair",
            "flag"
          ],
          "separator": ", "
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
