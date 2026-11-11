import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "negativePair": {
      "examples": [
        {
          "source": "-label:wip",
          "value": {
            "negated": true,
            "key": "label",
            "value": "wip"
          }
        }
      ],
      "fields": {
        "key": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_-]*",
          "token": true
        },
        "value": {
          "kind": "text",
          "pattern": "[^\\s]+",
          "token": true
        }
      }
    },
    "pair": {
      "examples": [
        {
          "source": "status:open",
          "value": {
            "negated": false,
            "key": "status",
            "value": "open"
          }
        }
      ],
      "fields": {
        "key": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_-]*",
          "token": true
        },
        "value": {
          "kind": "text",
          "pattern": "[^\\s]+",
          "token": true
        }
      }
    },
    "phrase": {
      "examples": [
        {
          "source": "\"exact phrase\"",
          "value": {
            "text": "\"exact phrase\""
          }
        }
      ],
      "fields": {
        "text": {
          "kind": "text",
          "pattern": "\"(?:[^\"\\\\\\x00-\\x1f]|\\\\(?:[\"\\\\/bfnrt]|u[0-9a-fA-F]{4}))*\"",
          "token": true
        }
      }
    },
    "negative": {
      "examples": [
        {
          "source": "-archived",
          "value": {
            "negated": true,
            "text": "archived"
          }
        }
      ],
      "fields": {
        "text": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_-]*",
          "token": true
        }
      }
    },
    "term": {
      "examples": [
        {
          "source": "frontend",
          "value": {
            "negated": false,
            "text": "frontend"
          }
        }
      ],
      "fields": {
        "text": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_-]*",
          "token": true
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "status:open frontend",
          "value": {
            "terms": [
              {
                "negated": false,
                "key": "status",
                "value": "open"
              },
              {
                "negated": false,
                "text": "frontend"
              }
            ]
          }
        }
      ],
      "fields": {
        "terms": {
          "kind": "list",
          "item": [
            "negativePair",
            "pair",
            "phrase",
            "negative",
            "term"
          ],
          "separator": " "
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
