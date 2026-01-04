from functools import wraps
from flask import jsonify
from rate_limit.service import check_rate_limit

def rate_limit(route_key: str):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            allowed, info = check_rate_limit(route_key)

            if not allowed:
                return jsonify({
                    "error": "rate_limit_exceeded",
                    "limit_type": info["type"],
                    "retry_after_seconds": info["retry_after"]
                }), 429

            return fn(*args, **kwargs)

        return wrapper
    return decorator
