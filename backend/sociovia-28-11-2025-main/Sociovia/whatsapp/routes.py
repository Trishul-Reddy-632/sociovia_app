"""
WhatsApp Phase 1 API Routes
============================

Flask Blueprint for WhatsApp Cloud API endpoints.

Endpoints:
    POST /api/whatsapp/send/text             - Send text message
    POST /api/whatsapp/send/template         - Send template message (simple)
    POST /api/whatsapp/send/template/advanced - Send template (with builder)
    POST /api/whatsapp/send/media            - Send media message
    POST /api/whatsapp/send/interactive      - Send interactive message
    POST /api/whatsapp/send                  - Send any message type
    
    GET  /api/whatsapp/conversations                  - List conversations
    GET  /api/whatsapp/conversations/<id>             - Get conversation with messages
    GET  /api/whatsapp/conversations/<id>/messages    - Get messages only
    POST /api/whatsapp/conversations/<id>/read        - Mark conversation as read
    
    POST /api/whatsapp/webhook           - Webhook receiver
    GET  /api/whatsapp/webhook           - Webhook verification
    GET  /api/whatsapp/webhook-logs      - View webhook logs
    
    GET  /api/whatsapp/health            - Health check
"""

import os
import logging
from functools import wraps
from flask import Blueprint, request, jsonify, g

from .webhook import verify_webhook_signature, verify_webhook_challenge, WebhookProcessor
from .services import WhatsAppService, ConversationService
from .validators import (
    ValidationError,
    validate_text_message,
    validate_template_message,
    validate_media_message,
    validate_interactive_buttons,
    validate_interactive_list,
    format_validation_error,
)

logger = logging.getLogger(__name__)

whatsapp_bp = Blueprint("whatsapp", __name__)


# ============================================================
# Helpers
# ============================================================

def get_db():
    """Get database session."""
    from models import db
    return db.session


def get_access_token():
    """
    Get access token from request header or environment.
    Priority: Header > Environment
    """
    # Check for token in header (for testing UI)
    auth_header = request.headers.get("X-WhatsApp-Token", "")
    if auth_header:
        return auth_header
    
    # Check Authorization header
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    
    # Fall back to environment variables
    env_token = os.getenv("WHATSAPP_ACCESS_TOKEN") or os.getenv("WHATSAPP_TEMP_TOKEN")
    return env_token or ""


def get_phone_number_id():
    """Get phone number ID from request or environment."""
    # Check request body first
    if request.is_json:
        data = request.get_json(silent=True) or {}
        pid = data.get("phone_number_id")
        if pid:
            return pid
    
    # Check query params
    pid = request.args.get("phone_number_id")
    if pid:
        return pid
    
    # Fall back to environment
    return os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")


