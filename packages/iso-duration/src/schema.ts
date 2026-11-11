import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "years": {
      "examples": [
        {
          "source": "12Y",
          "value": {
            "unit": "Y",
            "amount": "12"
          }
        }
      ],
      "fields": {
        "amount": {
          "kind": "text",
          "pattern": "[0-9]+(?:\\.[0-9]+)?",
          "token": true
        }
      }
    },
    "months": {
      "examples": [
        {
          "source": "12M",
          "value": {
            "unit": "M",
            "amount": "12"
          }
        }
      ],
      "fields": {
        "amount": {
          "kind": "text",
          "pattern": "[0-9]+(?:\\.[0-9]+)?",
          "token": true
        }
      }
    },
    "weeks": {
      "examples": [
        {
          "source": "12W",
          "value": {
            "unit": "W",
            "amount": "12"
          }
        }
      ],
      "fields": {
        "amount": {
          "kind": "text",
          "pattern": "[0-9]+(?:\\.[0-9]+)?",
          "token": true
        }
      }
    },
    "days": {
      "examples": [
        {
          "source": "12D",
          "value": {
            "unit": "D",
            "amount": "12"
          }
        }
      ],
      "fields": {
        "amount": {
          "kind": "text",
          "pattern": "[0-9]+(?:\\.[0-9]+)?",
          "token": true
        }
      }
    },
    "hours": {
      "examples": [
        {
          "source": "12H",
          "value": {
            "unit": "H",
            "amount": "12"
          }
        }
      ],
      "fields": {
        "amount": {
          "kind": "text",
          "pattern": "[0-9]+(?:\\.[0-9]+)?",
          "token": true
        }
      }
    },
    "seconds": {
      "examples": [
        {
          "source": "12S",
          "value": {
            "unit": "S",
            "amount": "12"
          }
        }
      ],
      "fields": {
        "amount": {
          "kind": "text",
          "pattern": "[0-9]+(?:\\.[0-9]+)?",
          "token": true
        }
      }
    },
    "combined": {
      "examples": [
        {
          "source": "P12DT34H",
          "value": {
            "date": [
              {
                "unit": "D",
                "amount": "12"
              }
            ],
            "time": [
              {
                "unit": "H",
                "amount": "34"
              }
            ]
          }
        }
      ],
      "fields": {
        "date": {
          "kind": "list",
          "item": [
            "years",
            "months",
            "weeks",
            "days"
          ],
          "separator": ""
        },
        "time": {
          "kind": "list",
          "item": [
            "hours",
            "months",
            "seconds"
          ],
          "min": 1,
          "separator": ""
        }
      }
    },
    "dateOnly": {
      "examples": [
        {
          "source": "P12D",
          "value": {
            "date": [
              {
                "unit": "D",
                "amount": "12"
              }
            ]
          }
        }
      ],
      "fields": {
        "date": {
          "kind": "list",
          "item": [
            "years",
            "months",
            "weeks",
            "days"
          ],
          "min": 1,
          "separator": ""
        }
      }
    },
    "timeOnly": {
      "examples": [
        {
          "source": "PT12H",
          "value": {
            "time": [
              {
                "unit": "H",
                "amount": "12"
              }
            ]
          }
        }
      ],
      "fields": {
        "time": {
          "kind": "list",
          "item": [
            "hours",
            "months",
            "seconds"
          ],
          "min": 1,
          "separator": ""
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "P12DT34H",
          "value": {
            "date": [
              {
                "unit": "D",
                "amount": "12"
              }
            ],
            "time": [
              {
                "unit": "H",
                "amount": "34"
              }
            ]
          }
        }
      ],
      "fields": {
        "": {
          "kind": "ref",
          "item": [
            "combined",
            "dateOnly",
            "timeOnly"
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
