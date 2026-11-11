import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "command": {
      "examples": [
        {
          "source": "5 12 23 10 6 npm test",
          "value": {
            "minute": "5",
            "hour": "12",
            "dayOfMonth": "23",
            "month": "10",
            "dayOfWeek": "6",
            "command": "npm test"
          }
        }
      ],
      "fields": {
        "minute": {
          "kind": "text",
          "pattern": "[0-9A-Za-z*/?,#L-]+",
          "token": true
        },
        "hour": {
          "kind": "text",
          "pattern": "[0-9A-Za-z*/?,#L-]+",
          "token": true
        },
        "dayOfMonth": {
          "kind": "text",
          "pattern": "[0-9A-Za-z*/?,#L-]+",
          "token": true
        },
        "month": {
          "kind": "text",
          "pattern": "[0-9A-Za-z*/?,#L-]+",
          "token": true
        },
        "dayOfWeek": {
          "kind": "text",
          "pattern": "[0-9A-Za-z*/?,#L-]+",
          "token": true
        },
        "command": {
          "kind": "text",
          "pattern": "[^\\r\\n]+",
          "token": true
        }
      }
    },
    "schedule": {
      "examples": [
        {
          "source": "5 12 23 10 6",
          "value": {
            "minute": "5",
            "hour": "12",
            "dayOfMonth": "23",
            "month": "10",
            "dayOfWeek": "6"
          }
        }
      ],
      "fields": {
        "minute": {
          "kind": "text",
          "pattern": "[0-9A-Za-z*/?,#L-]+",
          "token": true
        },
        "hour": {
          "kind": "text",
          "pattern": "[0-9A-Za-z*/?,#L-]+",
          "token": true
        },
        "dayOfMonth": {
          "kind": "text",
          "pattern": "[0-9A-Za-z*/?,#L-]+",
          "token": true
        },
        "month": {
          "kind": "text",
          "pattern": "[0-9A-Za-z*/?,#L-]+",
          "token": true
        },
        "dayOfWeek": {
          "kind": "text",
          "pattern": "[0-9A-Za-z*/?,#L-]+",
          "token": true
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "5 12 23 10 6",
          "value": {
            "minute": "5",
            "hour": "12",
            "dayOfMonth": "23",
            "month": "10",
            "dayOfWeek": "6"
          }
        }
      ],
      "fields": {
        "": {
          "kind": "ref",
          "item": [
            "command",
            "schedule"
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
