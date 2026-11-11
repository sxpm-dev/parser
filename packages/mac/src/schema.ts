import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "form0": {
      "examples": [
        {
          "source": "0a:1b:2c:3d:4e:5f",
          "value": {
            "octets": [
              "0a",
              "1b",
              "2c",
              "3d",
              "4e",
              "5f"
            ]
          }
        }
      ],
      "fields": {
        "octets.0": {
          "kind": "text",
          "pattern": "[0-9A-Fa-f]{2}",
          "token": true
        },
        "octets.1": {
          "kind": "text",
          "pattern": "[0-9A-Fa-f]{2}",
          "token": true
        },
        "octets.2": {
          "kind": "text",
          "pattern": "[0-9A-Fa-f]{2}",
          "token": true
        },
        "octets.3": {
          "kind": "text",
          "pattern": "[0-9A-Fa-f]{2}",
          "token": true
        },
        "octets.4": {
          "kind": "text",
          "pattern": "[0-9A-Fa-f]{2}",
          "token": true
        },
        "octets.5": {
          "kind": "text",
          "pattern": "[0-9A-Fa-f]{2}",
          "token": true
        }
      }
    },
    "form1": {
      "examples": [
        {
          "source": "0a-1b-2c-3d-4e-5f",
          "value": {
            "octets": [
              "0a",
              "1b",
              "2c",
              "3d",
              "4e",
              "5f"
            ]
          }
        }
      ],
      "fields": {
        "octets.0": {
          "kind": "text",
          "pattern": "[0-9A-Fa-f]{2}",
          "token": true
        },
        "octets.1": {
          "kind": "text",
          "pattern": "[0-9A-Fa-f]{2}",
          "token": true
        },
        "octets.2": {
          "kind": "text",
          "pattern": "[0-9A-Fa-f]{2}",
          "token": true
        },
        "octets.3": {
          "kind": "text",
          "pattern": "[0-9A-Fa-f]{2}",
          "token": true
        },
        "octets.4": {
          "kind": "text",
          "pattern": "[0-9A-Fa-f]{2}",
          "token": true
        },
        "octets.5": {
          "kind": "text",
          "pattern": "[0-9A-Fa-f]{2}",
          "token": true
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "0a:1b:2c:3d:4e:5f",
          "value": {
            "octets": [
              "0a",
              "1b",
              "2c",
              "3d",
              "4e",
              "5f"
            ]
          }
        }
      ],
      "fields": {
        "": {
          "kind": "ref",
          "item": [
            "form0",
            "form1"
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
