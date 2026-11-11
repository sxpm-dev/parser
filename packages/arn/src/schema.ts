import { defineSchema } from '../../compiler/src/schema.ts';
export default defineSchema({
  "input": "source",
  "output": "value",
  "root": "root",
  "productions": {
    "root": {
      "examples": [
        {
          "source": "arn:aws:lambda:us-east-1:123456789012:function:worker",
          "value": {
            "partition": "aws",
            "service": "lambda",
            "region": "us-east-1",
            "account": "123456789012",
            "resource": "function:worker"
          }
        }
      ],
      "fields": {
        "partition": {
          "kind": "text",
          "pattern": "[a-z0-9-]+",
          "token": true
        },
        "service": {
          "kind": "text",
          "pattern": "[a-z0-9-]+",
          "token": true
        },
        "region": {
          "kind": "text",
          "allowEmpty": true,
          "pattern": "[a-z0-9-]*",
          "token": false
        },
        "account": {
          "kind": "text",
          "allowEmpty": true,
          "pattern": "[0-9]*",
          "token": false
        },
        "resource": {
          "kind": "text",
          "pattern": "[^\\s]+",
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
  }
});
