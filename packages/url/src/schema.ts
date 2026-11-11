import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "form0": {
      "examples": [
        {
          "source": "https://example.org/docs?q=hello#top",
          "value": {
            "scheme": "https",
            "authority": "example.org",
            "path": "/docs",
            "query": "q=hello",
            "fragment": "top"
          }
        }
      ],
      "fields": {
        "scheme": {
          "kind": "text",
          "pattern": "[A-Za-z][A-Za-z0-9+.-]*",
          "token": true
        },
        "authority": {
          "kind": "text",
          "pattern": "[^/?#\\s]+",
          "token": true
        },
        "path": {
          "kind": "text",
          "pattern": "/[^?#\\s]*",
          "token": true
        },
        "query": {
          "kind": "text",
          "pattern": "[^#\\s]+",
          "token": true
        },
        "fragment": {
          "kind": "text",
          "pattern": "[^\\s]+",
          "token": true
        }
      }
    },
    "form1": {
      "examples": [
        {
          "source": "https://example.org/docs?q=hello",
          "value": {
            "scheme": "https",
            "authority": "example.org",
            "path": "/docs",
            "query": "q=hello"
          }
        }
      ],
      "fields": {
        "scheme": {
          "kind": "text",
          "pattern": "[A-Za-z][A-Za-z0-9+.-]*",
          "token": true
        },
        "authority": {
          "kind": "text",
          "pattern": "[^/?#\\s]+",
          "token": true
        },
        "path": {
          "kind": "text",
          "pattern": "/[^?#\\s]*",
          "token": true
        },
        "query": {
          "kind": "text",
          "pattern": "[^#\\s]+",
          "token": true
        }
      }
    },
    "form2": {
      "examples": [
        {
          "source": "https://example.org/docs#top",
          "value": {
            "scheme": "https",
            "authority": "example.org",
            "path": "/docs",
            "fragment": "top"
          }
        }
      ],
      "fields": {
        "scheme": {
          "kind": "text",
          "pattern": "[A-Za-z][A-Za-z0-9+.-]*",
          "token": true
        },
        "authority": {
          "kind": "text",
          "pattern": "[^/?#\\s]+",
          "token": true
        },
        "path": {
          "kind": "text",
          "pattern": "/[^?#\\s]*",
          "token": true
        },
        "fragment": {
          "kind": "text",
          "pattern": "[^\\s]+",
          "token": true
        }
      }
    },
    "form3": {
      "examples": [
        {
          "source": "https://example.org/docs",
          "value": {
            "scheme": "https",
            "authority": "example.org",
            "path": "/docs"
          }
        }
      ],
      "fields": {
        "scheme": {
          "kind": "text",
          "pattern": "[A-Za-z][A-Za-z0-9+.-]*",
          "token": true
        },
        "authority": {
          "kind": "text",
          "pattern": "[^/?#\\s]+",
          "token": true
        },
        "path": {
          "kind": "text",
          "pattern": "/[^?#\\s]*",
          "token": true
        }
      }
    },
    "form4": {
      "examples": [
        {
          "source": "/docs?q=hello#top",
          "value": {
            "path": "/docs",
            "query": "q=hello",
            "fragment": "top"
          }
        }
      ],
      "fields": {
        "path": {
          "kind": "text",
          "pattern": "/[^?#\\s]*",
          "token": true
        },
        "query": {
          "kind": "text",
          "pattern": "[^#\\s]+",
          "token": true
        },
        "fragment": {
          "kind": "text",
          "pattern": "[^\\s]+",
          "token": true
        }
      }
    },
    "form5": {
      "examples": [
        {
          "source": "/docs?q=hello",
          "value": {
            "path": "/docs",
            "query": "q=hello"
          }
        }
      ],
      "fields": {
        "path": {
          "kind": "text",
          "pattern": "/[^?#\\s]*",
          "token": true
        },
        "query": {
          "kind": "text",
          "pattern": "[^#\\s]+",
          "token": true
        }
      }
    },
    "form6": {
      "examples": [
        {
          "source": "/docs#top",
          "value": {
            "path": "/docs",
            "fragment": "top"
          }
        }
      ],
      "fields": {
        "path": {
          "kind": "text",
          "pattern": "/[^?#\\s]*",
          "token": true
        },
        "fragment": {
          "kind": "text",
          "pattern": "[^\\s]+",
          "token": true
        }
      }
    },
    "form7": {
      "examples": [
        {
          "source": "/docs",
          "value": {
            "path": "/docs"
          }
        }
      ],
      "fields": {
        "path": {
          "kind": "text",
          "pattern": "/[^?#\\s]*",
          "token": true
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "https://example.org/docs?q=hello#top",
          "value": {
            "scheme": "https",
            "authority": "example.org",
            "path": "/docs",
            "query": "q=hello",
            "fragment": "top"
          }
        }
      ],
      "fields": {
        "": {
          "kind": "ref",
          "item": [
            "form0",
            "form1",
            "form2",
            "form3",
            "form4",
            "form5",
            "form6",
            "form7"
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
