import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "member": {
      "examples": [
        {
          "source": "\"title\": \"hello\"",
          "value": {
            "key": "\"title\"",
            "raw": "\"hello\""
          }
        }
      ],
      "fields": {
        "key": {
          "kind": "text",
          "pattern": "\"(?:[^\"\\\\\\x00-\\x1f]|\\\\(?:[\"\\\\/bfnrt]|u[0-9a-fA-F]{4}))*\"",
          "token": true
        },
        "raw": {
          "kind": "text",
          "balanced": true,
          "stop": [
            ",",
            "}"
          ]
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "{\"title\": \"hello\"}",
          "value": {
            "members": [
              {
                "key": "\"title\"",
                "raw": "\"hello\""
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
    }
  },
  "encodings": {
    "json": {
      "from": "value",
      "format": "json"
    }
  }
});
