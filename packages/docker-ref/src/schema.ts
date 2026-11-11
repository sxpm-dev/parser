import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "v0": {
      "examples": [
        {
          "source": "nginx:latest",
          "value": {
            "name": "nginx",
            "tag": "latest"
          }
        }
      ],
      "fields": {
        "name": {
          "kind": "text",
          "pattern": "[a-z0-9]+(?:[._/-][a-z0-9]+)*",
          "token": true
        },
        "tag": {
          "kind": "text",
          "pattern": "[A-Za-z0-9_.:-]+",
          "token": true
        }
      }
    },
    "v1": {
      "examples": [
        {
          "source": "library/redis@sha256:abcdef012345",
          "value": {
            "name": "library/redis",
            "digest": "sha256:abcdef012345"
          }
        }
      ],
      "fields": {
        "name": {
          "kind": "text",
          "pattern": "[a-z0-9]+(?:[._/-][a-z0-9]+)*",
          "token": true
        },
        "digest": {
          "kind": "text",
          "pattern": "[A-Za-z0-9_.:-]+",
          "token": true
        }
      }
    },
    "v2": {
      "examples": [
        {
          "source": "alpine",
          "value": {
            "name": "alpine"
          }
        }
      ],
      "fields": {
        "name": {
          "kind": "text",
          "pattern": "[a-z0-9]+(?:[._/-][a-z0-9]+)*",
          "token": true
        }
      }
    },
    "root": {
      "examples": [
        {
          "source": "nginx:latest",
          "value": {
            "name": "nginx",
            "tag": "latest"
          }
        }
      ],
      "fields": {
        "": {
          "kind": "ref",
          "item": [
            "v0",
            "v1",
            "v2"
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
