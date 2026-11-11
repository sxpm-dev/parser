import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "word": {
      "examples": [
        {
          "source": "SELECT",
          "value": {
            "kind": "word",
            "text": "SELECT"
          }
        }
      ],
      "fields": {
        "text": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_$]*",
          "token": true
        }
      }
    },
    "number": {
      "examples": [
        {
          "source": "42",
          "value": {
            "kind": "number",
            "text": "42"
          }
        }
      ],
      "fields": {
        "text": {
          "kind": "text",
          "pattern": "-?(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?(?:[eE][+-]?[0-9]+)?",
          "token": true
        }
      }
    },
    "quoted": {
      "examples": [
        {
          "source": "'hello'",
          "value": {
            "kind": "quoted",
            "text": "'hello'"
          }
        }
      ],
      "fields": {
        "text": {
          "kind": "text",
          "pattern": "'(?:[^']|'')*'|\"(?:[^\"]|\"\")*\"|`[^`]*`",
          "token": true
        }
      }
    },
    "punct": {
      "examples": [
        {
          "source": ",",
          "value": {
            "kind": "punctuation",
            "text": ","
          }
        }
      ],
      "fields": {
        "text": {
          "kind": "text",
          "pattern": "(?:>=|<=|<>|!=|[.,;*+=<>/-])",
          "token": true
        }
      }
    },
    "group": {
      "examples": [
        {
          "source": "(42)",
          "value": {
            "kind": "group",
            "items": [
              {
                "kind": "number",
                "text": "42"
              }
            ]
          }
        }
      ],
      "fields": {
        "items": {
          "kind": "list",
          "item": [
            "group",
            "word",
            "number",
            "quoted",
            "punct"
          ],
          "separator": " "
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "SELECT name",
          "value": {
            "tokens": [
              {
                "kind": "word",
                "text": "SELECT"
              },
              {
                "kind": "word",
                "text": "name"
              }
            ]
          }
        }
      ],
      "fields": {
        "tokens": {
          "kind": "list",
          "item": [
            "group",
            "word",
            "number",
            "quoted",
            "punct"
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
  },
  "lexical": {
    "comments": [
      [
        "--",
        "\n"
      ],
      [
        "/*",
        "*/"
      ]
    ]
  }
});
