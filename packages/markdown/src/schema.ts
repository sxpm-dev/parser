import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "heading": {
      "examples": [
        {
          "source": "## Title",
          "value": {
            "kind": "heading",
            "marker": "##",
            "text": "Title"
          }
        }
      ],
      "fields": {
        "marker": {
          "kind": "text",
          "pattern": "#{1,6}",
          "token": true
        },
        "text": {
          "kind": "text",
          "pattern": "[^\\r\\n]+",
          "token": true
        }
      }
    },
    "item": {
      "examples": [
        {
          "source": "- first entry",
          "value": {
            "kind": "item",
            "text": "first entry"
          }
        }
      ],
      "fields": {
        "text": {
          "kind": "text",
          "pattern": "[^\\r\\n]+",
          "token": true
        }
      }
    },
    "quote": {
      "examples": [
        {
          "source": "> note",
          "value": {
            "kind": "quote",
            "text": "note"
          }
        }
      ],
      "fields": {
        "text": {
          "kind": "text",
          "pattern": "[^\\r\\n]+",
          "token": true
        }
      }
    },
    "paragraph": {
      "examples": [
        {
          "source": "Hello world",
          "value": {
            "kind": "paragraph",
            "text": "Hello world"
          }
        }
      ],
      "fields": {
        "text": {
          "kind": "text",
          "pattern": "[^\\r\\n]+",
          "token": true
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "## Title\nHello world",
          "value": {
            "blocks": [
              {
                "kind": "heading",
                "marker": "##",
                "text": "Title"
              },
              {
                "kind": "paragraph",
                "text": "Hello world"
              }
            ]
          }
        }
      ],
      "fields": {
        "blocks": {
          "kind": "list",
          "item": [
            "heading",
            "item",
            "quote",
            "paragraph"
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
    "whitespace": "horizontal"
  }
});
