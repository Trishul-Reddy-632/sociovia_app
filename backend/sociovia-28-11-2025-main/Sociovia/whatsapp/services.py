"""
WhatsApp Services - Phase 1
===========================

Core WhatsApp Cloud API messaging functions.
All messaging operations go through this service layer.

Functions:
    - send_text_message(to, text)
    - send_template_message(to, template_name, params)
    - send_media_message(to, type, media_url)
    - send_interactive_message(to, buttons_or_list)

All functions:
    ✔ Use WhatsApp Cloud API
    ✔ Get token from environment (WHATSAPP_ACCESS_TOKEN or WHATSAPP_TEMP_TOKEN)
    ✔ Use phone_number_id from environment
    ✔ Return full API response
    ✔ Store outgoing message in DB
    ✔ Create conversation automatically if not exists
"""

import os
import logging
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Tuple

import requests

from models import db
from .models import (
    WhatsAppAccount,
    WhatsAppConversation,
    WhatsAppMessage,
)

logger = logging.getLogger(__name__)

# WhatsApp Cloud API base URL
WHATSAPP_API_BASE = "https://graph.facebook.com"


class WhatsAppService:
    """
    WhatsApp Cloud API messaging service.
    
    Handles all outgoing messages and database persistence.
    """
    
    def __init__(
        self,
        db_session=None,
        phone_number_id: Optional[str] = None,
        access_token: Optional[str] = None,
        waba_id: Optional[str] = None,
        workspace_id: Optional[str] = None,
    ):
        """
        Initialize WhatsApp service.
        
        Args:
            db_session: SQLAlchemy session (optional, uses default if not provided)
            phone_number_id: WhatsApp phone number ID (falls back to stored account or env var)
            access_token: Access token (falls back to stored account or env var)
            waba_id: WhatsApp Business Account ID (falls back to stored account or env var)
            workspace_id: Workspace ID to look up stored account (Phase-2)
        """
        self.db_session = db_session or db.session
        self.api_version = os.getenv("WHATSAPP_API_VERSION", "v22.0")
        
        # Phase-2: Try to get stored account for workspace first
        stored_account = None
        if workspace_id:
            stored_account = self._get_workspace_account(workspace_id)
        
        if stored_account:
            # Use stored account credentials
            self.access_token = stored_account.get_access_token()
            self.phone_number_id = stored_account.phone_number_id
            self.waba_id = stored_account.waba_id
        else:
            # Fall back to provided params or env vars
            self.phone_number_id = phone_number_id or os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
            self.access_token = access_token or os.getenv("WHATSAPP_ACCESS_TOKEN") or os.getenv("WHATSAPP_TEMP_TOKEN", "")
            self.waba_id = waba_id or os.getenv("WHATSAPP_WABA_ID", "")
    
    def _get_workspace_account(self, workspace_id: str) -> Optional["WhatsAppAccount"]:
        """Get active WhatsApp account for workspace."""
        from .models import WhatsAppAccount
        return WhatsAppAccount.query.filter_by(
            workspace_id=workspace_id,
            is_active=True,
        ).order_by(WhatsAppAccount.created_at.desc()).first()
        
    @property
    def api_url(self) -> str:
        """Get API URL for sending messages."""
        return f"{WHATSAPP_API_BASE}/{self.api_version}/{self.phone_number_id}/messages"
    
    @property
    def headers(self) -> Dict[str, str]:
        """Get request headers with authorization."""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }
    
    # ============================================================
    # Core API Methods
    # ============================================================
    
    def _send_api_request(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send request to WhatsApp Cloud API.
        
        Args:
            payload: Message payload
            
        Returns:
            API response dict with success status
        """
        try:
            logger.info(f"Sending WhatsApp API request to {self.api_url}")
            logger.debug(f"Payload: {json.dumps(payload, indent=2)}")
            
            response = requests.post(
                self.api_url,
                headers=self.headers,
                json=payload,
                timeout=30,
            )
            
            response_data = response.json()
            logger.debug(f"Response: {json.dumps(response_data, indent=2)}")
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "response": response_data,
                    "wamid": response_data.get("messages", [{}])[0].get("id"),
                }
            else:
                error = response_data.get("error", {})
                logger.error(f"WhatsApp API error: {error}")
                return {
                    "success": False,
                    "error": error.get("message", "Unknown error"),
                    "error_code": error.get("code"),
                    "response": response_data,
                }
                
        except requests.exceptions.Timeout:
            logger.error("WhatsApp API timeout")
            return {"success": False, "error": "Request timeout"}
        except requests.exceptions.RequestException as e:
            logger.exception(f"WhatsApp API request failed: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.exception(f"Unexpected error: {e}")
            return {"success": False, "error": str(e)}
    
    def _get_or_create_conversation(
        self,
        user_phone: str,
        user_name: Optional[str] = None,
    ) -> WhatsAppConversation:
        """
        Get existing conversation or create a new one.
        
        Args:
            user_phone: User's phone number
            user_name: User's name (optional)
            
        Returns:
            WhatsAppConversation instance
        """
        # Normalize phone number
        user_phone = self._normalize_phone(user_phone)
        
        # Get or create account
        account = self._get_or_create_account()
        
        # Find existing conversation
        conversation = WhatsAppConversation.query.filter_by(
            account_id=account.id,
            user_phone=user_phone,
        ).first()
        
        if not conversation:
            conversation = WhatsAppConversation(
                account_id=account.id,
                user_phone=user_phone,
                user_name=user_name,
                status="open",
            )
            self.db_session.add(conversation)
            self.db_session.flush()  # Get ID without committing
            logger.info(f"Created new conversation with {user_phone}")
        
        return conversation
    
    def _get_or_create_account(self) -> WhatsAppAccount:
        """Get or create WhatsApp account record."""
        account = WhatsAppAccount.query.filter_by(
            phone_number_id=self.phone_number_id
        ).first()
        
        if not account:
            account = WhatsAppAccount(
                waba_id=self.waba_id or "unknown",
                phone_number_id=self.phone_number_id,
                display_phone_number=self.phone_number_id,  # Will be updated from API
                is_active=True,
            )
            self.db_session.add(account)
            self.db_session.flush()
            logger.info(f"Created new WhatsApp account: {self.phone_number_id}")
        
        return account
    
    def _store_outgoing_message(
        self,
        conversation: WhatsAppConversation,
        message_type: str,
        content: Dict[str, Any],
        wamid: Optional[str] = None,
        status: str = "pending",
        error_code: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> WhatsAppMessage:
        """
        Store outgoing message in database.
        
        Args:
            conversation: Conversation instance
            message_type: Type of message (text, template, etc.)
            content: Message content
            wamid: WhatsApp message ID (if sent successfully)
            status: Message status
            error_code: Error code (if failed)
            error_message: Error message (if failed)
            
        Returns:
            WhatsAppMessage instance
        """
        message = WhatsAppMessage(
            conversation_id=conversation.id,
            direction="outgoing",
            type=message_type,
            content=content,
            wamid=wamid,
            status=status,
            error_code=error_code,
            error_message=error_message,
        )
        self.db_session.add(message)
        
        # Update conversation timestamp
        conversation.last_message_at = datetime.now(timezone.utc)
        
        self.db_session.commit()
        return message
    
    @staticmethod
    def _normalize_phone(phone: str) -> str:
        """Normalize phone number (remove +, spaces, dashes)."""
        return phone.replace("+", "").replace(" ", "").replace("-", "").strip()
    
    # ============================================================
    # Send Text Message
    # ============================================================
    
    def send_text(
        self,
        to: str,
        text: str,
        waba_id: Optional[str] = None,
        preview_url: bool = False,
    ) -> Dict[str, Any]:
        """
        Send a text message.
        
        Args:
            to: Recipient phone number (E.164 format without +)
            text: Message text
            waba_id: Optional WABA ID override
            preview_url: Whether to show URL preview
            
        Returns:
            Response dict with success status
        """
        to = self._normalize_phone(to)
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "text",
            "text": {
                "preview_url": preview_url,
                "body": text,
            },
        }
        
        # Get or create conversation
        conversation = self._get_or_create_conversation(to)
        
        # Send via API
        result = self._send_api_request(payload)
        
        # Store message in DB
        message = self._store_outgoing_message(
            conversation=conversation,
            message_type="text",
            content={"text": text, "preview_url": preview_url},
            wamid=result.get("wamid"),
            status="sent" if result.get("success") else "failed",
            error_code=str(result.get("error_code")) if result.get("error_code") else None,
            error_message=result.get("error") if not result.get("success") else None,
        )
        
        result["message_id"] = message.id
        result["conversation_id"] = conversation.id
        
        return result
    
    # ============================================================
    # Send Template Message
    # ============================================================
    
    def send_template(
        self,
        to: str,
        template_name: str,
        language_code: str = "en",
        components: Optional[List[Dict]] = None,
        waba_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send a template message.
        
        IMPORTANT: Meta Cloud API is strict about template payloads:
        - Templates without variables (like hello_world) must NOT include components
        - Never send empty components array - omit the field entirely
        - recipient_type is NOT required for template messages
        
        Args:
            to: Recipient phone number
            template_name: Template name (must be approved)
            language_code: Language code (default: en)
            components: Template components (header, body, button params) - ONLY if template has variables
            waba_id: Optional WABA ID override
            
        Returns:
            Response dict with success status
        """
        to = self._normalize_phone(to)
        
        # Build template object - EXACTLY matching Meta API format
        template_obj = {
            "name": template_name,
            "language": {"code": language_code},
        }
        
        # CRITICAL: Only include components if they are actually needed
        # An empty array [] or None should NOT add the components field
        if components and len(components) > 0:
            # Validate components have actual parameters
            valid_components = [c for c in components if c.get("parameters")]
            if valid_components:
                template_obj["components"] = valid_components
        
        # Build payload WITHOUT recipient_type (not required for templates)
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "template",
            "template": template_obj,
        }
        
        # Log the exact payload being sent for debugging
        logger.info(f"Sending template '{template_name}' to {to}")
        logger.debug(f"Template payload: {json.dumps(payload, indent=2)}")
        
        # Get or create conversation
        conversation = self._get_or_create_conversation(to)
        
        # Send via API
        result = self._send_api_request(payload)
        
        # Enhanced logging for template delivery issues
        if result.get("success"):
            logger.info(f"Template '{template_name}' sent successfully, wamid: {result.get('wamid')}")
        else:
            logger.error(f"Template '{template_name}' failed: {result.get('error')}")
        
        # Store message in DB
        message = self._store_outgoing_message(
            conversation=conversation,
            message_type="template",
            content={
                "template_name": template_name,
                "language": language_code,
                "components": components if components else None,
                "payload_sent": payload,  # Store actual payload for debugging
            },
            wamid=result.get("wamid"),
            status="sent" if result.get("success") else "failed",
            error_code=str(result.get("error_code")) if result.get("error_code") else None,
            error_message=result.get("error") if not result.get("success") else None,
        )
        
        result["message_id"] = message.id
        result["conversation_id"] = conversation.id
        result["payload_sent"] = payload  # Return payload for debugging
        
        return result
    
    def send_template_with_builder(
        self,
        to: str,
        template_name: str,
        language_code: str = "en",
        body_params: Optional[List[str]] = None,
        header_image_url: Optional[str] = None,
        header_video_url: Optional[str] = None,
        header_document_url: Optional[str] = None,
        header_text: Optional[str] = None,
        button_payloads: Optional[List[Dict]] = None,
        waba_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send a template message using the TemplateBuilder for proper payload generation.
        
        This method is recommended over send_template() as it properly handles:
        - Templates without variables (no components field)
        - Image/video/document headers
        - Body parameters
        - Button parameters
        
        Args:
            to: Recipient phone number
            template_name: Template name (must be approved)
            language_code: Language code (default: en)
            body_params: List of body parameter values (for {{1}}, {{2}}, etc.)
            header_image_url: URL for image header
            header_video_url: URL for video header
            header_document_url: URL for document header
            header_text: Text for header variable
            button_payloads: List of button configs [{"index": 0, "type": "url", "value": "..."}]
            waba_id: Optional WABA ID override
            
        Returns:
            Response dict with success status
        """
        from .template_builder import TemplateBuilder
        
        to = self._normalize_phone(to)
        
        # Use builder to construct proper payload
        builder = TemplateBuilder(template_name, language_code)
        
        # Add header if provided
        if header_image_url:
            builder.add_header_image(header_image_url)
        elif header_video_url:
            builder.add_header_video(header_video_url)
        elif header_document_url:
            builder.add_header_document(header_document_url)
        elif header_text:
            builder.add_header_text(header_text)
        
        # Add body params if provided
        if body_params:
            builder.add_body_params(body_params)
        
        # Add button params if provided
        if button_payloads:
            for btn in button_payloads:
                btn_index = btn.get("index", 0)
                btn_type = btn.get("type", "url")
                btn_value = btn.get("value", "")
                
                if btn_type == "url":
                    builder.add_url_button(btn_index, btn_value)
                elif btn_type == "quick_reply":
                    builder.add_quick_reply_button(btn_index, btn_value)
                elif btn_type == "copy_code":
                    builder.add_copy_code_button(btn_index, btn_value)
        
        # Build payload
        payload = builder.build_with_recipient(to)
        
        # Log for debugging
        logger.info(f"Sending template '{template_name}' via builder to {to}")
        logger.debug(f"Builder payload: {json.dumps(payload, indent=2)}")
        
        # Get or create conversation
        conversation = self._get_or_create_conversation(to)
        
        # Send via API
        result = self._send_api_request(payload)
        
        # Store message in DB
        message = self._store_outgoing_message(
            conversation=conversation,
            message_type="template",
            content={
                "template_name": template_name,
                "language": language_code,
                "body_params": body_params,
                "header_image_url": header_image_url,
                "header_video_url": header_video_url,
                "header_document_url": header_document_url,
                "header_text": header_text,
                "button_payloads": button_payloads,
                "payload_sent": payload,
            },
            wamid=result.get("wamid"),
            status="sent" if result.get("success") else "failed",
            error_code=str(result.get("error_code")) if result.get("error_code") else None,
            error_message=result.get("error") if not result.get("success") else None,
        )
        
        result["message_id"] = message.id
        result["conversation_id"] = conversation.id
        result["payload_sent"] = payload
        
        return result
    
    # ============================================================
    # Send Media Messages
    # ============================================================
    
    def send_image(
        self,
        to: str,
        image_url: Optional[str] = None,
        image_id: Optional[str] = None,
        caption: Optional[str] = None,
        waba_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send an image message.
        
        Args:
            to: Recipient phone number
            image_url: URL of the image (either url or id required)
            image_id: Media ID of uploaded image
            caption: Optional caption
            waba_id: Optional WABA ID override
            
        Returns:
            Response dict with success status
        """
        return self._send_media(to, "image", image_url, image_id, caption, waba_id)
    
    def send_video(
        self,
        to: str,
        video_url: Optional[str] = None,
        video_id: Optional[str] = None,
        caption: Optional[str] = None,
        waba_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send a video message."""
        return self._send_media(to, "video", video_url, video_id, caption, waba_id)
    
    def send_audio(
        self,
        to: str,
        audio_url: Optional[str] = None,
        audio_id: Optional[str] = None,
        waba_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send an audio message (no caption support)."""
        return self._send_media(to, "audio", audio_url, audio_id, None, waba_id)
    
    def send_document(
        self,
        to: str,
        document_url: Optional[str] = None,
        document_id: Optional[str] = None,
        caption: Optional[str] = None,
        filename: Optional[str] = None,
        waba_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send a document message."""
        return self._send_media(to, "document", document_url, document_id, caption, waba_id, filename)
    
    def _send_media(
        self,
        to: str,
        media_type: str,
        media_url: Optional[str] = None,
        media_id: Optional[str] = None,
        caption: Optional[str] = None,
        waba_id: Optional[str] = None,
        filename: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Internal method to send any media message.
        
        Args:
            to: Recipient phone number
            media_type: Type of media (image, video, audio, document)
            media_url: URL of media (either url or id required)
            media_id: Media ID if uploaded
            caption: Optional caption (not supported for audio)
            waba_id: Optional WABA ID override
            filename: Optional filename (for documents)
            
        Returns:
            Response dict with success status
        """
        to = self._normalize_phone(to)
        
        if not media_url and not media_id:
            return {"success": False, "error": "Either media_url or media_id is required"}
        
        media_obj = {}
        if media_id:
            media_obj["id"] = media_id
        else:
            media_obj["link"] = media_url
        
        if caption and media_type != "audio":
            media_obj["caption"] = caption
        
        if filename and media_type == "document":
            media_obj["filename"] = filename
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": media_type,
            media_type: media_obj,
        }
        
        # Get or create conversation
        conversation = self._get_or_create_conversation(to)
        
        # Send via API
        result = self._send_api_request(payload)
        
        # Store message in DB
        message = self._store_outgoing_message(
            conversation=conversation,
            message_type=media_type,
            content={
                "media_type": media_type,
                "url": media_url,
                "id": media_id,
                "caption": caption,
                "filename": filename,
            },
            wamid=result.get("wamid"),
            status="sent" if result.get("success") else "failed",
            error_code=str(result.get("error_code")) if result.get("error_code") else None,
            error_message=result.get("error") if not result.get("success") else None,
        )
        
        result["message_id"] = message.id
        result["conversation_id"] = conversation.id
        
        return result
    
    # ============================================================
    # Send Interactive Messages
    # ============================================================
    
    def send_interactive_buttons(
        self,
        to: str,
        body_text: str,
        buttons: List[Dict[str, str]],
        header_text: Optional[str] = None,
        footer_text: Optional[str] = None,
        waba_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send an interactive message with buttons (max 3 buttons).
        
        Args:
            to: Recipient phone number
            body_text: Message body text
            buttons: List of button dicts [{"id": "btn1", "title": "Button 1"}, ...]
            header_text: Optional header
            footer_text: Optional footer
            waba_id: Optional WABA ID override
            
        Returns:
            Response dict with success status
        """
        to = self._normalize_phone(to)
        
        # Format buttons
        formatted_buttons = []
        for btn in buttons[:3]:  # Max 3 buttons
            formatted_buttons.append({
                "type": "reply",
                "reply": {
                    "id": btn.get("id", str(len(formatted_buttons) + 1)),
                    "title": btn.get("title", "")[:20],  # Max 20 chars
                },
            })
        
        interactive = {
            "type": "button",
            "body": {"text": body_text},
            "action": {"buttons": formatted_buttons},
        }
        
        if header_text:
            interactive["header"] = {"type": "text", "text": header_text}
        
        if footer_text:
            interactive["footer"] = {"text": footer_text}
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "interactive",
            "interactive": interactive,
        }
        
        # Get or create conversation
        conversation = self._get_or_create_conversation(to)
        
        # Send via API
        result = self._send_api_request(payload)
        
        # Store message in DB
        message = self._store_outgoing_message(
            conversation=conversation,
            message_type="interactive",
            content={
                "interactive_type": "button",
                "body": body_text,
                "header": header_text,
                "footer": footer_text,
                "buttons": buttons,
            },
            wamid=result.get("wamid"),
            status="sent" if result.get("success") else "failed",
            error_code=str(result.get("error_code")) if result.get("error_code") else None,
            error_message=result.get("error") if not result.get("success") else None,
        )
        
        result["message_id"] = message.id
        result["conversation_id"] = conversation.id
        
        return result
    
    def send_interactive_list(
        self,
        to: str,
        body_text: str,
        button_text: str,
        sections: List[Dict],
        header_text: Optional[str] = None,
        footer_text: Optional[str] = None,
        waba_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send an interactive message with a list menu.
        
        Args:
            to: Recipient phone number
            body_text: Message body text
            button_text: Button text to open the list
            sections: List of sections with rows
            header_text: Optional header
            footer_text: Optional footer
            waba_id: Optional WABA ID override
            
        Returns:
            Response dict with success status
        """
        to = self._normalize_phone(to)
        
        interactive = {
            "type": "list",
            "body": {"text": body_text},
            "action": {
                "button": button_text[:20],  # Max 20 chars
                "sections": sections,
            },
        }
        
        if header_text:
            interactive["header"] = {"type": "text", "text": header_text}
        
        if footer_text:
            interactive["footer"] = {"text": footer_text}
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "interactive",
            "interactive": interactive,
        }
        
        # Get or create conversation
        conversation = self._get_or_create_conversation(to)
        
        # Send via API
        result = self._send_api_request(payload)
        
        # Store message in DB
        message = self._store_outgoing_message(
            conversation=conversation,
            message_type="interactive",
            content={
                "interactive_type": "list",
                "body": body_text,
                "header": header_text,
                "footer": footer_text,
                "button": button_text,
                "sections": sections,
            },
            wamid=result.get("wamid"),
            status="sent" if result.get("success") else "failed",
            error_code=str(result.get("error_code")) if result.get("error_code") else None,
            error_message=result.get("error") if not result.get("success") else None,
        )
        
        result["message_id"] = message.id
        result["conversation_id"] = conversation.id
        
        return result


# ============================================================
# Conversation Service
# ============================================================

class ConversationService:
    """
    Service for managing conversations.
    """
    
    def __init__(self, db_session=None):
        self.db_session = db_session or db.session
    
    def get_conversations(
        self,
        phone_number_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """
        Get list of conversations.
        
        Args:
            phone_number_id: Filter by phone number ID
            status: Filter by status (open, closed)
            limit: Max results
            offset: Pagination offset
            
        Returns:
            List of conversation dicts
        """
        query = WhatsAppConversation.query
        
        if phone_number_id:
            query = query.join(WhatsAppAccount).filter(
                WhatsAppAccount.phone_number_id == phone_number_id
            )
        
        if status:
            query = query.filter(WhatsAppConversation.status == status)
        
        conversations = (
            query
            .order_by(WhatsAppConversation.last_message_at.desc().nullslast())
            .offset(offset)
            .limit(limit)
            .all()
        )
        
        return [c.to_dict() for c in conversations]
    
    def get_conversation(
        self,
        conversation_id: int,
        include_messages: bool = True,
        message_limit: int = 50,
    ) -> Optional[Dict[str, Any]]:
        """
        Get single conversation with messages.
        
        Args:
            conversation_id: Conversation ID
            include_messages: Whether to include messages
            message_limit: Max messages to include
            
        Returns:
            Conversation dict or None
        """
        conversation = WhatsAppConversation.query.get(conversation_id)
        
        if not conversation:
            return None
        
        return conversation.to_dict(
            include_messages=include_messages,
            message_limit=message_limit,
        )
    
    def get_messages(
        self,
        conversation_id: int,
        limit: int = 100,
        before_id: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get messages for a conversation.
        
        Args:
            conversation_id: Conversation ID
            limit: Max messages
            before_id: Get messages before this ID (for pagination)
            
        Returns:
            List of message dicts
        """
        query = WhatsAppMessage.query.filter_by(conversation_id=conversation_id)
        
        if before_id:
            query = query.filter(WhatsAppMessage.id < before_id)
        
        messages = (
            query
            .order_by(WhatsAppMessage.created_at.desc())
            .limit(limit)
            .all()
        )
        
        # Return oldest first
        return [m.to_dict() for m in reversed(messages)]
    
    def mark_conversation_read(self, conversation_id: int) -> bool:
        """
        Mark conversation as read.
        
        Args:
            conversation_id: Conversation ID
            
        Returns:
            True if successful
        """
        conversation = WhatsAppConversation.query.get(conversation_id)
        
        if not conversation:
            return False
        
        conversation.mark_read()
        self.db_session.commit()
        
        return True


# ============================================================
# Standalone Helper Functions (for backward compatibility)
# ============================================================

def send_text_message(to: str, text: str) -> Dict[str, Any]:
    """
    Send a text message (standalone function).
    
    Args:
        to: Recipient phone number
        text: Message text
        
    Returns:
        Response dict
    """
    service = WhatsAppService()
    return service.send_text(to, text)


def send_template_message(
    to: str,
    template_name: str,
    params: Optional[List] = None,
    language: str = "en",
) -> Dict[str, Any]:
    """
    Send a template message (standalone function).
    
    Args:
        to: Recipient phone number
        template_name: Template name
        params: Template parameters (will be converted to components)
        language: Language code
        
    Returns:
        Response dict
    """
    # Convert params to components format if provided
    components = None
    if params:
        components = [{
            "type": "body",
            "parameters": [{"type": "text", "text": str(p)} for p in params],
        }]
    
    service = WhatsAppService()
    return service.send_template(to, template_name, language, components)


def send_media_message(
    to: str,
    media_type: str,
    media_url: str,
    caption: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Send a media message (standalone function).
    
    Args:
        to: Recipient phone number
        media_type: Type of media (image, video, audio, document)
        media_url: URL of the media
        caption: Optional caption
        
    Returns:
        Response dict
    """
    service = WhatsAppService()
    return service._send_media(to, media_type, media_url, caption=caption)


def send_interactive_message(
    to: str,
    interactive_type: str,
    body_text: str,
    buttons_or_sections: List[Dict],
    **kwargs,
) -> Dict[str, Any]:
    """
    Send an interactive message (standalone function).
    
    Args:
        to: Recipient phone number
        interactive_type: "button" or "list"
        body_text: Message body text
        buttons_or_sections: Buttons (for button type) or sections (for list type)
        **kwargs: Additional options (header_text, footer_text, button_text)
        
    Returns:
        Response dict
    """
    service = WhatsAppService()
    
    if interactive_type == "button":
        return service.send_interactive_buttons(
            to=to,
            body_text=body_text,
            buttons=buttons_or_sections,
            header_text=kwargs.get("header_text"),
            footer_text=kwargs.get("footer_text"),
        )
    elif interactive_type == "list":
        return service.send_interactive_list(
            to=to,
            body_text=body_text,
            button_text=kwargs.get("button_text", "Options"),
            sections=buttons_or_sections,
            header_text=kwargs.get("header_text"),
            footer_text=kwargs.get("footer_text"),
        )
    else:
        return {"success": False, "error": f"Unknown interactive type: {interactive_type}"}
