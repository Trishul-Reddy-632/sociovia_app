# ctwa/__init__.py
# Click-to-WhatsApp Ads Module
# ============================

"""
CTWA (Click-to-WhatsApp) Ads Engine

This module provides:
- Campaign/AdSet/Ad creation via Meta Marketing API
- Attribution tracking for incoming WhatsApp conversations
- Analytics and cost-per-conversation metrics
"""

from .models import CTWACampaign, CTWAAdSet, CTWAAd, CTWAMetrics
from .attribution import parse_referral, enrich_attribution, apply_attribution_to_conversation, CTWAAttribution
from .meta_api import MetaMarketingAPI, MetaMarketingAPIError
from .routes import ctwa_bp

__all__ = [
    # Models
    "CTWACampaign",
    "CTWAAdSet",
    "CTWAAd",
    "CTWAMetrics",
    # Attribution
    "parse_referral",
    "enrich_attribution",
    "apply_attribution_to_conversation",
    "CTWAAttribution",
    # API
    "MetaMarketingAPI",
    "MetaMarketingAPIError",
    # Blueprint
    "ctwa_bp",
]

