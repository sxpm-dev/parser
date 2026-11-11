import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "row": {
      "examples": [
        {
          "source": "alice,42",
          "value": {
            "cells": [
              "alice",
              "42"
            ]
          }
        }
      ],
      "fields": {
        "cells": {
          "kind": "list",
          "item": {
            "kind": "text",
            "pattern": "(?:\"(?:[^\"]|\"\")*\"|[^,\\r\\n\"]*)",
            "token": true,
            "allowEmpty": true
          },
          "separator": ",",
          "stop": [
            "\n"
          ]
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "alice,42",
          "value": {
            "rows": [
              {
                "cells": [
                  "alice",
                  "42"
                ]
              }
            ]
          }
        }
      ],
      "fields": {
        "rows": {
          "kind": "list",
          "item": [
            "row"
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
    "whitespace": "none"
  }
});
