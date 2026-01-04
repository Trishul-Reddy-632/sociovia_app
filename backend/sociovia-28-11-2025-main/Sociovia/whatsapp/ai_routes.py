"""
WhatsApp AI Routes
==================

API endpoints for AI chatbot configuration and testing.

Endpoints:
- GET /api/whatsapp/accounts/{id}/ai/config - Get AI configuration
- POST /api/whatsapp/accounts/{id}/ai/config - Update AI configuration  
- POST /api/whatsapp/accounts/{id}/ai/test - Test AI response
- POST /api/whatsapp/accounts/{id}/ai/enable - Enable AI chatbot
- POST /api/whatsapp/accounts/{id}/ai/disable - Disable AI chatbot
"""

import logging
from flask import Blueprint, jsonify, request
from functools import wraps

from models import db
from .automation_models import WhatsAppAutomationRule
from .models import WhatsAppAccount
from .ai_chatbot import generate_ai_response, DEFAULT_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

# Blueprint for AI routes
ai_bp = Blueprint('whatsapp_ai', __name__, url_prefix='/api/whatsapp/accounts')


# ============================================================
# Decorators
# ============================================================

def require_account_access(f):
    """
    Decorator to verify account access and inject account + workspace_id.
    
    Matches the pattern used in automation_routes.py.
    Expects `account_id` in the URL parameters.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        account_id = kwargs.get("account_id")
        
        if not account_id:
            return jsonify({"error": "Account ID required"}), 400
        
        # Get account
        account = WhatsAppAccount.query.get(account_id)
        
        if not account:
            return jsonify({"error": "Account not found"}), 404
        
        # Use workspace from account (same as automation_routes.py)
        workspace_id = account.workspace_id
        
        kwargs["account"] = account
        kwargs["workspace_id"] = workspace_id
        
        return f(*args, **kwargs)
    
    return decorated_function


# ============================================================
# AI Configuration Endpoints
# ============================================================

@ai_bp.route('/<int:account_id>/ai/config', methods=['GET'])
@require_account_access
def get_ai_config(account_id: int, account: WhatsAppAccount, workspace_id: str):
    """
    Get AI chatbot configuration for an account.
    
    Returns:
        AI configuration including enabled status, system prompt, etc.
    """
    try:
        # Find the AI_CHAT rule for this account
        ai_rule = WhatsAppAutomationRule.query.filter_by(
            workspace_id=workspace_id,
            account_id=account.id,
            rule_type="ai_chat"
        ).first()
        
        if not ai_rule:
            # Return default config if no AI rule exists
            return jsonify({
                "enabled": False,
                "system_prompt": DEFAULT_SYSTEM_PROMPT,
                "fallback_message": "I'm sorry, I couldn't process your request. A team member will assist you soon.",
                "max_tokens": 256,
                "temperature": 0.7,
                "context_messages": 5,
                "priority": 999,  # Low priority (AI is usually fallback)
            }), 200
        
        # Extract config from the rule
        response_config = ai_rule.response_config or {}
        
        return jsonify({
            "enabled": ai_rule.is_active,
            "rule_id": ai_rule.id,
            "system_prompt": response_config.get("system_prompt", DEFAULT_SYSTEM_PROMPT),
            "fallback_message": response_config.get("fallback_message", "I'm sorry, I couldn't process your request."),
            "max_tokens": response_config.get("max_tokens", 256),
            "temperature": response_config.get("temperature", 0.7),
            "context_messages": response_config.get("context_messages", 5),
            "priority": ai_rule.priority,
            "trigger_count": ai_rule.trigger_count,
            "last_triggered_at": ai_rule.last_triggered_at.isoformat() + "Z" if ai_rule.last_triggered_at else None,
        }), 200
        
    except Exception as e:
        logger.exception(f"Error getting AI config: {e}")
        return jsonify({"error": "Failed to get AI configuration"}), 500


@ai_bp.route('/<int:account_id>/ai/config', methods=['POST'])
@require_account_access
def update_ai_config(account_id: int, account: WhatsAppAccount, workspace_id: str):
    """
    Update AI chatbot configuration.
    
    Request body:
        {
            "enabled": true,
            "system_prompt": "...",
            "fallback_message": "...",
            "max_tokens": 256,
            "temperature": 0.7,
            "context_messages": 5
        }
    """
    try:
        data = request.get_json() or {}
        
        # Find or create AI rule
        ai_rule = WhatsAppAutomationRule.query.filter_by(
            workspace_id=workspace_id,
            account_id=account.id,
            rule_type="ai_chat"
        ).first()
        
        if not ai_rule:
            # Create new AI rule
            ai_rule = WhatsAppAutomationRule(
                workspace_id=workspace_id,
                account_id=account.id,
                name="AI Chatbot",
                description="AI-powered conversational responses using Gemini",
                rule_type="ai_chat",
                status="active",
                is_active=data.get("enabled", False),
                trigger_config={},  # AI_CHAT always matches
                response_type="ai",
                response_config={
                    "system_prompt": data.get("system_prompt", DEFAULT_SYSTEM_PROMPT),
                    "fallback_message": data.get("fallback_message", "I'm sorry, I couldn't process your request."),
                    "max_tokens": data.get("max_tokens", 256),
                    "temperature": data.get("temperature", 0.7),
                    "context_messages": data.get("context_messages", 5),
                },
                priority=999,  # Low priority - AI is fallback
                cooldown_seconds=0,
                max_triggers_per_day=0,
            )
            db.session.add(ai_rule)
            logger.info(f"Created AI chatbot rule for account {account.id}")
        else:
            # Update existing rule
            if "enabled" in data:
                ai_rule.is_active = data["enabled"]
                ai_rule.status = "active" if data["enabled"] else "paused"
            
            # Update response config
            response_config = ai_rule.response_config or {}
            
            if "system_prompt" in data:
                response_config["system_prompt"] = data["system_prompt"]
            if "fallback_message" in data:
                response_config["fallback_message"] = data["fallback_message"]
            if "max_tokens" in data:
                response_config["max_tokens"] = data["max_tokens"]
            if "temperature" in data:
                response_config["temperature"] = data["temperature"]
            if "context_messages" in data:
                response_config["context_messages"] = data["context_messages"]
            
            ai_rule.response_config = response_config
            
            logger.info(f"Updated AI chatbot config for account {account.id}")
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "AI configuration updated",
            "rule_id": ai_rule.id,
            "enabled": ai_rule.is_active,
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error updating AI config: {e}")
        return jsonify({"error": "Failed to update AI configuration"}), 500


@ai_bp.route('/<int:account_id>/ai/test', methods=['POST'])
@require_account_access
def test_ai_response(account_id: int, account: WhatsAppAccount, workspace_id: str):
    """
    Test AI response without sending to WhatsApp.
    
    Request body:
        {
            "message": "Hello, what services do you offer?",
            "context": [{"role": "user", "text": "..."}]  // Optional
        }
    """
    try:
        data = request.get_json() or {}
        message = data.get("message", "")
        context = data.get("context", [])
        
        if not message:
            return jsonify({"error": "Message is required"}), 400
        
        # Get AI config for this account
        ai_rule = WhatsAppAutomationRule.query.filter_by(
            workspace_id=workspace_id,
            account_id=account.id,
            rule_type="ai_chat"
        ).first()
        
        system_prompt = DEFAULT_SYSTEM_PROMPT
        fallback_message = "I'm sorry, I couldn't process your request."
        
        if ai_rule and ai_rule.response_config:
            system_prompt = ai_rule.response_config.get("system_prompt", system_prompt)
            fallback_message = ai_rule.response_config.get("fallback_message", fallback_message)
        
        # Generate test response
        result = generate_ai_response(
            message=message,
            system_prompt=system_prompt,
            context=context,
            fallback_message=fallback_message,
        )
        
        return jsonify({
            "success": result.success,
            "message": result.message,
            "tokens_used": result.tokens_used,
            "response_time_ms": result.response_time_ms,
            "error": result.error,
        }), 200
        
    except Exception as e:
        logger.exception(f"Error testing AI response: {e}")
        return jsonify({"error": "Failed to test AI response"}), 500


@ai_bp.route('/<int:account_id>/ai/enable', methods=['POST'])
@require_account_access
def enable_ai(account_id: int, account: WhatsAppAccount, workspace_id: str):
    """Quick endpoint to enable AI chatbot."""
    try:
        ai_rule = WhatsAppAutomationRule.query.filter_by(
            workspace_id=workspace_id,
            account_id=account.id,
            rule_type="ai_chat"
        ).first()
        
        if not ai_rule:
            # Create default AI rule
            ai_rule = WhatsAppAutomationRule(
                workspace_id=workspace_id,
                account_id=account.id,
                name="AI Chatbot",
                description="AI-powered conversational responses",
                rule_type="ai_chat",
                status="active",
                is_active=True,
                trigger_config={},
                response_type="ai",
                response_config={
                    "system_prompt": DEFAULT_SYSTEM_PROMPT,
                    "fallback_message": "I'm sorry, I couldn't process your request. A team member will assist you soon.",
                    "max_tokens": 256,
                    "temperature": 0.7,
                    "context_messages": 5,
                },
                priority=999,
            )
            db.session.add(ai_rule)
        else:
            ai_rule.is_active = True
            ai_rule.status = "active"
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "AI chatbot enabled",
            "rule_id": ai_rule.id,
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error enabling AI: {e}")
        return jsonify({"error": "Failed to enable AI"}), 500


@ai_bp.route('/<int:account_id>/ai/disable', methods=['POST'])
@require_account_access
def disable_ai(account_id: int, account: WhatsAppAccount, workspace_id: str):
    """Quick endpoint to disable AI chatbot."""
    try:
        ai_rule = WhatsAppAutomationRule.query.filter_by(
            workspace_id=workspace_id,
            account_id=account.id,
            rule_type="ai_chat"
        ).first()
        
        if ai_rule:
            ai_rule.is_active = False
            ai_rule.status = "paused"
            db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "AI chatbot disabled",
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error disabling AI: {e}")
        return jsonify({"error": "Failed to disable AI"}), 500


# ============================================================
# Intent Detection Endpoints
# ============================================================

@ai_bp.route('/<int:account_id>/ai/intent', methods=['POST'])
@require_account_access
def classify_message_intent(account_id: int, account: WhatsAppAccount, workspace_id: str):
    """
    Classify the intent of a message.
    
    Request body:
        {
            "message": "Hello, I need help with my order"
        }
    """
    try:
        from .ai_chatbot import classify_intent, INTENT_TYPES
        
        data = request.get_json() or {}
        message = data.get("message", "")
        
        if not message:
            return jsonify({"error": "Message is required"}), 400
        
        # Classify intent
        result = classify_intent(message)
        
        return jsonify({
            "success": result.success,
            "intent": result.intent,
            "confidence": result.confidence,
            "response_time_ms": result.response_time_ms,
            "available_intents": INTENT_TYPES,
            "error": result.error,
        }), 200
        
    except Exception as e:
        logger.exception(f"Error classifying intent: {e}")
        return jsonify({"error": "Failed to classify intent"}), 500


@ai_bp.route('/<int:account_id>/ai/intents', methods=['GET'])
@require_account_access
def get_available_intents(account_id: int, account: WhatsAppAccount, workspace_id: str):
    """Get list of available intent types."""
    from .ai_chatbot import INTENT_TYPES
    
    return jsonify({
        "success": True,
        "intents": [
            {"id": intent, "label": intent.replace("_", " ").title()}
            for intent in INTENT_TYPES
        ]
    })


# ============================================================
# Register Blueprint Helper
# ============================================================

def register_ai_routes(app):
    """Register AI routes with Flask app."""
    app.register_blueprint(ai_bp)
    logger.info("Registered WhatsApp AI routes")
