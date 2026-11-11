import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "string": {
      "examples": [
        {
          "source": "\"hello\"",
          "value": {
            "kind": "string",
            "raw": "\"hello\""
          }
        }
      ],
      "fields": {
        "raw": {
          "kind": "text",
          "pattern": "\"(?:[^\"\\\\\\x00-\\x1f]|\\\\(?:[\"\\\\/bfnrt]|u[0-9a-fA-F]{4}))*\"",
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
            "raw": "42"
          }
        }
      ],
      "fields": {
        "raw": {
          "kind": "text",
          "pattern": "-?(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?(?:[eE][+-]?[0-9]+)?",
          "token": true
        }
      }
    },
    "yes": {
      "examples": [
        {
          "source": "true",
          "value": true
        }
      ],
      "fields": {}
    },
    "no": {
      "examples": [
        {
          "source": "false",
          "value": false
        }
      ],
      "fields": {}
    },
    "nil": {
      "examples": [
        {
          "source": "null",
          "value": null
        }
      ],
      "fields": {}
    },
    "member": {
      "examples": [
        {
          "source": "\"title\": \"hello\"",
          "value": {
            "key": "\"title\"",
            "value": {
              "kind": "string",
              "raw": "\"hello\""
            }
          }
        }
      ],
      "fields": {
        "key": {
          "kind": "text",
          "pattern": "\"(?:[^\"\\\\\\x00-\\x1f]|\\\\(?:[\"\\\\/bfnrt]|u[0-9a-fA-F]{4}))*\"",
          "token": true
        },
        "value": {
          "kind": "ref",
          "item": [
            "object",
            "array",
            "string",
            "number",
            "yes",
            "no",
            "nil"
          ]
        }
      }
    },
    "object": {
      "examples": [
        {
          "source": "{\"title\": \"hello\"}",
          "value": {
            "kind": "object",
            "members": [
              {
                "key": "\"title\"",
                "value": {
                  "kind": "string",
                  "raw": "\"hello\""
                }
              }
            ]
          }
        }
      ],
      "fields": {
        "members": {
          "kind": "list",
          "item": [
            "member"
          ],
          "separator": ", "
        }
      }
    },
    "array": {
      "examples": [
        {
          "source": "[42]",
          "value": {
            "kind": "array",
            "items": [
              {
                "kind": "number",
                "raw": "42"
              }
            ]
          }
        }
      ],
      "fields": {
        "items": {
          "kind": "list",
          "item": [
            "object",
            "array",
            "string",
            "number",
            "yes",
            "no",
            "nil"
          ],
          "separator": ", "
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "{\"title\": \"hello\"}",
          "value": {
            "kind": "object",
            "members": [
              {
                "key": "\"title\"",
                "value": {
                  "kind": "string",
                  "raw": "\"hello\""
                }
              }
            ]
          }
        }
      ],
      "fields": {
        "": {
          "kind": "ref",
          "item": [
            "object",
            "array",
            "string",
            "number",
            "yes",
            "no",
            "nil"
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
  }
});
