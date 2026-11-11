import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "mention": {
      "examples": [
        {
          "source": "@alice",
          "value": {
            "kind": "mention",
            "name": "alice"
          }
        }
      ],
      "fields": {
        "name": {
          "kind": "text",
          "pattern": "[A-Za-z0-9_]+",
          "token": true
        }
      }
    },
    "tag": {
      "examples": [
        {
          "source": "#release",
          "value": {
            "kind": "tag",
            "name": "release"
          }
        }
      ],
      "fields": {
        "name": {
          "kind": "text",
          "pattern": "[A-Za-z0-9_]+",
          "token": true
        }
      }
    },
    "plain": {
      "examples": [
        {
          "source": "hello ",
          "value": {
            "kind": "text",
            "value": "hello "
          }
        }
      ],
      "fields": {
        "value": {
          "kind": "text",
          "pattern": "[^@#]+",
          "token": true
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "hello @alice",
          "value": {
            "items": [
              {
                "kind": "text",
                "value": "hello "
              },
              {
                "kind": "mention",
                "name": "alice"
              }
            ]
          }
        }
      ],
      "fields": {
        "items": {
          "kind": "list",
          "item": [
            "mention",
            "tag",
            "plain"
          ],
          "separator": ""
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
    "whitespace": "none"
  }
});
