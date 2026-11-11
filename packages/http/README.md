# http

HTTP request line, repeated headers and opaque body. Does not perform content-length/chunk framing, decompression or connection handling.

Schema examples define the output shape. `parse`, checked `stringify`, and JSON output are generated. Formatting is canonical; original spacing is not retained.
