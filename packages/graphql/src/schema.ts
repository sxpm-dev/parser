import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "field0": {
      "examples": [
        {
          "source": "profile: viewer(id: 42) { name }",
          "value": {
            "alias": "profile",
            "name": "viewer",
            "arguments": "id: 42",
            "selection": [
              {
                "name": "name"
              }
            ]
          }
        }
      ],
      "fields": {
        "alias": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_]*",
          "token": true
        },
        "name": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_]*",
          "token": true
        },
        "arguments": {
          "kind": "text",
          "balanced": true
        },
        "selection": {
          "kind": "list",
          "item": [
            "spread",
            "field0",
            "field1",
            "field2",
            "field3",
            "field4",
            "field5",
            "field6",
            "field7"
          ],
          "min": 1,
          "separator": " "
        }
      }
    },
    "field1": {
      "examples": [
        {
          "source": "profile: viewer(id: 42)",
          "value": {
            "alias": "profile",
            "name": "viewer",
            "arguments": "id: 42"
          }
        }
      ],
      "fields": {
        "alias": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_]*",
          "token": true
        },
        "name": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_]*",
          "token": true
        },
        "arguments": {
          "kind": "text",
          "balanced": true
        }
      }
    },
    "field2": {
      "examples": [
        {
          "source": "profile: viewer { name }",
          "value": {
            "alias": "profile",
            "name": "viewer",
            "selection": [
              {
                "name": "name"
              }
            ]
          }
        }
      ],
      "fields": {
        "alias": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_]*",
          "token": true
        },
        "name": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_]*",
          "token": true
        },
        "selection": {
          "kind": "list",
          "item": [
            "spread",
            "field0",
            "field1",
            "field2",
            "field3",
            "field4",
            "field5",
            "field6",
            "field7"
          ],
          "min": 1,
          "separator": " "
        }
      }
    },
    "field3": {
      "examples": [
        {
          "source": "profile: viewer",
          "value": {
            "alias": "profile",
            "name": "viewer"
          }
        }
      ],
      "fields": {
        "alias": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_]*",
          "token": true
        },
        "name": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_]*",
          "token": true
        }
      }
    },
    "field4": {
      "examples": [
        {
          "source": "viewer(id: 42) { name }",
          "value": {
            "name": "viewer",
            "arguments": "id: 42",
            "selection": [
              {
                "name": "name"
              }
            ]
          }
        }
      ],
      "fields": {
        "name": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_]*",
          "token": true
        },
        "arguments": {
          "kind": "text",
          "balanced": true
        },
        "selection": {
          "kind": "list",
          "item": [
            "spread",
            "field0",
            "field1",
            "field2",
            "field3",
            "field4",
            "field5",
            "field6",
            "field7"
          ],
          "min": 1,
          "separator": " "
        }
      }
    },
    "field5": {
      "examples": [
        {
          "source": "viewer(id: 42)",
          "value": {
            "name": "viewer",
            "arguments": "id: 42"
          }
        }
      ],
      "fields": {
        "name": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_]*",
          "token": true
        },
        "arguments": {
          "kind": "text",
          "balanced": true
        }
      }
    },
    "field6": {
      "examples": [
        {
          "source": "viewer { name }",
          "value": {
            "name": "viewer",
            "selection": [
              {
                "name": "name"
              }
            ]
          }
        }
      ],
      "fields": {
        "name": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_]*",
          "token": true
        },
        "selection": {
          "kind": "list",
          "item": [
            "spread",
            "field0",
            "field1",
            "field2",
            "field3",
            "field4",
            "field5",
            "field6",
            "field7"
          ],
          "min": 1,
          "separator": " "
        }
      }
    },
    "field7": {
      "examples": [
        {
          "source": "viewer",
          "value": {
            "name": "viewer"
          }
        }
      ],
      "fields": {
        "name": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_]*",
          "token": true
        }
      }
    },
    "spread": {
      "examples": [
        {
          "source": "...UserFields",
          "value": {
            "spread": "UserFields"
          }
        }
      ],
      "fields": {
        "spread": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_]*",
          "token": true
        }
      }
    },
    "queryTrue": {
      "examples": [
        {
          "source": "query Report($id: ID!) { name }",
          "value": {
            "operation": "query",
            "name": "Report",
            "variables": "$id: ID!",
            "selection": [
              {
                "name": "name"
              }
            ]
          }
        }
      ],
      "fields": {
        "name": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_]*",
          "token": true
        },
        "variables": {
          "kind": "text",
          "balanced": true
        },
        "selection": {
          "kind": "list",
          "item": [
            "spread",
            "field0",
            "field1",
            "field2",
            "field3",
            "field4",
            "field5",
            "field6",
            "field7"
          ],
          "min": 1,
          "separator": " "
        }
      }
    },
    "queryFalse": {
      "examples": [
        {
          "source": "query Report { name }",
          "value": {
            "operation": "query",
            "name": "Report",
            "selection": [
              {
                "name": "name"
              }
            ]
          }
        }
      ],
      "fields": {
        "name": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_]*",
          "token": true
        },
        "selection": {
          "kind": "list",
          "item": [
            "spread",
            "field0",
            "field1",
            "field2",
            "field3",
            "field4",
            "field5",
            "field6",
            "field7"
          ],
          "min": 1,
          "separator": " "
        }
      }
    },
    "mutationTrue": {
      "examples": [
        {
          "source": "mutation Report($id: ID!) { name }",
          "value": {
            "operation": "mutation",
            "name": "Report",
            "variables": "$id: ID!",
            "selection": [
              {
                "name": "name"
              }
            ]
          }
        }
      ],
      "fields": {
        "name": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_]*",
          "token": true
        },
        "variables": {
          "kind": "text",
          "balanced": true
        },
        "selection": {
          "kind": "list",
          "item": [
            "spread",
            "field0",
            "field1",
            "field2",
            "field3",
            "field4",
            "field5",
            "field6",
            "field7"
          ],
          "min": 1,
          "separator": " "
        }
      }
    },
    "mutationFalse": {
      "examples": [
        {
          "source": "mutation Report { name }",
          "value": {
            "operation": "mutation",
            "name": "Report",
            "selection": [
              {
                "name": "name"
              }
            ]
          }
        }
      ],
      "fields": {
        "name": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_]*",
          "token": true
        },
        "selection": {
          "kind": "list",
          "item": [
            "spread",
            "field0",
            "field1",
            "field2",
            "field3",
            "field4",
            "field5",
            "field6",
            "field7"
          ],
          "min": 1,
          "separator": " "
        }
      }
    },
    "subscriptionTrue": {
      "examples": [
        {
          "source": "subscription Report($id: ID!) { name }",
          "value": {
            "operation": "subscription",
            "name": "Report",
            "variables": "$id: ID!",
            "selection": [
              {
                "name": "name"
              }
            ]
          }
        }
      ],
      "fields": {
        "name": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_]*",
          "token": true
        },
        "variables": {
          "kind": "text",
          "balanced": true
        },
        "selection": {
          "kind": "list",
          "item": [
            "spread",
            "field0",
            "field1",
            "field2",
            "field3",
            "field4",
            "field5",
            "field6",
            "field7"
          ],
          "min": 1,
          "separator": " "
        }
      }
    },
    "subscriptionFalse": {
      "examples": [
        {
          "source": "subscription Report { name }",
          "value": {
            "operation": "subscription",
            "name": "Report",
            "selection": [
              {
                "name": "name"
              }
            ]
          }
        }
      ],
      "fields": {
        "name": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_]*",
          "token": true
        },
        "selection": {
          "kind": "list",
          "item": [
            "spread",
            "field0",
            "field1",
            "field2",
            "field3",
            "field4",
            "field5",
            "field6",
            "field7"
          ],
          "min": 1,
          "separator": " "
        }
      }
    },
    "anonymous": {
      "examples": [
        {
          "source": "{ name }",
          "value": {
            "operation": "query",
            "selection": [
              {
                "name": "name"
              }
            ]
          }
        }
      ],
      "fields": {
        "selection": {
          "kind": "list",
          "item": [
            "spread",
            "field0",
            "field1",
            "field2",
            "field3",
            "field4",
            "field5",
            "field6",
            "field7"
          ],
          "min": 1,
          "separator": " "
        }
      }
    },
    "fragment": {
      "examples": [
        {
          "source": "fragment ProfileFields on Account { name }",
          "value": {
            "fragment": "ProfileFields",
            "on": "Account",
            "selection": [
              {
                "name": "name"
              }
            ]
          }
        }
      ],
      "fields": {
        "fragment": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_]*",
          "token": true
        },
        "on": {
          "kind": "text",
          "pattern": "[A-Za-z_][A-Za-z0-9_]*",
          "token": true
        },
        "selection": {
          "kind": "list",
          "item": [
            "spread",
            "field0",
            "field1",
            "field2",
            "field3",
            "field4",
            "field5",
            "field6",
            "field7"
          ],
          "min": 1,
          "separator": " "
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "query Report { name }",
          "value": {
            "definitions": [
              {
                "operation": "query",
                "name": "Report",
                "selection": [
                  {
                    "name": "name"
                  }
                ]
              }
            ]
          }
        }
      ],
      "fields": {
        "definitions": {
          "kind": "list",
          "item": [
            "queryTrue",
            "queryFalse",
            "mutationTrue",
            "mutationFalse",
            "subscriptionTrue",
            "subscriptionFalse",
            "anonymous",
            "fragment"
          ],
          "min": 1,
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
        "#",
        "\n"
      ]
    ]
  }
});
