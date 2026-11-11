import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "header": {
      "examples": [
        {
          "source": "Host: example.org\r\n",
          "value": {
            "name": "Host",
            "value": "example.org"
          }
        }
      ],
      "fields": {
        "name": {
          "kind": "text",
          "pattern": "[!#$%&'*+.^_`|~0-9A-Za-z-]+",
          "token": true
        },
        "value": {
          "kind": "text",
          "pattern": "[^\\r\\n]+",
          "token": true
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "GET /users HTTP/1.1\r\nHost: example.org\r\n\r\nhello",
          "value": {
            "method": "GET",
            "target": "/users",
            "version": "1.1",
            "headers": [
              {
                "name": "Host",
                "value": "example.org"
              }
            ],
            "body": "hello"
          }
        }
      ],
      "fields": {
        "method": {
          "kind": "text",
          "pattern": "[A-Z]+",
          "token": true
        },
        "target": {
          "kind": "text",
          "pattern": "[^\\s]+",
          "token": true
        },
        "version": {
          "kind": "text",
          "pattern": "[0-9]+\\.[0-9]+",
          "token": true
        },
        "headers": {
          "kind": "list",
          "item": [
            "header"
          ],
          "separator": "",
          "whileMatches": true
        },
        "body": {
          "kind": "text",
          "allowEmpty": true,
          "pattern": "[\\s\\S]*",
          "token": false
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
    "whitespace": "horizontal",
    "escape": ""
  }
});