def require_token(f):
    """Decorator to require a valid access token."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = get_access_token()
        if not token:
            return jsonify({
                "success": False,
                "error": "Access token required. Set WHATSAPP_ACCESS_TOKEN or pass X-WhatsApp-Token header."
            }), 401
        g.access_token = token
        return f(*args, **kwargs)
    return decorated


def handle_validation_error(error: ValidationError):
    """Return formatted validation error response."""
    return jsonify(format_validation_error(error)), 400


# ============================================================
# Webhook Endpoints
# ============================================================

@whatsapp_bp.route("/webhook", methods=["GET"])
def webhook_verify():
    """
    Verify webhook subscription from Meta.
    
    GET /api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=xxx&hub.challenge=xxx
    """
    mode = request.args.get("hub.mode", "")
    token = request.args.get("hub.verify_token", "")
    challenge = request.args.get("hub.challenge", "")
    
    result = verify_webhook_challenge(mode, token, challenge)
    
    if result:
        logger.info("Webhook verification successful")
        return result, 200
    
    logger.warning("Webhook verification failed")
    return "Forbidden", 403


@whatsapp_bp.route("/webhook", methods=["POST"])
def webhook_receive():
    """
    Receive webhook events from Meta.
    
    POST /api/whatsapp/webhook
    
    IMPORTANT: Always respond 200 OK immediately, then process.
    """
    # Verify signature if app secret is configured
    signature = request.headers.get("X-Hub-Signature-256", "")
    app_secret = os.getenv("WHATSAPP_APP_SECRET", "")
    
    if app_secret:
        if not verify_webhook_signature(request.data, signature, app_secret):
            logger.warning("Invalid webhook signature")
            # Still return 200 to prevent retries, but log the issue
            return "OK", 200
    
    payload = request.get_json(silent=True)
    
    if not payload:
        return "OK", 200
    
    # Process webhook (synchronous for Phase 1)
    try:
        processor = WebhookProcessor(get_db())
        success, message = processor.process_webhook(payload)
        
        if not success:
            logger.error(f"Webhook processing error: {message}")
    except Exception as e:
        logger.exception(f"Webhook exception: {e}")
    
    # Always return 200 OK
    return "OK", 200


# ============================================================
# Send Message Endpoints
# ============================================================

@whatsapp_bp.route("/send/text", methods=["POST"])
@require_token
def send_text():
    """
    Send a text message.
    
    POST /api/whatsapp/send/text
    
    Request body:
    {
        "to": "919876543210",
        "text": "Hello!"
    }
    """
    try:
        data = request.get_json(silent=True) or {}
        
        # Validate
        to, text = validate_text_message(data)
        
        phone_number_id = get_phone_number_id()
        if not phone_number_id:
            return jsonify({
                "success": False,
                "error": "phone_number_id required. Set WHATSAPP_PHONE_NUMBER_ID env var."
            }), 400
        
        # Send
        service = WhatsAppService(get_db(), phone_number_id, g.access_token)
        result = service.send_text(to=to, text=text, preview_url=data.get("preview_url", False))
        
        return jsonify(result), 200 if result.get("success") else 400
        
    except ValidationError as e:
        return handle_validation_error(e)
    except Exception as exc:
        logger.exception(f"send_text exception: {exc}")
        return jsonify({"success": False, "error": str(exc)}), 500


@whatsapp_bp.route("/send/template", methods=["POST"])
@require_token
def send_template():
    """
    Send a template message.
    
    POST /api/whatsapp/send/template
    
    Request body:
    {
        "to": "919876543210",
        "template_name": "hello_world",
        "language": "en",
        "params": []  // or "components": [...]
    }
    """
    try:
        data = request.get_json(silent=True) or {}
        
        # Validate
        to, template_name, language, components = validate_template_message(data)
        
        phone_number_id = get_phone_number_id()
        if not phone_number_id:
            return jsonify({
                "success": False,
                "error": "phone_number_id required. Set WHATSAPP_PHONE_NUMBER_ID env var."
            }), 400
        
        # Send
        service = WhatsAppService(get_db(), phone_number_id, g.access_token)
        result = service.send_template(
            to=to,
            template_name=template_name,
            language_code=language,
            components=components,
        )
        
        return jsonify(result), 200 if result.get("success") else 400
        
    except ValidationError as e:
        return handle_validation_error(e)
    except Exception as exc:
        logger.exception(f"send_template exception: {exc}")
        return jsonify({"success": False, "error": str(exc)}), 500


@whatsapp_bp.route("/send/template/advanced", methods=["POST"])
@require_token
def send_template_advanced():
    """
    Send a template message using TemplateBuilder (for complex templates).
    
    POST /api/whatsapp/send/template/advanced
    
    Request body:
    {
        "to": "919876543210",
        "template_name": "promo_with_image",
        "language": "en",
        "header_image_url": "https://example.com/image.jpg",  // optional
        "body_params": ["Summer Sale", "50%"],                // optional
        "button_url_suffix": "promo123"                       // optional
    }
    """
    try:
        data = request.get_json(silent=True) or {}
        
        to = data.get("to", "")
        if not to:
            return jsonify({"success": False, "error": "to is required"}), 400
            
        template_name = data.get("template_name", "")
        if not template_name:
            return jsonify({"success": False, "error": "template_name is required"}), 400
            
        language = data.get("language", "en")
        header_image_url = data.get("header_image_url")
        body_params = data.get("body_params", [])
        button_url_suffix = data.get("button_url_suffix")
        
        phone_number_id = get_phone_number_id()
        if not phone_number_id:
            return jsonify({
                "success": False,
                "error": "phone_number_id required. Set WHATSAPP_PHONE_NUMBER_ID env var."
            }), 400
        
        service = WhatsAppService(get_db(), phone_number_id, g.access_token)
        result = service.send_template_with_builder(
            to=to,
            template_name=template_name,
            language_code=language,
            header_image_url=header_image_url,
            body_params=body_params,
            button_url_suffix=button_url_suffix,
        )
        
        return jsonify(result), 200 if result.get("success") else 400
        
    except Exception as exc:
        logger.exception(f"send_template_advanced exception: {exc}")
        return jsonify({"success": False, "error": str(exc)}), 500


@whatsapp_bp.route("/send/media", methods=["POST"])
@require_token
def send_media():
    """
    Send a media message (image, video, audio, document).
    
    POST /api/whatsapp/send/media
    
    Request body:
    {
        "to": "919876543210",
        "media_type": "image",
        "media_url": "https://example.com/image.jpg",
        "caption": "Optional caption"
    }
    """
    try:
        data = request.get_json(silent=True) or {}
        
        # Validate
        to, media_type, url, media_id, caption = validate_media_message(data)
        
        phone_number_id = get_phone_number_id()
        if not phone_number_id:
            return jsonify({
                "success": False,
                "error": "phone_number_id required. Set WHATSAPP_PHONE_NUMBER_ID env var."
            }), 400
        
        # Send
        service = WhatsAppService(get_db(), phone_number_id, g.access_token)
        
        if media_type == "image":
            result = service.send_image(to=to, image_url=url, image_id=media_id, caption=caption)
        elif media_type == "video":
            result = service.send_video(to=to, video_url=url, video_id=media_id, caption=caption)
        elif media_type == "audio":
            result = service.send_audio(to=to, audio_url=url, audio_id=media_id)
        elif media_type == "document":
            filename = data.get("filename") or data.get("media", {}).get("filename")
            result = service.send_document(to=to, document_url=url, document_id=media_id, caption=caption, filename=filename)
        else:
            return jsonify({"success": False, "error": f"Unsupported media type: {media_type}"}), 400
        
        return jsonify(result), 200 if result.get("success") else 400
        
    except ValidationError as e:
        return handle_validation_error(e)
    except Exception as exc:
        logger.exception(f"send_media exception: {exc}")
        return jsonify({"success": False, "error": str(exc)}), 500


@whatsapp_bp.route("/send/interactive", methods=["POST"])
@require_token
def send_interactive():
    """
    Send an interactive message (buttons or list).
    
    POST /api/whatsapp/send/interactive
    
    Request body (buttons):
    {
        "to": "919876543210",
        "interactive": {
            "type": "button",
            "body": "Choose an option",
            "buttons": [
                {"id": "btn1", "title": "Option 1"},
                {"id": "btn2", "title": "Option 2"}
            ]
        }
    }
    
    Request body (list):
    {
        "to": "919876543210",
        "interactive": {
            "type": "list",
            "body": "Choose from menu",
            "button": "View Options",
            "sections": [
                {
                    "title": "Section 1",
                    "rows": [
                        {"id": "row1", "title": "Item 1", "description": "Description"}
                    ]
                }
            ]
        }
    }
    """
    try:
        data = request.get_json(silent=True) or {}
        
        phone_number_id = get_phone_number_id()
        if not phone_number_id:
            return jsonify({
                "success": False,
                "error": "phone_number_id required. Set WHATSAPP_PHONE_NUMBER_ID env var."
            }), 400
        
        service = WhatsAppService(get_db(), phone_number_id, g.access_token)
        
        # Determine interactive type
        interactive = data.get("interactive", {})
        int_type = interactive.get("type", data.get("type", "button"))
        
        if int_type == "button":
            to, body_text, buttons, header, footer = validate_interactive_buttons(data)
            result = service.send_interactive_buttons(
                to=to,
                body_text=body_text,
                buttons=buttons,
                header_text=header,
                footer_text=footer,
            )
        elif int_type == "list":
            to, body_text, button_text, sections, header, footer = validate_interactive_list(data)
            result = service.send_interactive_list(
                to=to,
                body_text=body_text,
                button_text=button_text,
                sections=sections,
                header_text=header,
                footer_text=footer,
            )
        else:
            return jsonify({
                "success": False,
                "error": f"Unknown interactive type: {int_type}. Supported: button, list"
            }), 400
        
        return jsonify(result), 200 if result.get("success") else 400
        
    except ValidationError as e:
        return handle_validation_error(e)
    except Exception as exc:
        logger.exception(f"send_interactive exception: {exc}")
        return jsonify({"success": False, "error": str(exc)}), 500


@whatsapp_bp.route("/send", methods=["POST"])
@require_token
def send_message():
    """
    Send any type of WhatsApp message.
    
    POST /api/whatsapp/send
    
    Request body:
    {
        "to": "919876543210",
        "type": "text",  // text, template, image, video, document, interactive
        ...type-specific fields
    }
    """
    try:
        data = request.get_json(silent=True) or {}
        
        if not data:
            return jsonify({"success": False, "error": "Request body required"}), 400
        
        msg_type = data.get("type", "text")
        
        # Route to appropriate handler based on type
        phone_number_id = get_phone_number_id()
        if not phone_number_id:
            return jsonify({
                "success": False,
                "error": "phone_number_id required. Set WHATSAPP_PHONE_NUMBER_ID env var."
            }), 400
        
        service = WhatsAppService(get_db(), phone_number_id, g.access_token)
        
        if msg_type == "text":
            to, text = validate_text_message(data)
            result = service.send_text(to=to, text=text, preview_url=data.get("preview_url", False))
            
        elif msg_type == "template":
            to, template_name, language, components = validate_template_message(data)
            result = service.send_template(to=to, template_name=template_name, language_code=language, components=components)
            
        elif msg_type in ("image", "video", "audio", "document"):
            to, media_type, url, media_id, caption = validate_media_message(data)
            if msg_type == "image":
                result = service.send_image(to=to, image_url=url, image_id=media_id, caption=caption)
            elif msg_type == "video":
                result = service.send_video(to=to, video_url=url, video_id=media_id, caption=caption)
            elif msg_type == "audio":
                result = service.send_audio(to=to, audio_url=url, audio_id=media_id)
            elif msg_type == "document":
                filename = data.get("filename") or data.get("media", {}).get("filename")
                result = service.send_document(to=to, document_url=url, document_id=media_id, caption=caption, filename=filename)
                
        elif msg_type == "interactive":
            interactive = data.get("interactive", {})
            int_type = interactive.get("type", "button")
            
            if int_type == "button":
                to, body_text, buttons, header, footer = validate_interactive_buttons(data)
                result = service.send_interactive_buttons(to=to, body_text=body_text, buttons=buttons, header_text=header, footer_text=footer)
            else:
                to, body_text, button_text, sections, header, footer = validate_interactive_list(data)
                result = service.send_interactive_list(to=to, body_text=body_text, button_text=button_text, sections=sections, header_text=header, footer_text=footer)
        else:
            return jsonify({
                "success": False,
                "error": f"Unknown message type: {msg_type}. Supported: text, template, image, video, audio, document, interactive"
            }), 400
        
        return jsonify(result), 200 if result.get("success") else 400
            
    except ValidationError as e:
        return handle_validation_error(e)
    except Exception as exc:
        logger.exception(f"send_message exception: {exc}")
        return jsonify({"success": False, "error": str(exc)}), 500


# ============================================================
# Conversation Endpoints
# ============================================================

@whatsapp_bp.route("/conversations", methods=["GET"])
def list_conversations():
    """
    List all conversations.
    
    GET /api/whatsapp/conversations
    GET /api/whatsapp/conversations?phone_number_id=xxx&limit=50&offset=0&status=open
    """
    phone_number_id = request.args.get("phone_number_id")
    status = request.args.get("status")
    limit = min(int(request.args.get("limit", 50)), 100)
    offset = int(request.args.get("offset", 0))
    
    service = ConversationService(get_db())
    conversations = service.get_conversations(
        phone_number_id=phone_number_id,
        status=status,
        limit=limit,
        offset=offset,
    )
    
    return jsonify({
        "success": True,
        "conversations": conversations,
        "count": len(conversations),
        "limit": limit,
        "offset": offset,
    })


@whatsapp_bp.route("/conversations/<int:conversation_id>", methods=["GET"])
def get_conversation(conversation_id: int):
    """
    Get a single conversation with recent messages.
    
    GET /api/whatsapp/conversations/<id>
    GET /api/whatsapp/conversations/<id>?message_limit=100
    """
    message_limit = min(int(request.args.get("message_limit", 50)), 200)
    
    service = ConversationService(get_db())
    conversation = service.get_conversation(
        conversation_id,
        include_messages=True,
        message_limit=message_limit,
    )
    
    if not conversation:
        return jsonify({
            "success": False,
            "error": "Conversation not found"
        }), 404
    
    return jsonify({
        "success": True,
        "conversation": conversation,
    })


@whatsapp_bp.route("/conversations/<int:conversation_id>/messages", methods=["GET"])
def get_messages(conversation_id: int):
    """
    Get messages for a conversation.
    
    GET /api/whatsapp/conversations/<id>/messages
    GET /api/whatsapp/conversations/<id>/messages?limit=100&before_id=xxx
    """
    limit = min(int(request.args.get("limit", 100)), 200)
    before_id = request.args.get("before_id")
    if before_id:
        before_id = int(before_id)
    
    service = ConversationService(get_db())
    messages = service.get_messages(
        conversation_id=conversation_id,
        limit=limit,
        before_id=before_id,
    )
    
    return jsonify({
        "success": True,
        "messages": messages,
        "count": len(messages),
    })


@whatsapp_bp.route("/conversations/<int:conversation_id>/read", methods=["POST"])
def mark_read(conversation_id: int):
    """
    Mark a conversation as read.
    
    POST /api/whatsapp/conversations/<id>/read
    """
    service = ConversationService(get_db())
    success = service.mark_conversation_read(conversation_id)
    
    if success:
        return jsonify({"success": True})
    else:
        return jsonify({"success": False, "error": "Conversation not found"}), 404


# ============================================================
# Webhook Logs Endpoint
# ============================================================

@whatsapp_bp.route("/webhook-logs", methods=["GET"])
def list_webhook_logs():
    """
    List recent webhook logs for debugging.
    
    GET /api/whatsapp/webhook-logs
    GET /api/whatsapp/webhook-logs?limit=50&event_type=message
    """
    from .models import WhatsAppWebhookLog
    
    limit = min(int(request.args.get("limit", 50)), 100)
    event_type = request.args.get("event_type")
    
    query = WhatsAppWebhookLog.query
    
    if event_type:
        query = query.filter_by(event_type=event_type)
    
    logs = query.order_by(
        WhatsAppWebhookLog.received_at.desc()
    ).limit(limit).all()
    
    return jsonify({
        "success": True,
        "logs": [log.to_dict() for log in logs],
        "count": len(logs),
    })


# ============================================================
# Health Check
# ============================================================

@whatsapp_bp.route("/health", methods=["GET"])
def health_check():
    """
    Health check endpoint.
    
    GET /api/whatsapp/health
    """
    try:
        token_configured = bool(os.getenv("WHATSAPP_ACCESS_TOKEN") or os.getenv("WHATSAPP_TEMP_TOKEN"))
        phone_configured = bool(os.getenv("WHATSAPP_PHONE_NUMBER_ID"))
        verify_configured = bool(os.getenv("WHATSAPP_VERIFY_TOKEN"))
        
        # Test DB connection
        from .models import WhatsAppAccount
        account_count = WhatsAppAccount.query.count()
        db_ok = True
        
    except Exception as e:
        logger.exception(f"Health check DB error: {e}")
        db_ok = False
        account_count = 0
    
    return jsonify({
        "status": "ok" if (token_configured and phone_configured) else "degraded",
        "module": "whatsapp-phase1",
        "version": "1.0.0",
        "config": {
            "access_token_set": token_configured,
            "phone_number_id_set": phone_configured,
            "verify_token_set": verify_configured,
            "api_version": os.getenv("WHATSAPP_API_VERSION", "v22.0"),
        },
        "database": {
            "connected": db_ok,
            "accounts": account_count,
        },
    })


# ============================================================
# Account Info (optional - for debugging)
# ============================================================

@whatsapp_bp.route("/accounts", methods=["GET"])
def list_accounts():
    """
    List configured WhatsApp accounts for current workspace.
    
    GET /api/whatsapp/accounts?workspace_id=xxx
    
    Returns accounts without access tokens (security).
    """
    from .models import WhatsAppAccount
    
    workspace_id = request.args.get("workspace_id")
    
    query = WhatsAppAccount.query
    if workspace_id:
        query = query.filter_by(workspace_id=workspace_id)
    
    accounts = query.order_by(WhatsAppAccount.created_at.desc()).all()
    
    return jsonify({
        "success": True,
        "accounts": [a.to_dict(include_token=False) for a in accounts],  # Never expose tokens
        "count": len(accounts),
    })


# ============================================================
# Phase-2 Part-1: Meta OAuth Integration
# ============================================================

@whatsapp_bp.route("/connect/start", methods=["GET"])
def connect_start():
    """
    Start Meta OAuth flow for WhatsApp Business Account.
    
    GET /api/whatsapp/connect/start?workspace_id=xxx
    
    Returns OAuth URL for Embedded Signup.
    """
    from .oauth import get_oauth_url
    
    workspace_id = request.args.get("workspace_id")
    user_id = session.get("user_id")
    
    if not workspace_id:
        return jsonify({
            "success": False,
            "error": "workspace_id required"
        }), 400
    
    if not user_id:
        return jsonify({
            "success": False,
            "error": "Authentication required"
        }), 401
    
    try:
        oauth_data = get_oauth_url(str(workspace_id), str(user_id))
        return jsonify({
            "success": True,
            "auth_url": oauth_data["auth_url"],
            "state": oauth_data["state"],
        })
    except Exception as e:
        logger.exception(f"OAuth start error: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@whatsapp_bp.route("/connect/callback", methods=["GET"])
def connect_callback():
    """
    Handle Meta OAuth callback.
    
    GET /api/whatsapp/connect/callback?code=xxx&state=xxx
    
    Exchanges code for token and saves account.
    """
    from .oauth import exchange_code_for_token, fetch_waba_info, save_whatsapp_account
    
    code = request.args.get("code")
    state = request.args.get("state")
    error = request.args.get("error")
    
    if error:
        error_description = request.args.get("error_description", "OAuth error")
        logger.warning(f"OAuth error: {error} - {error_description}")
        return f"<html><body><h1>Connection Failed</h1><p>{error_description}</p><p>You can close this window.</p></body></html>", 400
    
    if not code or not state:
        return "<html><body><h1>Invalid Request</h1><p>Missing code or state parameter.</p></body></html>", 400
    
    try:
        # Exchange code for token
        token_data = exchange_code_for_token(code, state)
        
        # Fetch WABA information
        waba_info = fetch_waba_info(token_data["access_token"])
        
        # Save account
        account = save_whatsapp_account(
            workspace_id=token_data["workspace_id"],
            user_id=token_data["user_id"],
            access_token=token_data["access_token"],
            token_expires_at=token_data.get("expires_at"),
            waba_info=waba_info,
        )
        
        # Clean up session
        session.pop(f"wa_oauth_state_{token_data['workspace_id']}", None)
        session.pop(f"wa_oauth_workspace_{state}", None)
        session.pop(f"wa_oauth_user_{state}", None)
        
        # Redirect to success page (frontend will handle)
        frontend_url = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
        redirect_url = f"{frontend_url}/dashboard/whatsapp/settings?connected=true"
        
        return f"""
        <html>
        <body>
            <h1>✅ WhatsApp Connected Successfully!</h1>
            <p>Your WhatsApp Business Account has been connected.</p>
            <p>You can close this window or <a href="{redirect_url}">return to settings</a>.</p>
            <script>
                setTimeout(function() {{
                    window.location.href = "{redirect_url}";
                }}, 2000);
            </script>
        </body>
        </html>
        """, 200
        
    except Exception as e:
        logger.exception(f"OAuth callback error: {e}")
        return f"""
        <html>
        <body>
            <h1>❌ Connection Failed</h1>
            <p>Error: {str(e)}</p>
            <p>Please try again or contact support.</p>
        </body>
        </html>
        """, 500
