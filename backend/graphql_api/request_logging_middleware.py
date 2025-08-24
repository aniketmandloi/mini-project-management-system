"""
Request logging middleware for debugging GraphQL requests.
"""

import json
import logging

logger = logging.getLogger(__name__)


class GraphQLRequestLoggingMiddleware:
    """
    Middleware to log all GraphQL requests for debugging purposes.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Log GraphQL requests
        if request.path == '/graphql/' and request.method == 'POST':
            try:
                # Read the request body
                body = request.body.decode('utf-8')
                
                # Try to parse as JSON
                try:
                    data = json.loads(body)
                    operation_name = data.get('operationName', 'Unknown')
                    variables = data.get('variables', {})
                    query = data.get('query', '')[:200] + '...' if data.get('query', '') else ''
                    
                    print(f"🔍 GRAPHQL REQUEST: {operation_name}")
                    print(f"🔍 Variables: {json.dumps(variables, indent=2)}")
                    print(f"🔍 Query Preview: {query}")
                    print(f"🔍 Headers: {dict(request.headers)}")
                    print(f"🔍 Content-Type: {request.content_type}")
                    
                except json.JSONDecodeError as e:
                    print(f"🚨 Failed to parse GraphQL request JSON: {e}")
                    print(f"🚨 Raw body: {body[:500]}...")
                    
            except Exception as e:
                print(f"🚨 Error logging GraphQL request: {e}")

        response = self.get_response(request)

        # Log GraphQL responses
        if request.path == '/graphql/' and request.method == 'POST':
            print(f"🔍 GRAPHQL RESPONSE: Status {response.status_code}")
            if hasattr(response, 'content'):
                try:
                    content = response.content.decode('utf-8')
                    if len(content) < 1000:
                        print(f"🔍 Response Content: {content}")
                    else:
                        print(f"🔍 Response Content (truncated): {content[:500]}...")
                except:
                    print("🔍 Could not decode response content")

        return response