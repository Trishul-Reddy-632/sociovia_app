# ctwa/meta_api.py
# Meta Marketing API Client
# =========================

"""
Client for Meta Marketing API operations.

Handles:
- Campaign creation with OUTCOME_ENGAGEMENT objective
- Ad Set creation with CONVERSATIONS optimization
- Creative and Ad creation with WhatsApp CTA
- Insights fetching for metrics
"""

import os
import logging
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
import requests

logger = logging.getLogger(__name__)


@dataclass
class MetaAPIConfig:
    """Configuration for Meta Marketing API."""
    app_id: str
    app_secret: str
    api_version: str = "v22.0"
    base_url: str = "https://graph.facebook.com"
    
    @classmethod
    def from_env(cls) -> "MetaAPIConfig":
        return cls(
            app_id=os.getenv("FB_APP_ID", ""),
            app_secret=os.getenv("FB_APP_SECRET", ""),
            api_version=os.getenv("FB_API_VERSION", "v22.0"),
        )


class MetaMarketingAPIError(Exception):
    """Exception for Meta Marketing API errors."""
    
    def __init__(self, message: str, code: int = None, subcode: int = None):
        super().__init__(message)
        self.code = code
        self.subcode = subcode


class MetaMarketingAPI:
    """
    Client for Meta Marketing API.
    
    Usage:
        api = MetaMarketingAPI(access_token="...")
        campaign = api.create_campaign(
            ad_account_id="act_123456",
            name="My Campaign",
            ...
        )
    """
    
    def __init__(self, access_token: str, config: MetaAPIConfig = None):
        self.access_token = access_token
        self.config = config or MetaAPIConfig.from_env()
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
        })
    
    @property
    def base_url(self) -> str:
        return f"{self.config.base_url}/{self.config.api_version}"
    
    def _request(
        self,
        method: str,
        endpoint: str,
        params: Dict = None,
        json_data: Dict = None,
        timeout: int = 30,
    ) -> Dict[str, Any]:
        """Make an API request."""
        url = f"{self.base_url}/{endpoint}"
        
        # Always include access token
        params = params or {}
        params["access_token"] = self.access_token
        
        try:
            response = self.session.request(
                method=method,
                url=url,
                params=params if method == "GET" else {"access_token": self.access_token},
                json=json_data if method != "GET" else None,
                timeout=timeout,
            )
            
            data = response.json()
            
            if "error" in data:
                error = data["error"]
                raise MetaMarketingAPIError(
                    message=error.get("message", "Unknown error"),
                    code=error.get("code"),
                    subcode=error.get("error_subcode"),
                )
            
            return data
            
        except requests.exceptions.RequestException as e:
            logger.exception(f"Meta API request failed: {e}")
            raise MetaMarketingAPIError(f"Request failed: {str(e)}")
    
    # =========================================================
    # Campaign Operations
    # =========================================================
    
    def create_campaign(
        self,
        ad_account_id: str,
        name: str,
        objective: str = "OUTCOME_ENGAGEMENT",
        status: str = "PAUSED",
        special_ad_categories: List[str] = None,
    ) -> Dict[str, Any]:
        """
        Create a Click-to-WhatsApp campaign.
        
        Args:
            ad_account_id: Ad account ID (with or without 'act_' prefix)
            name: Campaign name
            objective: Campaign objective (default: OUTCOME_ENGAGEMENT)
            status: Initial status (default: PAUSED)
            special_ad_categories: Special ad categories (if applicable)
            
        Returns:
            Dict with campaign id
        """
        if not ad_account_id.startswith("act_"):
            ad_account_id = f"act_{ad_account_id}"
        
        payload = {
            "name": name,
            "objective": objective,
            "status": status,
            "special_ad_categories": special_ad_categories or [],
            "access_token": self.access_token,
        }
        
        result = self._request("POST", f"{ad_account_id}/campaigns", json_data=payload)
        logger.info(f"Created campaign: {result.get('id')}")
        return result
    
    def update_campaign_status(self, campaign_id: str, status: str) -> Dict[str, Any]:
        """Update campaign status (ACTIVE, PAUSED, ARCHIVED)."""
        return self._request(
            "POST",
            campaign_id,
            json_data={"status": status, "access_token": self.access_token}
        )
    
    # =========================================================
    # Ad Set Operations
    # =========================================================
    
    def create_adset(
        self,
        ad_account_id: str,
        campaign_id: str,
        name: str,
        page_id: str,
        whatsapp_phone_number: str,
        daily_budget: int,  # In cents/paise
        targeting: Dict[str, Any],
        start_time: str = None,
        end_time: str = None,
        status: str = "PAUSED",
        bid_strategy: str = "LOWEST_COST_WITHOUT_CAP",
    ) -> Dict[str, Any]:
        """
        Create a Click-to-WhatsApp ad set.
        
        Args:
            ad_account_id: Ad account ID
            campaign_id: Parent campaign ID
            name: Ad set name
            page_id: Facebook Page ID
            whatsapp_phone_number: WhatsApp phone number (with country code)
            daily_budget: Daily budget in cents/paise
            targeting: Targeting configuration
            start_time: Start time (ISO format)
            end_time: End time (ISO format)
            status: Initial status
            bid_strategy: Bid strategy
            
        Returns:
            Dict with adset id
        """
        if not ad_account_id.startswith("act_"):
            ad_account_id = f"act_{ad_account_id}"
        
        payload = {
            "name": name,
            "campaign_id": campaign_id,
            "status": status,
            "billing_event": "IMPRESSIONS",
            "optimization_goal": "CONVERSATIONS",
            "destination_type": "WHATSAPP",
            "bid_strategy": bid_strategy,
            "daily_budget": daily_budget,
            "targeting": targeting,
            "promoted_object": {
                "page_id": page_id,
                "whatsapp_phone_number": whatsapp_phone_number,
            },
            "access_token": self.access_token,
        }
        
        if start_time:
            payload["start_time"] = start_time
        if end_time:
            payload["end_time"] = end_time
        
        result = self._request("POST", f"{ad_account_id}/adsets", json_data=payload)
        logger.info(f"Created ad set: {result.get('id')}")
        return result
    
    # =========================================================
    # Creative Operations
    # =========================================================
    
    def create_creative(
        self,
        ad_account_id: str,
        name: str,
        page_id: str,
        message: str,
        headline: str = None,
        description: str = None,
        image_url: str = None,
        image_hash: str = None,
        video_id: str = None,
        whatsapp_number: str = None,
        link: str = None,
    ) -> Dict[str, Any]:
        """
        Create an ad creative with WhatsApp CTA.
        
        Args:
            ad_account_id: Ad account ID
            name: Creative name
            page_id: Facebook Page ID
            message: Primary text (shown in feed)
            headline: Optional headline
            description: Optional description
            image_url: Image URL (for link ads)
            image_hash: Image hash (for uploaded images)
            video_id: Video ID (for video ads)
            whatsapp_number: WhatsApp number for CTA
            link: Optional link URL
            
        Returns:
            Dict with creative id
        """
        if not ad_account_id.startswith("act_"):
            ad_account_id = f"act_{ad_account_id}"
        
        # Build link_data based on media type
        link_data = {
            "message": message,
            "call_to_action": {
                "type": "WHATSAPP_MESSAGE",
                "value": {},
            },
        }
        
        if whatsapp_number:
            link_data["call_to_action"]["value"]["whatsapp_number"] = whatsapp_number
        
        if link:
            link_data["link"] = link
        else:
            # Default WhatsApp link
            link_data["link"] = f"https://wa.me/{whatsapp_number}" if whatsapp_number else "https://wa.me/"
        
        if image_url:
            link_data["picture"] = image_url
        elif image_hash:
            link_data["image_hash"] = image_hash
        
        if headline:
            link_data["name"] = headline
        
        if description:
            link_data["description"] = description
        
        # Build object_story_spec
        object_story_spec = {
            "page_id": page_id,
        }
        
        if video_id:
            object_story_spec["video_data"] = {
                "video_id": video_id,
                "message": message,
                "call_to_action": link_data["call_to_action"],
            }
        else:
            object_story_spec["link_data"] = link_data
        
        payload = {
            "name": name,
            "object_story_spec": object_story_spec,
            "degrees_of_freedom_spec": {
                "creative_features_spec": {
                    "standard_enhancements": {
                        "enroll_status": "OPT_OUT"  # Disable automatic optimizations
                    }
                }
            },
            "access_token": self.access_token,
        }
        
        result = self._request("POST", f"{ad_account_id}/adcreatives", json_data=payload)
        logger.info(f"Created creative: {result.get('id')}")
        return result
    
    # =========================================================
    # Ad Operations
    # =========================================================
    
    def create_ad(
        self,
        ad_account_id: str,
        adset_id: str,
        creative_id: str,
        name: str,
        status: str = "PAUSED",
    ) -> Dict[str, Any]:
        """
        Create an ad linking creative to ad set.
        
        Args:
            ad_account_id: Ad account ID
            adset_id: Parent ad set ID
            creative_id: Creative ID to use
            name: Ad name
            status: Initial status
            
        Returns:
            Dict with ad id
        """
        if not ad_account_id.startswith("act_"):
            ad_account_id = f"act_{ad_account_id}"
        
        payload = {
            "name": name,
            "adset_id": adset_id,
            "creative": {"creative_id": creative_id},
            "status": status,
            "access_token": self.access_token,
        }
        
        result = self._request("POST", f"{ad_account_id}/ads", json_data=payload)
        logger.info(f"Created ad: {result.get('id')}")
        return result
    
    def get_ad_status(self, ad_id: str) -> Dict[str, Any]:
        """Get ad status and review info."""
        return self._request(
            "GET",
            ad_id,
            params={"fields": "name,status,effective_status,issues_info,review_feedback"}
        )
    
    # =========================================================
    # Insights Operations
    # =========================================================
    
    def get_insights(
        self,
        entity_id: str,
        fields: List[str] = None,
        date_preset: str = "last_7d",
        time_increment: int = None,
    ) -> List[Dict[str, Any]]:
        """
        Get insights for a campaign, ad set, or ad.
        
        Args:
            entity_id: Campaign/AdSet/Ad ID
            fields: Fields to retrieve
            date_preset: Date preset (last_7d, last_30d, lifetime, etc.)
            time_increment: Daily breakdown (1) or total (None)
            
        Returns:
            List of insights data
        """
        default_fields = [
            "impressions",
            "clicks",
            "spend",
            "reach",
            "frequency",
            "actions",
            "cost_per_action_type",
        ]
        
        params = {
            "fields": ",".join(fields or default_fields),
            "date_preset": date_preset,
        }
        
        if time_increment:
            params["time_increment"] = time_increment
        
        result = self._request("GET", f"{entity_id}/insights", params=params)
        return result.get("data", [])
    
    def get_conversations_metric(self, insights: List[Dict]) -> int:
        """Extract conversations started count from insights."""
        if not insights:
            return 0
        
        for insight in insights:
            actions = insight.get("actions", [])
            for action in actions:
                if action.get("action_type") == "onsite_conversion.messaging_conversation_started_7d":
                    return int(action.get("value", 0))
        
        return 0
    
    # =========================================================
    # Validation Helpers
    # =========================================================
    
    def check_page_waba_link(self, page_id: str, waba_id: str) -> bool:
        """Check if a page is linked to a WABA."""
        try:
            result = self._request(
                "GET",
                waba_id,
                params={"fields": "connected_pages"}
            )
            connected_pages = result.get("connected_pages", {}).get("data", [])
            return any(p.get("id") == page_id for p in connected_pages)
        except MetaMarketingAPIError:
            return False
    
    def get_ad_accounts(self, user_id: str = "me") -> List[Dict[str, Any]]:
        """Get ad accounts accessible by the token."""
        result = self._request(
            "GET",
            f"{user_id}/adaccounts",
            params={"fields": "id,name,account_id,currency,timezone_name"}
        )
        return result.get("data", [])
    
    def get_pages(self, user_id: str = "me") -> List[Dict[str, Any]]:
        """Get pages accessible by the token."""
        result = self._request(
            "GET",
            f"{user_id}/accounts",
            params={"fields": "id,name,access_token"}
        )
        return result.get("data", [])
