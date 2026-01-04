# ctwa/routes.py
# Click-to-WhatsApp Ads API Routes
# ================================

"""
Backend routes for CTWA campaign management.

Endpoints:
- POST /api/ctwa/campaigns - Create campaign
- GET /api/ctwa/campaigns - List campaigns
- GET /api/ctwa/campaigns/<id> - Get campaign details
- POST /api/ctwa/campaigns/<id>/publish - Publish to Meta
- GET /api/ctwa/campaigns/<id>/insights - Get metrics
"""

import os
import logging
from datetime import datetime, timezone
from typing import Dict, Any
from flask import Blueprint, request, jsonify, g

from models import db
from .models import CTWACampaign, CTWAAdSet, CTWAAd, CTWAMetrics
from .meta_api import MetaMarketingAPI, MetaMarketingAPIError

logger = logging.getLogger(__name__)

ctwa_bp = Blueprint("ctwa", __name__, url_prefix="/api/ctwa")


def get_db():
    """Get database session."""
    return db.session


def get_access_token(workspace_id: str = None) -> str:
    """
    Get access token for Meta API.
    Priority: Workspace token > Session token > Env variable
    """
    # Try to get from workspace's connected ad account
    if workspace_id:
        from models import AdAccount
        ad_account = AdAccount.query.filter_by(user_id=g.user.id if hasattr(g, 'user') else None).first()
        if ad_account and ad_account.access_token:
            return ad_account.access_token
    
    # Try session
    if hasattr(g, 'user'):
        from models import SocialAccount
        social = SocialAccount.query.filter_by(
            user_id=g.user.id,
            provider='facebook'
        ).first()
        if social and social.access_token:
            return social.access_token
    
    # Fallback to env
    return os.getenv("FB_ACCESS_TOKEN", "")


# ============================================================
# Campaign Routes
# ============================================================

