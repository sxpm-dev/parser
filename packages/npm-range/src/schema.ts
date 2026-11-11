import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "range": {
      "examples": [
        {
          "source": "1.2.3 - 4.5.6",
          "value": {
            "from": "1.2.3",
            "to": "4.5.6"
          }
        }
      ],
      "fields": {
        "from": {
          "kind": "text",
          "pattern": "(?:[0-9]+|[xX*])(?:\\.(?:[0-9]+|[xX*])){0,2}(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?",
          "token": true
        },
        "to": {
          "kind": "text",
          "pattern": "(?:[0-9]+|[xX*])(?:\\.(?:[0-9]+|[xX*])){0,2}(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?",
          "token": true
        }
      }
    },
    "op0": {
      "examples": [
        {
          "source": ">=1.2.3",
          "value": {
            "operator": ">=",
            "version": "1.2.3"
          }
        }
      ],
      "fields": {
        "version": {
          "kind": "text",
          "pattern": "(?:[0-9]+|[xX*])(?:\\.(?:[0-9]+|[xX*])){0,2}(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?",
          "token": true
        }
      }
    },
    "op1": {
      "examples": [
        {
          "source": "<=1.2.3",
          "value": {
            "operator": "<=",
            "version": "1.2.3"
          }
        }
      ],
      "fields": {
        "version": {
          "kind": "text",
          "pattern": "(?:[0-9]+|[xX*])(?:\\.(?:[0-9]+|[xX*])){0,2}(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?",
          "token": true
        }
      }
    },
    "op2": {
      "examples": [
        {
          "source": ">1.2.3",
          "value": {
            "operator": ">",
            "version": "1.2.3"
          }
        }
      ],
      "fields": {
        "version": {
          "kind": "text",
          "pattern": "(?:[0-9]+|[xX*])(?:\\.(?:[0-9]+|[xX*])){0,2}(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?",
          "token": true
        }
      }
    },
    "op3": {
      "examples": [
        {
          "source": "<1.2.3",
          "value": {
            "operator": "<",
            "version": "1.2.3"
          }
        }
      ],
      "fields": {
        "version": {
          "kind": "text",
          "pattern": "(?:[0-9]+|[xX*])(?:\\.(?:[0-9]+|[xX*])){0,2}(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?",
          "token": true
        }
      }
    },
    "op4": {
      "examples": [
        {
          "source": "~1.2.3",
          "value": {
            "operator": "~",
            "version": "1.2.3"
          }
        }
      ],
      "fields": {
        "version": {
          "kind": "text",
          "pattern": "(?:[0-9]+|[xX*])(?:\\.(?:[0-9]+|[xX*])){0,2}(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?",
          "token": true
        }
      }
    },
    "op5": {
      "examples": [
        {
          "source": "^1.2.3",
          "value": {
            "operator": "^",
            "version": "1.2.3"
          }
        }
      ],
      "fields": {
        "version": {
          "kind": "text",
          "pattern": "(?:[0-9]+|[xX*])(?:\\.(?:[0-9]+|[xX*])){0,2}(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?",
          "token": true
        }
      }
    },
    "op6": {
      "examples": [
        {
          "source": "=1.2.3",
          "value": {
            "operator": "=",
            "version": "1.2.3"
          }
        }
      ],
      "fields": {
        "version": {
          "kind": "text",
          "pattern": "(?:[0-9]+|[xX*])(?:\\.(?:[0-9]+|[xX*])){0,2}(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?",
          "token": true
        }
      }
    },
    "plain": {
      "examples": [
        {
          "source": "1.2.3",
          "value": {
            "operator": "",
            "version": "1.2.3"
          }
        }
      ],
      "fields": {
        "version": {
          "kind": "text",
          "pattern": "(?:[0-9]+|[xX*])(?:\\.(?:[0-9]+|[xX*])){0,2}(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?",
          "token": true
        }
      }
    },
    "set": {
      "examples": [
        {
          "source": "^1.2.3",
          "value": {
            "comparators": [
              {
                "operator": "^",
                "version": "1.2.3"
              }
            ]
          }
        }
      ],
      "fields": {
        "comparators": {
          "kind": "list",
          "item": [
            "range",
            "op0",
            "op1",
            "op2",
            "op3",
            "op4",
            "op5",
            "op6",
            "plain"
          ],
          "separator": " ",
          "min": 1,
          "whileMatches": true
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "^1.2.3",
          "value": {
            "sets": [
              {
                "comparators": [
                  {
                    "operator": "^",
                    "version": "1.2.3"
                  }
                ]
              }
            ]
          }
        }
      ],
      "fields": {
        "sets": {
          "kind": "list",
          "item": [
            "set"
          ],
          "separator": " || ",
          "min": 1
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
