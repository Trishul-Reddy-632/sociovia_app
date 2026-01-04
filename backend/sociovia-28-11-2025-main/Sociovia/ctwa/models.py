# ctwa/models.py
# Click-to-WhatsApp Ads Models
# ============================

"""
Database models for Click-to-WhatsApp (CTWA) Ads Engine.

Tables:
- ctwa_campaigns: Campaign-level data synced with Meta
- ctwa_adsets: Ad Set configuration and targeting
- ctwa_ads: Individual ads with creative content
- ctwa_metrics: Cached insights from Meta API
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy.dialects.postgresql import JSONB
from models import db


class CTWACampaign(db.Model):
    """
    Click-to-WhatsApp Campaign.
    Maps to a Meta Marketing API campaign with OUTCOME_ENGAGEMENT objective.
    """
    __tablename__ = "ctwa_campaigns"

    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.String(255), nullable=False, index=True)
    meta_campaign_id = db.Column(db.String(64), unique=True, nullable=True)  # Null until published
    ad_account_id = db.Column(db.String(64), nullable=False, index=True)

    # Campaign details
    name = db.Column(db.String(255), nullable=False)
    objective = db.Column(db.String(64), default="OUTCOME_ENGAGEMENT")
    status = db.Column(db.String(32), default="DRAFT")  # DRAFT, PAUSED, ACTIVE, ARCHIVED

    # Budget & Schedule
    daily_budget = db.Column(db.Numeric(12, 2), nullable=True)
    lifetime_budget = db.Column(db.Numeric(12, 2), nullable=True)
    budget_currency = db.Column(db.String(3), default="INR")
    start_time = db.Column(db.DateTime, nullable=True)
    end_time = db.Column(db.DateTime, nullable=True)

    # Metadata
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    created_by_user_id = db.Column(db.String(64), nullable=True)

    # Sync tracking
    last_synced_at = db.Column(db.DateTime, nullable=True)
    sync_status = db.Column(db.String(32), default="pending")  # pending, synced, error
    sync_error = db.Column(db.Text, nullable=True)

    # Relationships
    adsets = db.relationship("CTWAAdSet", backref="campaign", lazy="dynamic", cascade="all, delete-orphan")

    def to_dict(self, include_adsets: bool = False) -> Dict[str, Any]:
        result = {
            "id": self.id,
            "workspace_id": self.workspace_id,
            "meta_campaign_id": self.meta_campaign_id,
            "ad_account_id": self.ad_account_id,
            "name": self.name,
            "objective": self.objective,
            "status": self.status,
            "daily_budget": float(self.daily_budget) if self.daily_budget else None,
            "lifetime_budget": float(self.lifetime_budget) if self.lifetime_budget else None,
            "budget_currency": self.budget_currency,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "sync_status": self.sync_status,
        }
        if include_adsets:
            result["adsets"] = [adset.to_dict() for adset in self.adsets]
        return result


class CTWAAdSet(db.Model):
    """
    Click-to-WhatsApp Ad Set.
    Contains targeting and WhatsApp destination configuration.
    """
    __tablename__ = "ctwa_adsets"

    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.String(255), nullable=False, index=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey("ctwa_campaigns.id", ondelete="CASCADE"), nullable=False)
    meta_adset_id = db.Column(db.String(64), unique=True, nullable=True)

    # Ad set details
    name = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(32), default="DRAFT")
    optimization_goal = db.Column(db.String(64), default="CONVERSATIONS")
    billing_event = db.Column(db.String(32), default="IMPRESSIONS")
    bid_strategy = db.Column(db.String(64), default="LOWEST_COST_WITHOUT_CAP")

    # Budget (can override campaign)
    daily_budget = db.Column(db.Numeric(12, 2), nullable=True)

    # Targeting (stored as JSONB for flexibility)
    targeting = db.Column(JSONB, nullable=True)
    # Example: {"geo_locations": {"countries": ["IN"]}, "age_min": 18, "age_max": 65}

    # WhatsApp config
    page_id = db.Column(db.String(64), nullable=False)
    whatsapp_phone_number_id = db.Column(db.String(64), nullable=False)

    # Schedule
    start_time = db.Column(db.DateTime, nullable=True)
    end_time = db.Column(db.DateTime, nullable=True)

    # Metadata
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    ads = db.relationship("CTWAAd", backref="adset", lazy="dynamic", cascade="all, delete-orphan")

    def to_dict(self, include_ads: bool = False) -> Dict[str, Any]:
        result = {
            "id": self.id,
            "workspace_id": self.workspace_id,
            "campaign_id": self.campaign_id,
            "meta_adset_id": self.meta_adset_id,
            "name": self.name,
            "status": self.status,
            "optimization_goal": self.optimization_goal,
            "billing_event": self.billing_event,
            "bid_strategy": self.bid_strategy,
            "daily_budget": float(self.daily_budget) if self.daily_budget else None,
            "targeting": self.targeting,
            "page_id": self.page_id,
            "whatsapp_phone_number_id": self.whatsapp_phone_number_id,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_ads:
            result["ads"] = [ad.to_dict() for ad in self.ads]
        return result


class CTWAAd(db.Model):
    """
    Click-to-WhatsApp Ad.
    Contains creative content and WhatsApp CTA configuration.
    """
    __tablename__ = "ctwa_ads"

    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.String(255), nullable=False, index=True)
    adset_id = db.Column(db.Integer, db.ForeignKey("ctwa_adsets.id", ondelete="CASCADE"), nullable=False)
    meta_ad_id = db.Column(db.String(64), unique=True, nullable=True, index=True)
    meta_creative_id = db.Column(db.String(64), nullable=True)

    # Ad details
    name = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(32), default="DRAFT")
    effective_status = db.Column(db.String(32), nullable=True)

    # Creative content
    primary_text = db.Column(db.Text, nullable=True)  # Main ad copy
    headline = db.Column(db.String(255), nullable=True)
    description = db.Column(db.Text, nullable=True)
    media_type = db.Column(db.String(32), nullable=True)  # image, video
    media_url = db.Column(db.Text, nullable=True)
    media_hash = db.Column(db.String(64), nullable=True)  # For uploaded media

    # WhatsApp CTA
    cta_type = db.Column(db.String(64), default="WHATSAPP_MESSAGE")
    ice_breakers = db.Column(JSONB, nullable=True)  # Array of quick replies
    # Example: [{"text": "Tell me about offers"}, {"text": "Track order"}]
    prefilled_message = db.Column(db.Text, nullable=True)

    # Review status
    review_status = db.Column(db.String(32), default="pending")  # pending, approved, rejected
    rejection_reasons = db.Column(JSONB, nullable=True)

    # Metadata
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "workspace_id": self.workspace_id,
            "adset_id": self.adset_id,
            "meta_ad_id": self.meta_ad_id,
            "meta_creative_id": self.meta_creative_id,
            "name": self.name,
            "status": self.status,
            "effective_status": self.effective_status,
            "primary_text": self.primary_text,
            "headline": self.headline,
            "description": self.description,
            "media_type": self.media_type,
            "media_url": self.media_url,
            "cta_type": self.cta_type,
            "ice_breakers": self.ice_breakers,
            "prefilled_message": self.prefilled_message,
            "review_status": self.review_status,
            "rejection_reasons": self.rejection_reasons,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class CTWAMetrics(db.Model):
    """
    Cached metrics from Meta Insights API.
    Refreshed periodically by background worker.
    """
    __tablename__ = "ctwa_metrics"

    id = db.Column(db.Integer, primary_key=True)
    entity_type = db.Column(db.String(32), nullable=False)  # campaign, adset, ad
    entity_id = db.Column(db.String(64), nullable=False)  # Meta ID
    metric_date = db.Column(db.Date, nullable=False)

    # Standard metrics from Meta
    impressions = db.Column(db.BigInteger, default=0)
    clicks = db.Column(db.BigInteger, default=0)
    spend = db.Column(db.Numeric(12, 4), default=0)
    reach = db.Column(db.BigInteger, default=0)
    frequency = db.Column(db.Numeric(8, 4), default=0)

    # CTWA specific (from Meta)
    messaging_conversations_started = db.Column(db.BigInteger, default=0)
    cost_per_messaging_conversation = db.Column(db.Numeric(12, 4), nullable=True)

    # Sociovia computed (from our DB)
    internal_conversations = db.Column(db.BigInteger, default=0)
    computed_cost_per_conversation = db.Column(db.Numeric(12, 4), nullable=True)

    # Metadata
    fetched_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.UniqueConstraint("entity_type", "entity_id", "metric_date", name="uq_ctwa_metrics_entity_date"),
        db.Index("idx_ctwa_metrics_entity", "entity_type", "entity_id"),
        db.Index("idx_ctwa_metrics_date", "metric_date"),
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "metric_date": self.metric_date.isoformat() if self.metric_date else None,
            "impressions": self.impressions,
            "clicks": self.clicks,
            "spend": float(self.spend) if self.spend else 0,
            "reach": self.reach,
            "frequency": float(self.frequency) if self.frequency else 0,
            "messaging_conversations_started": self.messaging_conversations_started,
            "cost_per_messaging_conversation": float(self.cost_per_messaging_conversation) if self.cost_per_messaging_conversation else None,
            "internal_conversations": self.internal_conversations,
            "computed_cost_per_conversation": float(self.computed_cost_per_conversation) if self.computed_cost_per_conversation else None,
            "fetched_at": self.fetched_at.isoformat() if self.fetched_at else None,
        }
