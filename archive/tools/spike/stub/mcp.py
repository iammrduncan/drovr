#!/usr/bin/env python3
"""One dependency-free stdio MCP tool for native discovery evidence."""

import argparse
import json
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sentinel", default="MCP_SENTINEL=spike")
    args = parser.parse_args()
    if len(args.sentinel.encode("utf-8")) > 256:
        parser.error("sentinel exceeds 256 bytes")
    while True:
        line = sys.stdin.buffer.readline(65537)
        if not line:
            break
        if len(line) > 65536:
            print("MCP request exceeds 64 KiB; closing", file=sys.stderr)
            return 1
        try:
            request = json.loads(line)
            if not isinstance(request, dict) or request.get("jsonrpc") != "2.0":
                raise ValueError()
        except (ValueError, UnicodeError):
            print(json.dumps({"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Invalid JSON-RPC request"}}), flush=True)
            continue
        if "id" not in request:
            continue
        method = request.get("method")
        response = {"jsonrpc": "2.0", "id": request["id"]}
        if method == "initialize":
            response["result"] = {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "drovr-spike", "version": "0.1"},
            }
        elif method == "ping":
            response["result"] = {}
        elif method == "tools/list":
            response["result"] = {"tools": [{
                "name": "spike_sentinel",
                "description": "Return the disposable profile's MCP sentinel; no side effects.",
                "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
            }]}
        elif method == "tools/call":
            params = request.get("params", {})
            if isinstance(params, dict) and params.get("name") == "spike_sentinel" and params.get("arguments", {}) == {}:
                response["result"] = {"content": [{"type": "text", "text": args.sentinel}]}
            else:
                response["error"] = {"code": -32602, "message": "Use spike_sentinel with empty arguments"}
        else:
            response["error"] = {"code": -32601, "message": "Method not found"}
        print(json.dumps(response), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
