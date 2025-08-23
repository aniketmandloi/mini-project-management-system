#!/usr/bin/env python3
"""
Debug script to capture and analyze GraphQL requests from frontend
"""
import json
import sys
from datetime import datetime


def log_request(method, path, headers, body):
    """Log detailed request information"""
    print("=" * 60)
    print(f"REQUEST DEBUG - {datetime.now()}")
    print("=" * 60)
    print(f"Method: {method}")
    print(f"Path: {path}")
    print("\nHeaders:")
    for key, value in headers.items():
        if "authorization" in key.lower():
            print(
                f"  {key}: Bearer {value.split(' ')[1][:20]}..."
                if " " in value
                else f"  {key}: {value}"
            )
        else:
            print(f"  {key}: {value}")

    print(f"\nBody Length: {len(body) if body else 0}")
    if body:
        try:
            parsed_body = json.loads(body)
            print("Body (parsed):")
            print(json.dumps(parsed_body, indent=2))
        except:
            print(f"Body (raw): {body}")
    print("=" * 60)


if __name__ == "__main__":
    # This can be used to manually log request data
    if len(sys.argv) > 1:
        request_data = sys.argv[1]
        try:
            data = json.loads(request_data)
            log_request(
                data.get("method", "POST"),
                data.get("path", "/graphql/"),
                data.get("headers", {}),
                data.get("body", ""),
            )
        except:
            print("Invalid JSON input")
