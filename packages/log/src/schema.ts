import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "modern": {
      "examples": [
        {
          "source": "2026-11-11T10:20:30Z INFO service ready",
          "value": {
            "timestamp": "2026-11-11T10:20:30Z",
            "level": "INFO",
            "message": "service ready"
          }
        }
      ],
      "fields": {
        "timestamp": {
          "kind": "text",
          "pattern": "[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z",
          "token": true
        },
        "level": {
          "kind": "text",
          "pattern": "(?:TRACE|DEBUG|INFO|WARN|ERROR|FATAL)",
          "token": true
        },
        "message": {
          "kind": "text",
          "pattern": "[^\\r\\n]+",
          "token": true
        }
      }
    },
    "access": {
      "examples": [
        {
          "source": "192.168.0.1 remote frank [10/Oct/2000:13:55:36 -0700] \"GET /apache_pb.gif HTTP/1.0\" 404 2326",
          "value": {
            "address": "192.168.0.1",
            "identity": "remote",
            "user": "frank",
            "time": "10/Oct/2000:13:55:36 -0700",
            "request": "GET /apache_pb.gif HTTP/1.0",
            "status": "404",
            "bytes": "2326"
          }
        }
      ],
      "fields": {
        "address": {
          "kind": "text",
          "pattern": "[^\\s]+",
          "token": true
        },
        "identity": {
          "kind": "text",
          "pattern": "[^\\s]+",
          "token": true
        },
        "user": {
          "kind": "text",
          "pattern": "[^\\s]+",
          "token": true
        },
        "time": {
          "kind": "text",
          "pattern": "[^\\]\\r\\n]+",
          "token": true
        },
        "request": {
          "kind": "text",
          "pattern": "[^\"\\r\\n]+",
          "token": true
        },
        "status": {
          "kind": "text",
          "pattern": "[^\\s]+",
          "token": true
        },
        "bytes": {
          "kind": "text",
          "pattern": "[^\\s]+",
          "token": true
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "2026-11-11T10:20:30Z INFO service ready",
          "value": {
            "entries": [
              {
                "timestamp": "2026-11-11T10:20:30Z",
                "level": "INFO",
                "message": "service ready"
              }
            ]
          }
        }
      ],
      "fields": {
        "entries": {
          "kind": "list",
          "item": [
            "access",
            "modern"
          ],
          "separator": "\n"
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
