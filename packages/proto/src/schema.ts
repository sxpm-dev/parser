import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "syntax": {
      "examples": [
        {
          "source": "syntax = \"proto3\";",
          "value": {
            "syntax": "\"proto3\""
          }
        }
      ],
      "fields": {
        "syntax": {
          "kind": "text",
          "pattern": "\"(?:[^\"\\\\\\x00-\\x1f]|\\\\(?:[\"\\\\/bfnrt]|u[0-9a-fA-F]{4}))*\"",
          "token": true
        }
      }
    },
    "field": {
      "examples": [
        {
          "source": "string name = 1;",
          "value": {
            "type": "string",
            "name": "name",
            "number": "1"
          }
        }
      ],
      "fields": {
        "type": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_-]*",
          "token": true
        },
        "name": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_-]*",
          "token": true
        },
        "number": {
          "kind": "text",
          "pattern": "(?:0|[1-9][0-9]*)",
          "token": true
        }
      }
    },
    "repeated": {
      "examples": [
        {
          "source": "repeated string tags = 2;",
          "value": {
            "modifier": "repeated",
            "type": "string",
            "name": "tags",
            "number": "2"
          }
        }
      ],
      "fields": {
        "type": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_-]*",
          "token": true
        },
        "name": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_-]*",
          "token": true
        },
        "number": {
          "kind": "text",
          "pattern": "(?:0|[1-9][0-9]*)",
          "token": true
        }
      }
    },
    "message": {
      "examples": [
        {
          "source": "message User { string name = 1; }",
          "value": {
            "message": "User",
            "fields": [
              {
                "type": "string",
                "name": "name",
                "number": "1"
              }
            ]
          }
        }
      ],
      "fields": {
        "message": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_-]*",
          "token": true
        },
        "fields": {
          "kind": "list",
          "item": [
            "message",
            "enum",
            "repeated",
            "optional",
            "field"
          ],
          "separator": " "
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "syntax = \"proto3\"; message User { string name = 1; }",
          "value": {
            "declarations": [
              {
                "syntax": "\"proto3\""
              },
              {
                "message": "User",
                "fields": [
                  {
                    "type": "string",
                    "name": "name",
                    "number": "1"
                  }
                ]
              }
            ]
          }
        }
      ],
      "fields": {
        "declarations": {
          "kind": "list",
          "item": [
            "syntax",
            "package",
            "import",
            "message",
            "enum",
            "service"
          ],
          "separator": " "
        }
      }
    },
    "package": {
      "examples": [
        {
          "source": "package example.v1;",
          "value": {
            "package": "example.v1"
          }
        }
      ],
      "fields": {
        "package": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_.]*",
          "token": true
        }
      }
    },
    "import": {
      "examples": [
        {
          "source": "import \"common.proto\";",
          "value": {
            "import": "\"common.proto\""
          }
        }
      ],
      "fields": {
        "import": {
          "kind": "text",
          "pattern": "\"(?:[^\"\\\\\\x00-\\x1f]|\\\\(?:[\"\\\\/bfnrt]|u[0-9a-fA-F]{4}))*\"",
          "token": true
        }
      }
    },
    "optional": {
      "examples": [
        {
          "source": "optional string country = 3;",
          "value": {
            "modifier": "optional",
            "type": "string",
            "name": "country",
            "number": "3"
          }
        }
      ],
      "fields": {
        "type": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_]*",
          "token": true
        },
        "name": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_]*",
          "token": true
        },
        "number": {
          "kind": "text",
          "pattern": "[0-9]+",
          "token": true
        }
      }
    },
    "enumValue": {
      "examples": [
        {
          "source": "ACTIVE = 0;",
          "value": {
            "name": "ACTIVE",
            "number": "0"
          }
        }
      ],
      "fields": {
        "name": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_]*",
          "token": true
        },
        "number": {
          "kind": "text",
          "pattern": "-?[0-9]+",
          "token": true
        }
      }
    },
    "enum": {
      "examples": [
        {
          "source": "enum Status { ACTIVE = 0; }",
          "value": {
            "enum": "Status",
            "values": [
              {
                "name": "ACTIVE",
                "number": "0"
              }
            ]
          }
        }
      ],
      "fields": {
        "enum": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_]*",
          "token": true
        },
        "values": {
          "kind": "list",
          "item": [
            "enumValue"
          ],
          "separator": " "
        }
      }
    },
    "rpc": {
      "examples": [
        {
          "source": "rpc Fetch(Input) returns (Output);",
          "value": {
            "rpc": "Fetch",
            "request": "Input",
            "response": "Output"
          }
        }
      ],
      "fields": {
        "rpc": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_]*",
          "token": true
        },
        "request": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_]*",
          "token": true
        },
        "response": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_]*",
          "token": true
        }
      }
    },
    "service": {
      "examples": [
        {
          "source": "service Users { rpc Fetch(Input) returns (Output); }",
          "value": {
            "service": "Users",
            "methods": [
              {
                "rpc": "Fetch",
                "request": "Input",
                "response": "Output"
              }
            ]
          }
        }
      ],
      "fields": {
        "service": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_]*",
          "token": true
        },
        "methods": {
          "kind": "list",
          "item": [
            "rpc"
          ],
          "separator": " "
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
    "comments": [
      [
        "//",
        "\n"
      ],
      [
        "/*",
        "*/"
      ]
    ]
  }
});