@ctwa_bp.route("/campaigns", methods=["POST"])
def create_campaign():
    """
    Create a new CTWA campaign (draft).
    
    POST /api/ctwa/campaigns
    {
        "workspace_id": "4",
        "ad_account_id": "act_123456",
        "name": "Summer Sale",
        "daily_budget": 500,
        "budget_currency": "INR",
        "start_time": "2025-01-01T00:00:00",
        "end_time": "2025-01-07T23:59:59",
        "page_id": "123456",
        "whatsapp_phone_number_id": "789",
        "targeting": {...},
        "creative": {...}
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required = ["workspace_id", "ad_account_id", "name"]
        for field in required:
            if not data.get(field):
                return jsonify({"success": False, "error": f"Missing required field: {field}"}), 400
        
        workspace_id = data["workspace_id"]
        
        # Create campaign record (draft)
        campaign = CTWACampaign(
            workspace_id=workspace_id,
            ad_account_id=data["ad_account_id"],
            name=data["name"],
            status="DRAFT",
            daily_budget=data.get("daily_budget"),
            lifetime_budget=data.get("lifetime_budget"),
            budget_currency=data.get("budget_currency", "INR"),
            start_time=datetime.fromisoformat(data["start_time"]) if data.get("start_time") else None,
            end_time=datetime.fromisoformat(data["end_time"]) if data.get("end_time") else None,
            created_by_user_id=str(g.user.id) if hasattr(g, 'user') else None,
        )
        get_db().add(campaign)
        get_db().flush()
        
        # Create ad set if provided
        if data.get("page_id") and data.get("whatsapp_phone_number_id"):
            adset = CTWAAdSet(
                workspace_id=workspace_id,
                campaign_id=campaign.id,
                name=f"{data['name']} - Ad Set 1",
                status="DRAFT",
                daily_budget=data.get("daily_budget"),
                targeting=data.get("targeting", {}),
                page_id=data["page_id"],
                whatsapp_phone_number_id=data["whatsapp_phone_number_id"],
                start_time=campaign.start_time,
                end_time=campaign.end_time,
            )
            get_db().add(adset)
            get_db().flush()
            
            # Create ad if creative provided
            if data.get("creative"):
                creative = data["creative"]
                ad = CTWAAd(
                    workspace_id=workspace_id,
                    adset_id=adset.id,
                    name=f"{data['name']} - Ad 1",
                    status="DRAFT",
                    primary_text=creative.get("primary_text"),
                    headline=creative.get("headline"),
                    description=creative.get("description"),
                    media_type=creative.get("media_type"),
                    media_url=creative.get("media_url"),
                    ice_breakers=creative.get("ice_breakers"),
                    prefilled_message=creative.get("prefilled_message"),
                )
                get_db().add(ad)
        
        get_db().commit()
        
        return jsonify({
            "success": True,
            "campaign": campaign.to_dict(include_adsets=True),
        }), 201
        
    except Exception as e:
        get_db().rollback()
        logger.exception(f"Failed to create campaign: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@ctwa_bp.route("/campaigns", methods=["GET"])
def list_campaigns():
    """
    List CTWA campaigns for workspace.
    
    GET /api/ctwa/campaigns?workspace_id=4
    """
    workspace_id = request.args.get("workspace_id")
    status = request.args.get("status")
    
    query = CTWACampaign.query
    
    if workspace_id:
        query = query.filter_by(workspace_id=workspace_id)
    
    if status:
        query = query.filter_by(status=status)
    
    campaigns = query.order_by(CTWACampaign.created_at.desc()).all()
    
    return jsonify({
        "success": True,
        "campaigns": [c.to_dict() for c in campaigns],
        "total": len(campaigns),
    })


@ctwa_bp.route("/campaigns/<int:campaign_id>", methods=["GET"])
def get_campaign(campaign_id: int):
    """Get campaign details with ad sets and ads."""
    campaign = CTWACampaign.query.get_or_404(campaign_id)
    
    return jsonify({
        "success": True,
        "campaign": campaign.to_dict(include_adsets=True),
    })


@ctwa_bp.route("/campaigns/<int:campaign_id>", methods=["PUT"])
def update_campaign(campaign_id: int):
    """Update campaign details."""
    campaign = CTWACampaign.query.get_or_404(campaign_id)
    data = request.get_json()
    
    # Only allow updates if draft
    if campaign.meta_campaign_id and campaign.status != "DRAFT":
        return jsonify({
            "success": False,
            "error": "Cannot edit published campaign. Create a new one instead."
        }), 400
    
    # Update allowed fields
    for field in ["name", "daily_budget", "lifetime_budget", "budget_currency", "start_time", "end_time"]:
        if field in data:
            if field in ["start_time", "end_time"] and data[field]:
                setattr(campaign, field, datetime.fromisoformat(data[field]))
            else:
                setattr(campaign, field, data[field])
    
    campaign.updated_at = datetime.now(timezone.utc)
    get_db().commit()
    
    return jsonify({
        "success": True,
        "campaign": campaign.to_dict(),
    })


@ctwa_bp.route("/campaigns/<int:campaign_id>", methods=["DELETE"])
def delete_campaign(campaign_id: int):
    """Delete a draft campaign."""
    campaign = CTWACampaign.query.get_or_404(campaign_id)
    
    if campaign.meta_campaign_id:
        return jsonify({
            "success": False,
            "error": "Cannot delete published campaign. Archive it instead."
        }), 400
    
    get_db().delete(campaign)
    get_db().commit()
    
    return jsonify({"success": True, "message": "Campaign deleted"})


# ============================================================
# Publish Flow
# ============================================================

@ctwa_bp.route("/campaigns/<int:campaign_id>/publish", methods=["POST"])
def publish_campaign(campaign_id: int):
    """
    Publish a draft campaign to Meta Ads Manager.
    
    POST /api/ctwa/campaigns/<id>/publish
    {
        "activate": false  // If true, also activate the campaign
    }
    """
    campaign = CTWACampaign.query.get_or_404(campaign_id)
    data = request.get_json() or {}
    activate = data.get("activate", False)
    
    if campaign.meta_campaign_id:
        return jsonify({
            "success": False,
            "error": "Campaign already published"
        }), 400
    
    # Get all ad sets and ads
    adsets = CTWAAdSet.query.filter_by(campaign_id=campaign.id).all()
    if not adsets:
        return jsonify({
            "success": False,
            "error": "Campaign has no ad sets"
        }), 400
    
    try:
        access_token = get_access_token(campaign.workspace_id)
        if not access_token:
            return jsonify({
                "success": False,
                "error": "No access token available"
            }), 401
        
        api = MetaMarketingAPI(access_token)
        
        # Step 1: Create campaign on Meta
        meta_campaign = api.create_campaign(
            ad_account_id=campaign.ad_account_id,
            name=campaign.name,
            objective="OUTCOME_ENGAGEMENT",
            status="PAUSED",
        )
        campaign.meta_campaign_id = meta_campaign["id"]
        campaign.status = "PAUSED"
        campaign.sync_status = "synced"
        
        # Step 2: Create ad sets
        for adset in adsets:
            meta_adset = api.create_adset(
                ad_account_id=campaign.ad_account_id,
                campaign_id=campaign.meta_campaign_id,
                name=adset.name,
                page_id=adset.page_id,
                whatsapp_phone_number=adset.whatsapp_phone_number_id,
                daily_budget=int(adset.daily_budget * 100) if adset.daily_budget else int(campaign.daily_budget * 100),
                targeting=adset.targeting or {"geo_locations": {"countries": ["IN"]}},
                start_time=adset.start_time.isoformat() if adset.start_time else None,
                end_time=adset.end_time.isoformat() if adset.end_time else None,
            )
            adset.meta_adset_id = meta_adset["id"]
            adset.status = "PAUSED"
            
            # Step 3: Create ads
            ads = CTWAAd.query.filter_by(adset_id=adset.id).all()
            for ad in ads:
                # Create creative first
                meta_creative = api.create_creative(
                    ad_account_id=campaign.ad_account_id,
                    name=f"{ad.name} - Creative",
                    page_id=adset.page_id,
                    message=ad.primary_text or "Tap to chat with us!",
                    headline=ad.headline,
                    description=ad.description,
                    image_url=ad.media_url if ad.media_type == "image" else None,
                    whatsapp_number=adset.whatsapp_phone_number_id,
                )
                ad.meta_creative_id = meta_creative["id"]
                
                # Create ad
                meta_ad = api.create_ad(
                    ad_account_id=campaign.ad_account_id,
                    adset_id=adset.meta_adset_id,
                    creative_id=ad.meta_creative_id,
                    name=ad.name,
                    status="PAUSED",
                )
                ad.meta_ad_id = meta_ad["id"]
                ad.status = "PAUSED"
        
        # Step 4: Activate if requested
        if activate:
            api.update_campaign_status(campaign.meta_campaign_id, "ACTIVE")
            campaign.status = "ACTIVE"
            for adset in adsets:
                adset.status = "ACTIVE"
                for ad in CTWAAd.query.filter_by(adset_id=adset.id).all():
                    ad.status = "ACTIVE"
        
        campaign.last_synced_at = datetime.now(timezone.utc)
        get_db().commit()
        
        return jsonify({
            "success": True,
            "campaign": campaign.to_dict(include_adsets=True),
            "meta_campaign_id": campaign.meta_campaign_id,
        })
        
    except MetaMarketingAPIError as e:
        campaign.sync_status = "error"
        campaign.sync_error = str(e)
        get_db().commit()
        logger.exception(f"Meta API error: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "code": e.code,
        }), 400
        
    except Exception as e:
        get_db().rollback()
        logger.exception(f"Publish failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================
# Insights / Analytics
# ============================================================

@ctwa_bp.route("/campaigns/<int:campaign_id>/insights", methods=["GET"])
def get_campaign_insights(campaign_id: int):
    """
    Get campaign insights/metrics.
    
    GET /api/ctwa/campaigns/<id>/insights?date_preset=last_7d
    """
    from whatsapp.models import WhatsAppConversation
    
    campaign = CTWACampaign.query.get_or_404(campaign_id)
    date_preset = request.args.get("date_preset", "last_7d")
    
    result = {
        "campaign_id": campaign.id,
        "meta_campaign_id": campaign.meta_campaign_id,
        "name": campaign.name,
        "status": campaign.status,
        "period": date_preset,
        "metrics": {
            "impressions": 0,
            "clicks": 0,
            "spend": 0,
            "conversations": 0,
            "cost_per_conversation": None,
        },
    }
    
    if not campaign.meta_campaign_id:
        return jsonify({"success": True, **result})
    
    try:
        # Get metrics from Meta
        access_token = get_access_token(campaign.workspace_id)
        if access_token:
            api = MetaMarketingAPI(access_token)
            insights = api.get_insights(campaign.meta_campaign_id, date_preset=date_preset)
            
            if insights:
                insight = insights[0]
                result["metrics"]["impressions"] = int(insight.get("impressions", 0))
                result["metrics"]["clicks"] = int(insight.get("clicks", 0))
                result["metrics"]["spend"] = float(insight.get("spend", 0))
                result["metrics"]["meta_conversations"] = api.get_conversations_metric(insights)
        
        # Get conversations from our DB
        internal_convos = WhatsAppConversation.query.filter(
            WhatsAppConversation.campaign_id == campaign.meta_campaign_id,
            WhatsAppConversation.entry_source == "ctwa"
        ).count()
        
        result["metrics"]["conversations"] = internal_convos
        
        # Compute cost per conversation
        if internal_convos > 0 and result["metrics"]["spend"] > 0:
            result["metrics"]["cost_per_conversation"] = round(
                result["metrics"]["spend"] / internal_convos, 2
            )
        
        return jsonify({"success": True, **result})
        
    except Exception as e:
        logger.exception(f"Failed to get insights: {e}")
        return jsonify({"success": True, **result, "warning": str(e)})


# ============================================================
# Analytics Summary
# ============================================================

@ctwa_bp.route("/analytics/summary", methods=["GET"])
def get_analytics_summary():
    """
    Get summary analytics for all campaigns in a workspace.
    
    GET /api/ctwa/analytics/summary?workspace_id=4
    """
    from whatsapp.models import WhatsAppConversation
    
    workspace_id = request.args.get("workspace_id")
    
    # Count by entry source
    total_conversations = WhatsAppConversation.query.filter_by(
        account_id=request.args.get("account_id")
    ).count() if request.args.get("account_id") else 0
    
    ctwa_conversations = WhatsAppConversation.query.filter(
        WhatsAppConversation.entry_source == "ctwa"
    )
    
    if workspace_id:
        # Filter by workspace's accounts
        ctwa_conversations = ctwa_conversations.filter(
            WhatsAppConversation.campaign_id.isnot(None)
        )
    
    ctwa_count = ctwa_conversations.count()
    
    # Get active campaigns count
    active_campaigns = CTWACampaign.query.filter_by(
        workspace_id=workspace_id,
        status="ACTIVE"
    ).count() if workspace_id else 0
    
    return jsonify({
        "success": True,
        "summary": {
            "total_conversations": total_conversations,
            "ctwa_conversations": ctwa_count,
            "organic_conversations": total_conversations - ctwa_count,
            "active_campaigns": active_campaigns,
            "ctwa_percentage": round(ctwa_count / total_conversations * 100, 1) if total_conversations > 0 else 0,
        }
    })
