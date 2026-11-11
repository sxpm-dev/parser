import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "double": {
      "examples": [
        {
          "source": "**",
          "value": {
            "kind": "globstar"
          }
        }
      ],
      "fields": {}
    },
    "star": {
      "examples": [
        {
          "source": "*",
          "value": {
            "kind": "star"
          }
        }
      ],
      "fields": {}
    },
    "one": {
      "examples": [
        {
          "source": "?",
          "value": {
            "kind": "one"
          }
        }
      ],
      "fields": {}
    },
    "class": {
      "examples": [
        {
          "source": "[a-z]",
          "value": {
            "kind": "class",
            "text": "a-z"
          }
        }
      ],
      "fields": {
        "text": {
          "kind": "text",
          "pattern": "[^\\]\\r\\n]+",
          "token": true
        }
      }
    },
    "brace": {
      "examples": [
        {
          "source": "{js,ts}",
          "value": {
            "kind": "alternatives",
            "values": [
              "js",
              "ts"
            ]
          }
        }
      ],
      "fields": {
        "values": {
          "kind": "list",
          "item": {
            "kind": "text",
            "pattern": "[^,{}\\r\\n]+",
            "token": true
          },
          "separator": ",",
          "min": 1
        }
      }
    },
    "literal": {
      "examples": [
        {
          "source": "src/",
          "value": {
            "kind": "literal",
            "text": "src/"
          }
        }
      ],
      "fields": {
        "text": {
          "kind": "text",
          "pattern": "[^*?\\[\\]{}\\r\\n]+",
          "token": true
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "src/**",
          "value": {
            "tokens": [
              {
                "kind": "literal",
                "text": "src/"
              },
              {
                "kind": "globstar"
              }
            ]
          }
        }
      ],
      "fields": {
        "tokens": {
          "kind": "list",
          "item": [
            "double",
            "star",
            "one",
            "class",
            "brace",
            "literal"
          ],
          "separator": "",
          "min": 1
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
