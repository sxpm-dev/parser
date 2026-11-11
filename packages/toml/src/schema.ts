import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "section": {
      "examples": [
        {
          "source": "[server]",
          "value": {
            "section": "server"
          }
        }
      ],
      "fields": {
        "section": {
          "kind": "text",
          "pattern": "[^\\]\\r\\n]+",
          "token": true
        }
      }
    },
    "entry": {
      "examples": [
        {
          "source": "port = 8080",
          "value": {
            "key": "port",
            "value": "8080"
          }
        }
      ],
      "fields": {
        "key": {
          "kind": "text",
          "pattern": "[A-Za-z0-9_.-]+",
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
          "source": "[server]\nport = 8080",
          "value": {
            "items": [
              {
                "section": "server"
              },
              {
                "key": "port",
                "value": "8080"
              }
            ]
          }
        }
      ],
      "fields": {
        "items": {
          "kind": "list",
          "item": [
            "section",
            "entry"
          ],
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
    "whitespace": "horizontal",
    "comments": [
      [
        "#",
        "\n"
      ]
    ]
  }
});
