import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "v0": {
      "examples": [
        {
          "source": "1.2.3-alpha.4+build.9",
          "value": {
            "major": "1",
            "minor": "2",
            "patch": "3",
            "prerelease": "alpha.4",
            "build": "build.9"
          }
        }
      ],
      "fields": {
        "major": {
          "kind": "text",
          "pattern": "(?:0|[1-9][0-9]*)",
          "token": true
        },
        "minor": {
          "kind": "text",
          "pattern": "(?:0|[1-9][0-9]*)",
          "token": true
        },
        "patch": {
          "kind": "text",
          "pattern": "(?:0|[1-9][0-9]*)",
          "token": true
        },
        "prerelease": {
          "kind": "text",
          "pattern": "[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*",
          "token": true
        },
        "build": {
          "kind": "text",
          "pattern": "[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*",
          "token": true
        }
      }
    },
    "v1": {
      "examples": [
        {
          "source": "1.2.3-alpha.4",
          "value": {
            "major": "1",
            "minor": "2",
            "patch": "3",
            "prerelease": "alpha.4"
          }
        }
      ],
      "fields": {
        "major": {
          "kind": "text",
          "pattern": "(?:0|[1-9][0-9]*)",
          "token": true
        },
        "minor": {
          "kind": "text",
          "pattern": "(?:0|[1-9][0-9]*)",
          "token": true
        },
        "patch": {
          "kind": "text",
          "pattern": "(?:0|[1-9][0-9]*)",
          "token": true
        },
        "prerelease": {
          "kind": "text",
          "pattern": "[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*",
          "token": true
        }
      }
    },
    "v2": {
      "examples": [
        {
          "source": "1.2.3+build.9",
          "value": {
            "major": "1",
            "minor": "2",
            "patch": "3",
            "build": "build.9"
          }
        }
      ],
      "fields": {
        "major": {
          "kind": "text",
          "pattern": "(?:0|[1-9][0-9]*)",
          "token": true
        },
        "minor": {
          "kind": "text",
          "pattern": "(?:0|[1-9][0-9]*)",
          "token": true
        },
        "patch": {
          "kind": "text",
          "pattern": "(?:0|[1-9][0-9]*)",
          "token": true
        },
        "build": {
          "kind": "text",
          "pattern": "[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*",
          "token": true
        }
      }
    },
    "v3": {
      "examples": [
        {
          "source": "1.2.3",
          "value": {
            "major": "1",
            "minor": "2",
            "patch": "3"
          }
        }
      ],
      "fields": {
        "major": {
          "kind": "text",
          "pattern": "(?:0|[1-9][0-9]*)",
          "token": true
        },
        "minor": {
          "kind": "text",
          "pattern": "(?:0|[1-9][0-9]*)",
          "token": true
        },
        "patch": {
          "kind": "text",
          "pattern": "(?:0|[1-9][0-9]*)",
          "token": true
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "1.2.3-alpha.4+build.9",
          "value": {
            "major": "1",
            "minor": "2",
            "patch": "3",
            "prerelease": "alpha.4",
            "build": "build.9"
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
