"""
WhatsApp Models - Phase 1
=========================

SQLAlchemy models for WhatsApp data persistence.

Tables:
    - WhatsAppAccount         → Connected WhatsApp Business accounts
    - WhatsAppConversation    → Chat conversations with users
    - WhatsAppMessage         → Individual messages (sent/received)
    - WhatsAppWebhookLog      → Raw webhook payloads for debugging
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any
import enum
import json

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Enum, Text, JSON, UniqueConstraint, Index

# Import db from main models to share the same instance
from models import db


# ============================================================
# Enums
# ============================================================

class ConversationStatus(enum.Enum):
    """Conversation status states."""
    OPEN = "open"
    CLOSED = "closed"


class MessageDirection(enum.Enum):
    """Message direction."""
    INCOMING = "incoming"
    OUTGOING = "outgoing"


class MessageType(enum.Enum):
    """WhatsApp message types."""
    TEXT = "text"
    TEMPLATE = "template"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    DOCUMENT = "document"
    STICKER = "sticker"
    LOCATION = "location"
    CONTACTS = "contacts"
    INTERACTIVE = "interactive"
    REACTION = "reaction"
    UNKNOWN = "unknown"


class MessageStatus(enum.Enum):
    """Message delivery status."""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"


# ============================================================
# TABLE 1: WhatsApp Accounts
# ============================================================

class WhatsAppAccount(db.Model):
    """
    Connected WhatsApp Business accounts.
    
    Maps to existing workspace system for multi-tenant support.
    """
    __tablename__ = "whatsapp_accounts"
    __table_args__ = (
        UniqueConstraint("waba_id", "phone_number_id", name="uq_waba_phone"),
        Index("ix_whatsapp_accounts_workspace", "workspace_id"),
        {"extend_existing": True},
    )

    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.String(255), nullable=True, index=True)  # maps to existing workspace system
    waba_id = db.Column(db.String(64), nullable=False, index=True)  # WhatsApp Business Account ID
    phone_number_id = db.Column(db.String(64), nullable=False, unique=True)  # Phone Number ID from Meta
    display_phone_number = db.Column(db.String(32), nullable=True)  # Formatted phone number for display
    verified_name = db.Column(db.String(255), nullable=True)  # Business name from Meta
    quality_score = db.Column(db.String(32), nullable=True)  # GREEN, YELLOW, RED
    messaging_limit = db.Column(db.Integer, nullable=True)  # 1K, 10K, 100K, UNLIMITED
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    
    # Phase-2: Token storage (encrypted)
    access_token_encrypted = db.Column(db.Text, nullable=True)  # Encrypted access token
    token_type = db.Column(db.String(16), default="temporary", nullable=False)  # permanent or temporary
    token_expires_at = db.Column(db.DateTime, nullable=True)  # Expiration for temporary tokens
    connected_by_user_id = db.Column(db.String(64), nullable=True, index=True)  # User who connected this account
    last_synced_at = db.Column(db.DateTime, nullable=True)  # Last time account data was synced from Meta
    
    # Metadata
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    conversations = db.relationship("WhatsAppConversation", back_populates="account", lazy="dynamic")

    def __repr__(self):
        return f"<WhatsAppAccount {self.phone_number_id} ({self.display_phone_number})>"

    def to_dict(self, include_token: bool = False) -> Dict[str, Any]:
        """
        Convert account to dictionary.
        
        Args:
            include_token: If True, include decrypted token (for internal use only)
        """
        result = {
            "id": self.id,
            "workspace_id": self.workspace_id,
            "waba_id": self.waba_id,
            "phone_number_id": self.phone_number_id,
            "display_phone_number": self.display_phone_number,
            "verified_name": self.verified_name,
            "quality_score": self.quality_score,
            "messaging_limit": self.messaging_limit,
            "is_active": self.is_active,
            "token_type": self.token_type,
            "token_expires_at": self.token_expires_at.isoformat() if self.token_expires_at else None,
            "connected_by_user_id": self.connected_by_user_id,
            "last_synced_at": self.last_synced_at.isoformat() if self.last_synced_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        
        # Only include token for internal backend use, never expose to frontend
        if include_token and self.access_token_encrypted:
            from .encryption import decrypt_token
            try:
                result["access_token"] = decrypt_token(self.access_token_encrypted)
            except Exception:
                result["access_token"] = None
        
        return result
    
    def get_access_token(self) -> Optional[str]:
        """Get decrypted access token (for internal use only)."""
        if not self.access_token_encrypted:
            return None
        from .encryption import decrypt_token
        try:
            return decrypt_token(self.access_token_encrypted)
        except Exception:
            return None
    
    def set_access_token(self, token: str, token_type: str = "permanent", expires_at: Optional[datetime] = None) -> None:
        """Set encrypted access token."""
        from .encryption import encrypt_token
        self.access_token_encrypted = encrypt_token(token)
        self.token_type = token_type
        self.token_expires_at = expires_at


# ============================================================
# TABLE 2: WhatsApp Conversations
# ============================================================

class WhatsAppConversation(db.Model):
    """
    Chat conversations with WhatsApp users.
    
    A conversation is created when a user messages or when we initiate contact.
    Groups messages by user phone number per account.
    """
    __tablename__ = "whatsapp_conversations"
    __table_args__ = (
        UniqueConstraint("account_id", "user_phone", name="uq_account_user"),
        Index("ix_whatsapp_conversations_status", "status"),
        Index("ix_whatsapp_conversations_last_message", "last_message_at"),
        {"extend_existing": True},
    )

    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey("whatsapp_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_phone = db.Column(db.String(32), nullable=False, index=True)  # User's phone number (E.164 format)
    user_name = db.Column(db.String(255), nullable=True)  # Contact name if available
    status = db.Column(db.String(16), default="open", nullable=False)  # open, closed
    unread_count = db.Column(db.Integer, default=0, nullable=False)  # Unread incoming messages
    
    # Timestamps
    last_message_at = db.Column(db.DateTime, nullable=True)  # When last message was sent/received
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    account = db.relationship("WhatsAppAccount", back_populates="conversations")
    messages = db.relationship("WhatsAppMessage", back_populates="conversation", lazy="dynamic", order_by="WhatsAppMessage.created_at.desc()")

    def __repr__(self):
        return f"<WhatsAppConversation {self.id} with {self.user_phone}>"

    def to_dict(self, include_messages: bool = False, message_limit: int = 50) -> Dict[str, Any]:
        result = {
            "id": self.id,
            "account_id": self.account_id,
            "user_phone": self.user_phone,
            "user_name": self.user_name,
            "status": self.status,
            "unread_count": self.unread_count,
            "last_message_at": self.last_message_at.isoformat() if self.last_message_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        
        if include_messages:
            messages = self.messages.limit(message_limit).all()
            result["messages"] = [m.to_dict() for m in reversed(messages)]  # Oldest first
        
        return result

    def mark_read(self) -> None:
        """Mark all messages as read and reset unread count."""
        self.unread_count = 0
        self.updated_at = datetime.now(timezone.utc)


# ============================================================
# TABLE 3: WhatsApp Messages
# ============================================================

class WhatsAppMessage(db.Model):
    """
    Individual WhatsApp messages (sent and received).
    
    Stores message content as JSON to handle all message types.
    """
    __tablename__ = "whatsapp_messages"
    __table_args__ = (
        Index("ix_whatsapp_messages_wamid", "wamid"),
        Index("ix_whatsapp_messages_direction", "direction"),
        Index("ix_whatsapp_messages_created", "created_at"),
        {"extend_existing": True},
    )

    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey("whatsapp_conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Message metadata
    direction = db.Column(db.String(16), nullable=False)  # incoming, outgoing
    type = db.Column(db.String(32), nullable=False, default="text")  # text, template, image, video, etc.
    
    # Message content (JSON for flexibility)
    content = db.Column(JSON, nullable=True)  # Stores message body, media info, template params, etc.
    
    # WhatsApp message ID for deduplication and status tracking
    wamid = db.Column(db.String(128), nullable=True, unique=True)  # WhatsApp Message ID
    
    # Delivery status (for outgoing messages)
    status = db.Column(db.String(16), default="pending")  # pending, sent, delivered, read, failed
    error_code = db.Column(db.String(16), nullable=True)  # Error code if failed
    error_message = db.Column(db.Text, nullable=True)  # Error description if failed
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    delivered_at = db.Column(db.DateTime, nullable=True)
    read_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    conversation = db.relationship("WhatsAppConversation", back_populates="messages")

    def __repr__(self):
        return f"<WhatsAppMessage {self.id} ({self.direction}/{self.type})>"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "direction": self.direction,
            "type": self.type,
            "content": self.content,
            "wamid": self.wamid,
            "status": self.status,
            "error_code": self.error_code,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "delivered_at": self.delivered_at.isoformat() if self.delivered_at else None,
            "read_at": self.read_at.isoformat() if self.read_at else None,
        }

    def update_status(self, status: str, timestamp: Optional[datetime] = None) -> None:
        """Update message delivery status."""
        self.status = status
        if status == "delivered" and timestamp:
            self.delivered_at = timestamp
        elif status == "read" and timestamp:
            self.read_at = timestamp

    def set_error(self, code: str, message: str) -> None:
        """Set error information for failed messages."""
        self.status = "failed"
        self.error_code = code
        self.error_message = message


# ============================================================
# TABLE 4: WhatsApp Webhook Logs
# ============================================================

class WhatsAppWebhookLog(db.Model):
    """
    Raw webhook payloads for debugging and audit.
    
    Stores every webhook received from Meta for troubleshooting.
    """
    __tablename__ = "whatsapp_webhook_logs"
    __table_args__ = (
        Index("ix_whatsapp_webhook_logs_event", "event_type"),
        Index("ix_whatsapp_webhook_logs_received", "received_at"),
        {"extend_existing": True},
    )

    id = db.Column(db.Integer, primary_key=True)
    raw_json = db.Column(db.Text, nullable=False)  # Complete raw JSON payload
    event_type = db.Column(db.String(64), nullable=True)  # messages, statuses, errors, etc.
    phone_number_id = db.Column(db.String(64), nullable=True)  # For filtering
    processed = db.Column(db.Boolean, default=False, nullable=False)  # Whether successfully processed
    error_message = db.Column(db.Text, nullable=True)  # Processing error if any
    
    # Timestamps
    received_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    processed_at = db.Column(db.DateTime, nullable=True)

    def __repr__(self):
        return f"<WhatsAppWebhookLog {self.id} ({self.event_type})>"

    def to_dict(self) -> Dict[str, Any]:
        # Parse raw_json safely
        try:
            parsed = json.loads(self.raw_json) if self.raw_json else None
        except (json.JSONDecodeError, TypeError):
            parsed = None

        return {
            "id": self.id,
            "event_type": self.event_type,
            "phone_number_id": self.phone_number_id,
            "processed": self.processed,
            "error_message": self.error_message,
            "received_at": self.received_at.isoformat() if self.received_at else None,
            "processed_at": self.processed_at.isoformat() if self.processed_at else None,
            "payload": parsed,
        }

    @classmethod
    def log_webhook(cls, raw_json: str, event_type: Optional[str] = None, phone_number_id: Optional[str] = None) -> "WhatsAppWebhookLog":
        """Create a webhook log entry."""
        log = cls(
            raw_json=raw_json,
            event_type=event_type,
            phone_number_id=phone_number_id,
        )
        db.session.add(log)
        return log

    def mark_processed(self, error: Optional[str] = None) -> None:
        """Mark webhook as processed."""
        self.processed = error is None
        self.error_message = error
        self.processed_at = datetime.now(timezone.utc)


# ============================================================
# TABLE 5: WhatsApp Templates
# ============================================================

class TemplateHeaderType(enum.Enum):
    """Template header types."""
    NONE = "none"
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    DOCUMENT = "document"


class WhatsAppTemplate(db.Model):
    """
    Approved WhatsApp message templates.
    
    Stores metadata about templates for proper payload generation.
    Templates must be approved by Meta before use.
    
    IMPORTANT: In test mode, only approved templates can deliver messages.
    Even if API returns success (wamid), delivery fails without approval.
    """
    __tablename__ = "whatsapp_templates"
    __table_args__ = (
        UniqueConstraint("account_id", "name", "language", name="uq_template_name_lang"),
        Index("ix_whatsapp_templates_name", "name"),
        {"extend_existing": True},
    )

    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey("whatsapp_accounts.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Template identification
    name = db.Column(db.String(128), nullable=False, index=True)  # Template name (lowercase, underscores)
    language = db.Column(db.String(10), nullable=False, default="en")  # Language code (e.g., en, en_US)
    
    # Template structure metadata
    category = db.Column(db.String(32), nullable=True)  # MARKETING, UTILITY, AUTHENTICATION
    
    # Header configuration
    has_header = db.Column(db.Boolean, default=False, nullable=False)
    header_type = db.Column(db.String(16), default="none")  # none, text, image, video, document
    header_text = db.Column(db.String(60), nullable=True)  # Static header text if text type
    header_has_variable = db.Column(db.Boolean, default=False)  # If header contains {{1}}
    
    # Body configuration  
    body_text = db.Column(db.Text, nullable=True)  # Template body text with {{1}}, {{2}} placeholders
    body_variable_count = db.Column(db.Integer, default=0)  # Number of variables in body
    
    # Footer configuration
    has_footer = db.Column(db.Boolean, default=False, nullable=False)
    footer_text = db.Column(db.String(60), nullable=True)
    
    # Button configuration
    has_buttons = db.Column(db.Boolean, default=False, nullable=False)
    button_type = db.Column(db.String(32), nullable=True)  # QUICK_REPLY, CTA (call_to_action)
    button_count = db.Column(db.Integer, default=0)
    buttons_config = db.Column(JSON, nullable=True)  # Button details as JSON
    
    # Status
    status = db.Column(db.String(32), default="PENDING")  # PENDING, APPROVED, REJECTED
    rejection_reason = db.Column(db.Text, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    synced_at = db.Column(db.DateTime, nullable=True)  # Last synced from Meta API

    def __repr__(self):
        return f"<WhatsAppTemplate {self.name} ({self.language})>"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "account_id": self.account_id,
            "name": self.name,
            "language": self.language,
            "category": self.category,
            "has_header": self.has_header,
            "header_type": self.header_type,
            "header_text": self.header_text,
            "header_has_variable": self.header_has_variable,
            "body_text": self.body_text,
            "body_variable_count": self.body_variable_count,
            "has_footer": self.has_footer,
            "footer_text": self.footer_text,
            "has_buttons": self.has_buttons,
            "button_type": self.button_type,
            "button_count": self.button_count,
            "buttons_config": self.buttons_config,
            "status": self.status,
            "rejection_reason": self.rejection_reason,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "synced_at": self.synced_at.isoformat() if self.synced_at else None,
        }

    def requires_components(self) -> bool:
        """
        Check if this template requires components in the API payload.
        
        Templates without variables or media headers don't need components.
        hello_world is a prime example - it must be sent WITHOUT components.
        """
        if self.header_has_variable:
            return True
        if self.header_type in ("image", "video", "document"):
            return True
        if self.body_variable_count > 0:
            return True
        if self.has_buttons and self.button_type == "CTA":
            # CTA buttons with dynamic URLs need components
            return True
        return False

    @classmethod
    def get_or_create(cls, name: str, language: str = "en", **kwargs) -> "WhatsAppTemplate":
        """Get existing template or create a new one."""
        template = cls.query.filter_by(name=name, language=language).first()
        if not template:
            template = cls(name=name, language=language, **kwargs)
            db.session.add(template)
            db.session.flush()
        return template
