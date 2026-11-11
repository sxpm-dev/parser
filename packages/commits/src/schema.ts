import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "v0": {
      "examples": [
        {
          "source": "feat(core)!: change API",
          "value": {
            "type": "feat",
            "scope": "core",
            "breaking": true,
            "subject": "change API"
          }
        }
      ],
      "fields": {
        "type": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_-]*",
          "token": true
        },
        "scope": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_-]*",
          "token": true
        },
        "subject": {
          "kind": "text",
          "pattern": "[^\\r\\n]+",
          "token": true
        }
      }
    },
    "v1": {
      "examples": [
        {
          "source": "fix(ui): repair focus",
          "value": {
            "type": "fix",
            "scope": "ui",
            "breaking": false,
            "subject": "repair focus"
          }
        }
      ],
      "fields": {
        "type": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_-]*",
          "token": true
        },
        "scope": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_-]*",
          "token": true
        },
        "subject": {
          "kind": "text",
          "pattern": "[^\\r\\n]+",
          "token": true
        }
      }
    },
    "v2": {
      "examples": [
        {
          "source": "feat!: change API",
          "value": {
            "type": "feat",
            "breaking": true,
            "subject": "change API"
          }
        }
      ],
      "fields": {
        "type": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_-]*",
          "token": true
        },
        "subject": {
          "kind": "text",
          "pattern": "[^\\r\\n]+",
          "token": true
        }
      }
    },
    "v3": {
      "examples": [
        {
          "source": "docs: update guide",
          "value": {
            "type": "docs",
            "breaking": false,
            "subject": "update guide"
          }
        }
      ],
      "fields": {
        "type": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_-]*",
          "token": true
        },
        "subject": {
          "kind": "text",
          "pattern": "[^\\r\\n]+",
          "token": true
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "feat(core)!: change API",
          "value": {
            "type": "feat",
            "scope": "core",
            "breaking": true,
            "subject": "change API"
          }
        }
      ],
      "fields": {
        "": {
          "kind": "ref",
          "item": [
            "v0",
            "v1",
            "v2",
            "v3"
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
