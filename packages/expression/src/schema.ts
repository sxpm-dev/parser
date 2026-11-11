import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "expr",
  "productions": {
    "identifier": {
      "examples": [
        {
          "source": "price",
          "value": {
            "kind": "identifier",
            "name": "price"
          }
        }
      ],
      "fields": {
        "name": {
          "kind": "text",
          "pattern": "[A-Za-z_$][A-Za-z0-9_$]*(?:\\.[A-Za-z_$][A-Za-z0-9_$]*)*",
          "token": true
        }
      }
    },
    "number": {
      "examples": [
        {
          "source": "2",
          "value": {
            "kind": "number",
            "raw": "2"
          }
        }
      ],
      "fields": {
        "raw": {
          "kind": "text",
          "pattern": "(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?(?:[eE][+-]?[0-9]+)?",
          "token": true
        }
      }
    },
    "string": {
      "examples": [
        {
          "source": "\"hello\"",
          "value": {
            "kind": "string",
            "raw": "\"hello\""
          }
        }
      ],
      "fields": {
        "raw": {
          "kind": "text",
          "pattern": "\"(?:[^\"\\\\\\x00-\\x1f]|\\\\(?:[\"\\\\/bfnrt]|u[0-9a-fA-F]{4}))*\"",
          "token": true
        }
      }
    },
    "atom": {
      "examples": [
        {
          "source": "price",
          "value": {
            "kind": "identifier",
            "name": "price"
          }
        },
        {
          "source": "2",
          "value": {
            "kind": "number",
            "raw": "2"
          }
        }
      ],
      "fields": {
        "": {
          "kind": "ref",
          "item": [
            "unary",
            "call",
            "tuple",
            "group",
            "number",
            "string",
            "identifier"
          ]
        }
      }
    },
    "productTail": {
      "examples": [
        {
          "source": "* 2",
          "value": {
            "operator": "*",
            "value": {
              "kind": "number",
              "raw": "2"
            }
          }
        }
      ],
      "fields": {
        "operator": {
          "kind": "text",
          "pattern": "[*/%]",
          "token": true
        },
        "value": {
          "kind": "ref",
          "item": [
            "atom"
          ]
        }
      }
    },
    "product": {
      "examples": [
        {
          "source": "price * 2",
          "value": {
            "head": {
              "kind": "identifier",
              "name": "price"
            },
            "tail": [
              {
                "operator": "*",
                "value": {
                  "kind": "number",
                  "raw": "2"
                }
              }
            ]
          }
        },
        {
          "source": "price",
          "value": {
            "head": {
              "kind": "identifier",
              "name": "price"
            },
            "tail": []
          }
        },
        {
          "source": "2",
          "value": {
            "head": {
              "kind": "number",
              "raw": "2"
            },
            "tail": []
          }
        }
      ],
      "fields": {
        "head": {
          "kind": "ref",
          "item": [
            "atom"
          ]
        },
        "tail": {
          "kind": "list",
          "item": [
            "productTail"
          ],
          "separator": " ",
          "whileMatches": true
        }
      }
    },
    "sumTail": {
      "examples": [
        {
          "source": "+ 2",
          "value": {
            "operator": "+",
            "value": {
              "head": {
                "kind": "number",
                "raw": "2"
              },
              "tail": []
            }
          }
        }
      ],
      "fields": {
        "operator": {
          "kind": "text",
          "pattern": "[+-]",
          "token": true
        },
        "value": {
          "kind": "ref",
          "item": [
            "product"
          ]
        }
      }
    },
    "sum": {
      "examples": [
        {
          "source": "price + 2",
          "value": {
            "head": {
              "head": {
                "kind": "identifier",
                "name": "price"
              },
              "tail": []
            },
            "tail": [
              {
                "operator": "+",
                "value": {
                  "head": {
                    "kind": "number",
                    "raw": "2"
                  },
                  "tail": []
                }
              }
            ]
          }
        },
        {
          "source": "price",
          "value": {
            "head": {
              "head": {
                "kind": "identifier",
                "name": "price"
              },
              "tail": []
            },
            "tail": []
          }
        },
        {
          "source": "2",
          "value": {
            "head": {
              "head": {
                "kind": "number",
                "raw": "2"
              },
              "tail": []
            },
            "tail": []
          }
        }
      ],
      "fields": {
        "head": {
          "kind": "ref",
          "item": [
            "product"
          ]
        },
        "tail": {
          "kind": "list",
          "item": [
            "sumTail"
          ],
          "separator": " ",
          "whileMatches": true
        }
      }
    },
    "compareTail": {
      "examples": [
        {
          "source": ">= 2",
          "value": {
            "operator": ">=",
            "value": {
              "head": {
                "head": {
                  "kind": "number",
                  "raw": "2"
                },
                "tail": []
              },
              "tail": []
            }
          }
        }
      ],
      "fields": {
        "operator": {
          "kind": "text",
          "pattern": "(?:===|!==|==|!=|>=|<=|>|<)",
          "token": true
        },
        "value": {
          "kind": "ref",
          "item": [
            "sum"
          ]
        }
      }
    },
    "compare": {
      "examples": [
        {
          "source": "price >= 2",
          "value": {
            "head": {
              "head": {
                "head": {
                  "kind": "identifier",
                  "name": "price"
                },
                "tail": []
              },
              "tail": []
            },
            "tail": [
              {
                "operator": ">=",
                "value": {
                  "head": {
                    "head": {
                      "kind": "number",
                      "raw": "2"
                    },
                    "tail": []
                  },
                  "tail": []
                }
              }
            ]
          }
        },
        {
          "source": "price",
          "value": {
            "head": {
              "head": {
                "head": {
                  "kind": "identifier",
                  "name": "price"
                },
                "tail": []
              },
              "tail": []
            },
            "tail": []
          }
        },
        {
          "source": "2",
          "value": {
            "head": {
              "head": {
                "head": {
                  "kind": "number",
                  "raw": "2"
                },
                "tail": []
              },
              "tail": []
            },
            "tail": []
          }
        }
      ],
      "fields": {
        "head": {
          "kind": "ref",
          "item": [
            "sum"
          ]
        },
        "tail": {
          "kind": "list",
          "item": [
            "compareTail"
          ],
          "separator": " ",
          "whileMatches": true
        }
      }
    },
    "andTail": {
      "examples": [
        {
          "source": "&& 2",
          "value": {
            "operator": "&&",
            "value": {
              "head": {
                "head": {
                  "head": {
                    "kind": "number",
                    "raw": "2"
                  },
                  "tail": []
                },
                "tail": []
              },
              "tail": []
            }
          }
        }
      ],
      "fields": {
        "operator": {
          "kind": "text",
          "pattern": "&&",
          "token": true
        },
        "value": {
          "kind": "ref",
          "item": [
            "compare"
          ]
        }
      }
    },
    "and": {
      "examples": [
        {
          "source": "price && 2",
          "value": {
            "head": {
              "head": {
                "head": {
                  "head": {
                    "kind": "identifier",
                    "name": "price"
                  },
                  "tail": []
                },
                "tail": []
              },
              "tail": []
            },
            "tail": [
              {
                "operator": "&&",
                "value": {
                  "head": {
                    "head": {
                      "head": {
                        "kind": "number",
                        "raw": "2"
                      },
                      "tail": []
                    },
                    "tail": []
                  },
                  "tail": []
                }
              }
            ]
          }
        },
        {
          "source": "price",
          "value": {
            "head": {
              "head": {
                "head": {
                  "head": {
                    "kind": "identifier",
                    "name": "price"
                  },
                  "tail": []
                },
                "tail": []
              },
              "tail": []
            },
            "tail": []
          }
        },
        {
          "source": "2",
          "value": {
            "head": {
              "head": {
                "head": {
                  "head": {
                    "kind": "number",
                    "raw": "2"
                  },
                  "tail": []
                },
                "tail": []
              },
              "tail": []
            },
            "tail": []
          }
        }
      ],
      "fields": {
        "head": {
          "kind": "ref",
          "item": [
            "compare"
          ]
        },
        "tail": {
          "kind": "list",
          "item": [
            "andTail"
          ],
          "separator": " ",
          "whileMatches": true
        }
      }
    },
    "exprTail": {
      "examples": [
        {
          "source": "|| 2",
          "value": {
            "operator": "||",
            "value": {
              "head": {
                "head": {
                  "head": {
                    "head": {
                      "kind": "number",
                      "raw": "2"
                    },
                    "tail": []
                  },
                  "tail": []
                },
                "tail": []
              },
              "tail": []
            }
          }
        }
      ],
      "fields": {
        "operator": {
          "kind": "text",
          "pattern": "\\|\\|",
          "token": true
        },
        "value": {
          "kind": "ref",
          "item": [
            "and"
          ]
        }
      }
    },
    "expr": {
      "examples": [
        {
          "source": "price || 2",
          "value": {
            "head": {
              "head": {
                "head": {
                  "head": {
                    "head": {
                      "kind": "identifier",
                      "name": "price"
                    },
                    "tail": []
                  },
                  "tail": []
                },
                "tail": []
              },
              "tail": []
            },
            "tail": [
              {
                "operator": "||",
                "value": {
                  "head": {
                    "head": {
                      "head": {
                        "head": {
                          "kind": "number",
                          "raw": "2"
                        },
                        "tail": []
                      },
                      "tail": []
                    },
                    "tail": []
                  },
                  "tail": []
                }
              }
            ]
          }
        },
        {
          "source": "price",
          "value": {
            "head": {
              "head": {
                "head": {
                  "head": {
                    "head": {
                      "kind": "identifier",
                      "name": "price"
                    },
                    "tail": []
                  },
                  "tail": []
                },
                "tail": []
              },
              "tail": []
            },
            "tail": []
          }
        },
        {
          "source": "2",
          "value": {
            "head": {
              "head": {
                "head": {
                  "head": {
                    "head": {
                      "kind": "number",
                      "raw": "2"
                    },
                    "tail": []
                  },
                  "tail": []
                },
                "tail": []
              },
              "tail": []
            },
            "tail": []
          }
        }
      ],
      "fields": {
        "head": {
          "kind": "ref",
          "item": [
            "and"
          ]
        },
        "tail": {
          "kind": "list",
          "item": [
            "exprTail"
          ],
          "separator": " ",
          "whileMatches": true
        }
      }
    },
    "group": {
      "examples": [
        {
          "source": "(price)",
          "value": {
            "kind": "group",
            "value": {
              "head": {
                "head": {
                  "head": {
                    "head": {
                      "head": {
                        "kind": "identifier",
                        "name": "price"
                      },
                      "tail": []
                    },
                    "tail": []
                  },
                  "tail": []
                },
                "tail": []
              },
              "tail": []
            }
          }
        }
      ],
      "fields": {
        "value": {
          "kind": "ref",
          "item": [
            "expr"
          ]
        }
      }
    },
    "call": {
      "examples": [
        {
          "source": "sum(2)",
          "value": {
            "kind": "call",
            "callee": "sum",
            "arguments": [
              {
                "head": {
                  "head": {
                    "head": {
                      "head": {
                        "head": {
                          "kind": "number",
                          "raw": "2"
                        },
                        "tail": []
                      },
                      "tail": []
                    },
                    "tail": []
                  },
                  "tail": []
                },
                "tail": []
              }
            ]
          }
        }
      ],
      "fields": {
        "callee": {
          "kind": "text",
          "pattern": "[A-Za-z_$][A-Za-z0-9_$]*",
          "token": true
        },
        "arguments": {
          "kind": "list",
          "item": [
            "expr"
          ],
          "separator": ", "
        }
      }
    },
    "unary": {
      "examples": [
        {
          "source": "-price",
          "value": {
            "kind": "unary",
            "operator": "-",
            "value": {
              "kind": "identifier",
              "name": "price"
            }
          }
        }
      ],
      "fields": {
        "operator": {
          "kind": "text",
          "pattern": "[!+-]",
          "token": true
        },
        "value": {
          "kind": "ref",
          "item": [
            "atom"
          ]
        }
      }
    },
    "tuple": {
      "examples": [
        {
          "source": "(price, 2)",
          "value": {
            "kind": "tuple",
            "items": [
              {
                "head": {
                  "head": {
                    "head": {
                      "head": {
                        "head": {
                          "kind": "identifier",
                          "name": "price"
                        },
                        "tail": []
                      },
                      "tail": []
                    },
                    "tail": []
                  },
                  "tail": []
                },
                "tail": []
              },
              {
                "head": {
                  "head": {
                    "head": {
                      "head": {
                        "head": {
                          "kind": "number",
                          "raw": "2"
                        },
                        "tail": []
                      },
                      "tail": []
                    },
                    "tail": []
                  },
                  "tail": []
                },
                "tail": []
              }
            ]
          }
        }
      ],
      "fields": {
        "items": {
          "kind": "list",
          "item": [
            "expr"
          ],
          "min": 2,
          "separator": ", "
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
