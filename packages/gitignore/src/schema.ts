import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "negative": {
      "examples": [
        {
          "source": "!important.log",
          "value": {
            "negated": true,
            "pattern": "important.log"
          }
        }
      ],
      "fields": {
        "pattern": {
          "kind": "text",
          "pattern": "[^\\r\\n]+",
          "token": true
        }
      }
    },
    "pattern": {
      "examples": [
        {
          "source": "*.log",
          "value": {
            "negated": false,
            "pattern": "*.log"
          }
        }
      ],
      "fields": {
        "pattern": {
          "kind": "text",
          "pattern": "[^!#\\r\\n][^\\r\\n]*",
          "token": true
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "*.log",
          "value": {
            "patterns": [
              {
                "negated": false,
                "pattern": "*.log"
              }
            ]
          }
        }
      ],
      "fields": {
        "patterns": {
          "kind": "list",
          "item": [
            "negative",
            "pattern"
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
