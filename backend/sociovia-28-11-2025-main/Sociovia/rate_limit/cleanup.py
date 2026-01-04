from datetime import datetime, timedelta
from models import db
from rate_limit.models import RateLimitEvent

def cleanup_rate_limit_events():
    cutoff = datetime.utcnow() - timedelta(hours=48)
    RateLimitEvent.query.filter(
        RateLimitEvent.created_at < cutoff
    ).delete()
    db.session.commit()
