import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "param": {
      "examples": [
        {
          "source": ":id",
          "value": {
            "kind": "param",
            "name": "id"
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
    "wild": {
      "examples": [
        {
          "source": "*",
          "value": {
            "kind": "wildcard"
          }
        }
      ],
      "fields": {}
    },
    "static": {
      "examples": [
        {
          "source": "users",
          "value": {
            "kind": "literal",
            "name": "users"
          }
        }
      ],
      "fields": {
        "name": {
          "kind": "text",
          "pattern": "[^/\\s:*]+",
          "token": true
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "/users/:id",
          "value": {
            "segments": [
              {
                "kind": "literal",
                "name": "users"
              },
              {
                "kind": "param",
                "name": "id"
              }
            ]
          }
        }
      ],
      "fields": {
        "segments": {
          "kind": "list",
          "item": [
            "param",
            "wild",
            "static"
          ],
          "separator": "/"
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
