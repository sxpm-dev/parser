import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "comment": {
      "examples": [
        {
          "source": "<!--hello-->",
          "value": {
            "kind": "comment",
            "text": "hello"
          }
        }
      ],
      "fields": {
        "text": {
          "kind": "text",
          "stop": [
            "-->"
          ]
        }
      }
    },
    "close": {
      "examples": [
        {
          "source": "</div>",
          "value": {
            "kind": "close",
            "name": "div"
          }
        }
      ],
      "fields": {
        "name": {
          "kind": "text",
          "pattern": "[A-Za-z][A-Za-z0-9:-]*",
          "token": true
        }
      }
    },
    "tag": {
      "examples": [
        {
          "source": "<div class=\"card\">",
          "value": {
            "kind": "tag",
            "name": "div",
            "attributes": "class=\"card\""
          }
        }
      ],
      "fields": {
        "name": {
          "kind": "text",
          "pattern": "[A-Za-z][A-Za-z0-9:-]*",
          "token": true
        },
        "attributes": {
          "kind": "text",
          "balanced": true
        }
      }
    },
    "bare": {
      "examples": [
        {
          "source": "<section>",
          "value": {
            "kind": "tag",
            "name": "section"
          }
        }
      ],
      "fields": {
        "name": {
          "kind": "text",
          "pattern": "[A-Za-z][A-Za-z0-9:-]*",
          "token": true
        }
      }
    },
    "text": {
      "examples": [
        {
          "source": "hello",
          "value": {
            "kind": "text",
            "text": "hello"
          }
        }
      ],
      "fields": {
        "text": {
          "kind": "text",
          "pattern": "[^<]+",
          "token": true
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "<section>hello</section>",
          "value": {
            "tokens": [
              {
                "kind": "tag",
                "name": "section"
              },
              {
                "kind": "text",
                "text": "hello"
              },
              {
                "kind": "close",
                "name": "section"
              }
            ]
          }
        }
      ],
      "fields": {
        "tokens": {
          "kind": "list",
          "item": [
            "script",
            "style",
            "comment",
            "close",
            "tag",
            "bare",
            "text"
          ],
          "separator": ""
        }
      }
    },
    "script": {
      "examples": [
        {
          "source": "<script>a < b</script>",
          "value": {
            "kind": "raw-element",
            "name": "script",
            "text": "a < b"
          }
        }
      ],
      "fields": {
        "text": {
          "kind": "text"
        }
      }
    },
    "style": {
      "examples": [
        {
          "source": "<style>a < b</style>",
          "value": {
            "kind": "raw-element",
            "name": "style",
            "text": "a < b"
          }
        }
      ],
      "fields": {
        "text": {
          "kind": "text"
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
    "whitespace": "none",
    "pairs": [],
    "escape": ""
  }
});
