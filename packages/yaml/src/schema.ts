import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "entry": {
      "examples": [
        {
          "source": "title: Hello",
          "value": {
            "key": "title",
            "value": "Hello"
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
          "pattern": "[^\\r\\n]+",
          "token": true
        }
      }
    },
    "item": {
      "examples": [
        {
          "source": "- first",
          "value": {
            "item": "first"
          }
        }
      ],
      "fields": {
        "item": {
          "kind": "text",
          "pattern": "[^\\r\\n]+",
          "token": true
        }
      }
    },
    "plain": {
      "examples": [
        {
          "source": "title: Hello",
          "value": {
            "items": [
              {
                "key": "title",
                "value": "Hello"
              }
            ]
          }
        }
      ],
      "fields": {
        "items": {
          "kind": "list",
          "item": [
            "entry",
            "item"
          ],
          "separator": "\n",
          "trailing": true
        }
      }
    },
    "frontmatter": {
      "examples": [
        {
          "source": "---\ntitle: Hello\n---\nBody text\n",
          "value": {
            "items": [
              {
                "key": "title",
                "value": "Hello"
              }
            ],
            "body": "Body text\n"
          }
        }
      ],
      "fields": {
        "items": {
          "kind": "list",
          "item": [
            "entry",
            "item"
          ],
          "separator": "\n"
        },
        "body": {
          "kind": "text",
          "allowEmpty": true,
          "pattern": "[\\s\\S]*",
          "token": true
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "title: Hello",
          "value": {
            "items": [
              {
                "key": "title",
                "value": "Hello"
              }
            ]
          }
        }
      ],
      "fields": {
        "": {
          "kind": "ref",
          "item": [
            "frontmatter",
            "plain"
          ]
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
