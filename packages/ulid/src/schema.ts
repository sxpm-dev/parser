import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "root": {
      "examples": [
        {
          "source": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
          "value": {
            "value": "01ARZ3NDEKTSV4RRFFQ69G5FAV"
          }
        }
      ],
      "fields": {
        "value": {
          "kind": "text",
          "pattern": "[0-7][0-9A-HJKMNP-TV-Z]{25}",
          "token": true
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
