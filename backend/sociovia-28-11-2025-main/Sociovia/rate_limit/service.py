from datetime import datetime, timedelta
from flask import session, request
from sqlalchemy import and_, or_, case

from models import db, User
from rate_limit.models import RateLimitConfig, RateLimitEvent


# ---------------------------
# Identity resolution
# ---------------------------
def get_user():
    """
    Resolve authenticated user.
    Session or X-User-Id header.
    """
    user_id = session.get("user_id") or request.headers.get("X-User-Id")
    if not user_id:
        return None

    try:
        return db.session.get(User, int(user_id))
    except Exception:
        return None


# ---------------------------
# Rate config resolver
# ---------------------------
def get_rate_config(user: User | None, route: str):
    """
    Priority:
    1. User-specific
    2. Plan-based
    3. Global
    """

    user_id = str(user.id) if user else None
    plan = getattr(user, "plan", None) or "beta"  # default = beta

    return (
        RateLimitConfig.query
        .filter(
            RateLimitConfig.enabled.is_(True),
            RateLimitConfig.route == route,
            or_(
                and_(
                    RateLimitConfig.scope == "user",
                    RateLimitConfig.user_id == user_id
                ),
                and_(
                    RateLimitConfig.scope == "plan",
                    RateLimitConfig.plan == plan
                ),
                RateLimitConfig.scope == "global"
            )
        )
        .order_by(
            # explicit priority: user > plan > global
            case(
                (RateLimitConfig.scope == "user", 1),
                (RateLimitConfig.scope == "plan", 2),
                else_=3
            )
        )
        .first()
    )


# ---------------------------
# Main rate-limit check
# ---------------------------
def check_rate_limit(route: str):
    user = get_user()
    cfg = get_rate_config(user, route)

    if not cfg:
        return True, None

    now = datetime.utcnow()
    user_id = str(user.id) if user else None

    # -------- Rolling window --------
    window_start = now - timedelta(seconds=cfg.window_seconds)

    window_count = RateLimitEvent.query.filter(
        RateLimitEvent.route == route,
        RateLimitEvent.created_at >= window_start,
        RateLimitEvent.user_id == user_id
    ).count()

    if window_count >= cfg.window_limit:
        return False, {
            "type": "window",
            "retry_after": cfg.window_seconds
        }

    # -------- Rolling daily (24h) --------
    if cfg.daily_limit is not None:
        daily_start = now - timedelta(hours=24)

        daily_count = RateLimitEvent.query.filter(
            RateLimitEvent.route == route,
            RateLimitEvent.created_at >= daily_start,
            RateLimitEvent.user_id == user_id
        ).count()

        if daily_count >= cfg.daily_limit:
            return False, {
                "type": "daily",
                "retry_after": 86400
            }

    # -------- Log event --------
    db.session.add(
        RateLimitEvent(
            user_id=user_id,
            route=route
        )
    )
    db.session.commit()

    return True, None
