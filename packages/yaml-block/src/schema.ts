import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "entry": {
      "examples": [
        {
          "source": "title: Hello",
          "value": {
            "key": "title",
            "value": "Hello"
          }
        }
      ],
      "fields": {
        "key": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_-]*",
          "token": true
        },
        "value": {
          "kind": "text",
          "pattern": "[^\\r\\n]+",
          "token": true
        }
      }
    },
    "item": {
      "examples": [
        {
          "source": "- first",
          "value": {
            "item": "first"
          }
        }
      ],
      "fields": {
        "item": {
          "kind": "text",
          "pattern": "[^\\r\\n]+",
          "token": true
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "title: Hello",
          "value": {
            "items": [
              {
                "key": "title",
                "value": "Hello"
              }
            ]
          }
        }
      ],
      "fields": {
        "items": {
          "kind": "list",
          "item": [
            "indentedEntry",
            "indentedContainer",
            "indentedItem",
            "entry",
            "container",
            "item"
          ],
          "separator": "\n",
          "trailing": true
        }
      }
    },
    "container": {
      "examples": [
        {
          "source": "server:",
          "value": {
            "key": "server"
          }
        }
      ],
      "fields": {
        "key": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_-]*",
          "token": true
        }
      }
    },
    "indentedEntry": {
      "examples": [
        {
          "source": "  endpoint: example.org",
          "value": {
            "indent": "  ",
            "key": "endpoint",
            "value": "example.org"
          }
        }
      ],
      "fields": {
        "indent": {
          "kind": "text",
          "pattern": " +",
          "token": true
        },
        "key": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_-]*",
          "token": true
        },
        "value": {
          "kind": "text",
          "pattern": "[^\\r\\n]+",
          "token": true
        }
      }
    },
    "indentedContainer": {
      "examples": [
        {
          "source": "  nested:",
          "value": {
            "indent": "  ",
            "key": "nested"
          }
        }
      ],
      "fields": {
        "indent": {
          "kind": "text",
          "pattern": " +",
          "token": true
        },
        "key": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_-]*",
          "token": true
        }
      }
    },
    "indentedItem": {
      "examples": [
        {
          "source": "  - second",
          "value": {
            "indent": "  ",
            "item": "second"
          }
        }
      ],
      "fields": {
        "indent": {
          "kind": "text",
          "pattern": " +",
          "token": true
        },
        "item": {
          "kind": "text",
          "pattern": "[^\\r\\n]+",
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
  },
  "lexical": {
    "whitespace": "none"
  }
});
