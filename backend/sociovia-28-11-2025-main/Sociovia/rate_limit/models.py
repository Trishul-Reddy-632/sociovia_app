from datetime import datetime
from models import db


class RateLimitConfig(db.Model):
    __tablename__ = "rate_limit_configs"

    id = db.Column(db.Integer, primary_key=True)

    # global | user | plan
    scope = db.Column(db.String(10), nullable=False)

    # Only for scope = "user"
    user_id = db.Column(db.Integer, nullable=True, index=True)

    # Only for scope = "plan"
    plan = db.Column(db.String(32), nullable=True, index=True)

    route = db.Column(db.String(255), nullable=False)

    window_limit = db.Column(db.Integer, nullable=False)
    window_seconds = db.Column(db.Integer, nullable=False)

    daily_limit = db.Column(db.Integer, nullable=True)

    enabled = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.CheckConstraint(
            "scope IN ('global', 'user', 'plan')",
            name="rate_limit_configs_scope_check"
        ),
    )


class RateLimitEvent(db.Model):
    __tablename__ = "rate_limit_events"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, nullable=True, index=True)
    route = db.Column(db.String(255), nullable=False, index=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
