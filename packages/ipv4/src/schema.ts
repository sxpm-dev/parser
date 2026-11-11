import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "root": {
      "examples": [
        {
          "source": "192.168.10.24",
          "value": {
            "octets": [
              "192",
              "168",
              "10",
              "24"
            ]
          }
        }
      ],
      "fields": {
        "octets.0": {
          "kind": "text",
          "pattern": "(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])",
          "token": true
        },
        "octets.1": {
          "kind": "text",
          "pattern": "(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])",
          "token": true
        },
        "octets.2": {
          "kind": "text",
          "pattern": "(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])",
          "token": true
        },
        "octets.3": {
          "kind": "text",
          "pattern": "(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])",
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
