import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "withWhere": {
      "examples": [
        {
          "source": "SELECT id, name FROM users WHERE active = TRUE;",
          "value": {
            "columns": [
              "id",
              "name"
            ],
            "from": "users",
            "where": "active = TRUE"
          }
        }
      ],
      "fields": {
        "columns": {
          "kind": "list",
          "item": {
            "kind": "text",
            "pattern": "[A-Za-z_][A-Za-z0-9_.*]*",
            "token": true
          },
          "separator": ", "
        },
        "from": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_-]*",
          "token": true
        },
        "where": {
          "kind": "text",
          "balanced": true
        }
      }
    },
    "select": {
      "examples": [
        {
          "source": "SELECT id, name FROM users;",
          "value": {
            "columns": [
              "id",
              "name"
            ],
            "from": "users"
          }
        }
      ],
      "fields": {
        "columns": {
          "kind": "list",
          "item": {
            "kind": "text",
            "pattern": "[A-Za-z_][A-Za-z0-9_.*]*",
            "token": true
          },
          "separator": ", "
        },
        "from": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_-]*",
          "token": true
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "SELECT id, name FROM users WHERE active = TRUE;",
          "value": {
            "columns": [
              "id",
              "name"
            ],
            "from": "users",
            "where": "active = TRUE"
          }
        }
      ],
      "fields": {
        "": {
          "kind": "ref",
          "item": [
            "withWhere",
            "select"
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
