import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "expression",
  "productions": {
    "license": {
      "examples": [
        {
          "source": "MIT",
          "value": {
            "license": "MIT"
          }
        }
      ],
      "fields": {
        "license": {
          "kind": "text",
          "pattern": "[A-Za-z0-9][A-Za-z0-9.+-]*",
          "token": true
        }
      }
    },
    "exception": {
      "examples": [
        {
          "source": "GPL-2.0-only WITH Classpath-exception-2.0",
          "value": {
            "license": "GPL-2.0-only",
            "exception": "Classpath-exception-2.0"
          }
        }
      ],
      "fields": {
        "license": {
          "kind": "text",
          "pattern": "[A-Za-z0-9][A-Za-z0-9.+-]*",
          "token": true
        },
        "exception": {
          "kind": "text",
          "pattern": "[A-Za-z0-9][A-Za-z0-9.-]*",
          "token": true
        }
      }
    },
    "group": {
      "examples": [
        {
          "source": "(MIT)",
          "value": {
            "group": {
              "head": {
                "license": "MIT"
              },
              "tail": []
            }
          }
        }
      ],
      "fields": {
        "group": {
          "kind": "ref",
          "item": [
            "expression"
          ]
        }
      }
    },
    "term": {
      "examples": [
        {
          "source": "MIT",
          "value": {
            "license": "MIT"
          }
        }
      ],
      "fields": {
        "": {
          "kind": "ref",
          "item": [
            "group",
            "exception",
            "license"
          ]
        }
      }
    },
    "tail": {
      "examples": [
        {
          "source": "OR Apache-2.0",
          "value": {
            "operator": "OR",
            "value": {
              "license": "Apache-2.0"
            }
          }
        }
      ],
      "fields": {
        "operator": {
          "kind": "text",
          "pattern": "(?:AND|OR)",
          "token": true
        },
        "value": {
          "kind": "ref",
          "item": [
            "term"
          ]
        }
      }
    },
    "expression": {
      "examples": [
        {
          "source": "MIT OR Apache-2.0",
          "value": {
            "head": {
              "license": "MIT"
            },
            "tail": [
              {
                "operator": "OR",
                "value": {
                  "license": "Apache-2.0"
                }
              }
            ]
          }
        },
        {
          "source": "MIT",
          "value": {
            "head": {
              "license": "MIT"
            },
            "tail": []
          }
        }
      ],
      "fields": {
        "head": {
          "kind": "ref",
          "item": [
            "term"
          ]
        },
        "tail": {
          "kind": "list",
          "item": [
            "tail"
          ],
          "separator": " ",
          "whileMatches": true
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
