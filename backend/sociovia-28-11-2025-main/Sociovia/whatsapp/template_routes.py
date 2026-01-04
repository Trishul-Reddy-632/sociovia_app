"""
Template Acceleration Routes
============================

API endpoints for the WhatsApp Template Approval Acceleration System.

Endpoints:
- POST /templates/validate   - Pre-submit validation + confidence score
- POST /templates/rewrite    - AI rewrite with explain-why
- POST /templates/create     - Submit to Meta with acceleration
- GET  /templates/<id>/status - Poll status with confidence drift
- GET  /templates/analytics   - Approval time analytics
"""

import logging
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from sqlalchemy import func

from models import db
from .models import WhatsAppTemplate, WhatsAppAccount
from .template_validator import validate_template, TemplateValidator, ApprovalPath
from .template_rewriter import rewrite_template, RewriteMode

logger = logging.getLogger(__name__)

# Blueprint for template routes
template_bp = Blueprint("template_routes", __name__, url_prefix="/api/whatsapp/templates")


# ==============================================================
# POST /templates/validate
# ==============================================================

@template_bp.route("/validate", methods=["POST"])
def validate_template_endpoint():
    """
    Pre-submit validation with confidence score.
    
    Request Body:
    {
        "body": "Your order {{1}} has shipped...",
        "category": "UTILITY",
        "header": "Order Update",
        "footer": "Thanks for shopping!",
        "buttons": [],
        "urls": [],
        "language": "en_US",
        "account_id": 12  # Optional - to check if new WABA
    }
    
    Response:
    {
        "confidence_score": 87,
        "risk_flags": ["CTA_IN_UTILITY"],
        "approval_path": "AUTOMATED_SLOW",
        "detected_intent": "UTILITY",
        "suggestions": ["Remove call-to-action verbs"],
        "show_fast_path_badge": false,
        "intent_mismatch": false,
        "intent_mismatch_message": null
    }
    """
    try:
        data = request.get_json() or {}
        
        body = data.get("body", "")
        category = data.get("category", "UTILITY")
        header = data.get("header")
        footer = data.get("footer")
        buttons = data.get("buttons", [])
        urls = data.get("urls", [])
        language = data.get("language", "en_US")
        account_id = data.get("account_id")
        
        # Check if new WABA (< 30 days old)
        is_new_waba = False
        if account_id:
            account = WhatsAppAccount.query.get(account_id)
            if account and account.created_at:
                days_old = (datetime.now(timezone.utc) - account.created_at).days
                is_new_waba = days_old < 30
        
        # Validate
        result = validate_template(
            body=body,
            category=category,
            header=header,
            footer=footer,
            buttons=buttons,
            urls=urls,
            language=language,
            is_new_waba=is_new_waba,
        )
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.exception("Template validation error")
        return jsonify({"error": str(e)}), 500


# ==============================================================
# POST /templates/rewrite
# ==============================================================

@template_bp.route("/rewrite", methods=["POST"])
def rewrite_template_endpoint():
    """
    AI rewrite with explain-why mode.
    
    Request Body:
    {
        "body": "Don't miss our HUGE sale! {{1}}",
        "target_category": "UTILITY",
        "mode": "neutral_utility",  # or "clear_marketing", "strict_authentication"
        "current_category": "MARKETING"  # Optional - for intent warnings
    }
    
    Response:
    {
        "rewritten_body": "Your order update: {{1}}",
        "changes_made": [
            "Removed promotional language ('HUGE sale')",
            "Neutralized tone for transactional use"
        ],
        "preserved_variables": ["{{1}}"],
        "intent_warning": null,
        "success": true,
        "error": null
    }
    """
    try:
        data = request.get_json() or {}
        
        body = data.get("body", "")
        target_category = data.get("target_category", "UTILITY")
        mode = data.get("mode", RewriteMode.NEUTRAL_UTILITY)
        current_category = data.get("current_category")
        
        if not body:
            return jsonify({"error": "Body is required"}), 400
        
        result = rewrite_template(
            body=body,
            target_category=target_category,
            mode=mode,
            current_category=current_category,
        )
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.exception("Template rewrite error")
        return jsonify({"error": str(e)}), 500


# ==============================================================
# POST /templates/create
# ==============================================================

@template_bp.route("/create", methods=["POST"])
def create_template_endpoint():
    """
    Submit template to Meta with acceleration tracking.
    
    - Validates before submission
    - Blocks if intent mismatch detected
    - Tracks submission time and confidence
    - Returns optimistic response immediately
    
    Request Body:
    {
        "account_id": 12,
        "name": "order_shipped",
        "category": "UTILITY",
        "language": "en_US",
        "components": [
            {"type": "BODY", "text": "Your order {{1}} has shipped!"}
        ]
    }
    
    Response:
    {
        "success": true,
        "template": {...},
        "validation": {...},
        "message": "Template submitted for approval"
    }
    """
    try:
        data = request.get_json() or {}
        
        account_id = data.get("account_id")
        name = data.get("name", "").strip()
        category = data.get("category", "UTILITY")
        language = data.get("language", "en_US")
        components = data.get("components", [])
        
        # Validate required fields
        if not account_id:
            return jsonify({"error": "account_id is required"}), 400
        if not name:
            return jsonify({"error": "name is required"}), 400
        if not components:
            return jsonify({"error": "components are required"}), 400
        
        # Get account
        account = WhatsAppAccount.query.get(account_id)
        if not account:
            return jsonify({"error": "Account not found"}), 404
        
        # Extract body for validation
        body = ""
        header = ""
        footer = ""
        buttons = []
        urls = []
        
        for comp in components:
            comp_type = comp.get("type", "").upper()
            if comp_type == "BODY":
                body = comp.get("text", "")
            elif comp_type == "HEADER":
                header = comp.get("text", "")
            elif comp_type == "FOOTER":
                footer = comp.get("text", "")
            elif comp_type == "BUTTONS":
                buttons = comp.get("buttons", [])
        
        # Pre-validate
        days_old = (datetime.now(timezone.utc) - account.created_at).days if account.created_at else 0
        is_new_waba = days_old < 30
        
        validator = TemplateValidator(is_new_waba=is_new_waba)
        validation = validator.validate(
            body=body,
            category=category,
            header=header,
            footer=footer,
            buttons=buttons,
            urls=urls,
            language=language,
        )
        
        # Block if intent mismatch
        if validation.intent_mismatch:
            return jsonify({
                "success": False,
                "error": "intent_mismatch",
                "message": validation.intent_mismatch_message,
                "validation": validation.to_dict(),
            }), 400
        
        # Block if confidence too low
        if validation.confidence_score < 60:
            return jsonify({
                "success": False,
                "error": "low_confidence",
                "message": "Template confidence too low. Please address the suggestions before submitting.",
                "validation": validation.to_dict(),
            }), 400
        
        # Create template record with tracking
        import re
        variables = re.findall(r'\{\{(\d+)\}\}', body)
        
        template = WhatsAppTemplate(
            account_id=account_id,
            name=name,
            category=category,
            language=language,
            status="PENDING",
            components=components,
            body_text=body,
            header_text=header or None,
            footer_text=footer or None,
            variable_count=len(variables),
            # Acceleration fields
            confidence_initial=validation.confidence_score,
            submitted_at=datetime.now(timezone.utc),
            validation_flags=validation.risk_flags,
            detected_intent=validation.detected_intent,
            approval_path=validation.approval_path,
        )
        
        db.session.add(template)
        db.session.commit()
        
        # TODO: Actually submit to Meta API here
        # For now, we create the record and let polling check status
        
        return jsonify({
            "success": True,
            "template": template.to_dict(),
            "validation": validation.to_dict(),
            "message": "Template submitted for approval",
            "show_fast_path_badge": validation.show_fast_path_badge,
        }), 201
        
    except Exception as e:
        logger.exception("Template creation error")
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ==============================================================
# GET /templates/<id>/status
# ==============================================================

@template_bp.route("/<int:template_id>/status", methods=["GET"])
def get_template_status(template_id):
    """
    Poll template status with confidence drift tracking.
    
    Response:
    {
        "status": "PENDING",
        "confidence_post_submit": 85,
        "approval_duration_seconds": null,
        "approval_path": "AUTOMATED_SLOW",
        "message": "Under automated review"
    }
    """
    try:
        template = WhatsAppTemplate.query.get(template_id)
        if not template:
            return jsonify({"error": "Template not found"}), 404
        
        # Calculate how long it's been pending
        pending_seconds = None
        if template.submitted_at and template.status == "PENDING":
            pending_seconds = (datetime.now(timezone.utc) - template.submitted_at).total_seconds()
        
        # Update confidence_post_submit if still pending
        if template.status == "PENDING" and pending_seconds:
            # Recalculate confidence based on pending duration
            if pending_seconds > 30 and template.confidence_initial:
                # Slightly lower confidence if taking longer than expected
                drift = min(15, int(pending_seconds / 30) * 5)
                template.confidence_post_submit = max(50, template.confidence_initial - drift)
                db.session.commit()
        
        # Build response message based on status and duration
        if template.status == "APPROVED":
            message = "Template approved! Ready to send."
        elif template.status == "REJECTED":
            message = f"Template rejected: {template.rejection_reason or 'Unknown reason'}"
        elif pending_seconds and pending_seconds > 60:
            message = "Meta is performing extended automated checks. This is normal for new or modified templates."
        elif pending_seconds and pending_seconds > 30:
            message = "Under automated review (usually completes shortly)"
        else:
            message = "Running automated approval checks..."
        
        return jsonify({
            "id": template.id,
            "status": template.status,
            "confidence_initial": template.confidence_initial,
            "confidence_post_submit": template.confidence_post_submit,
            "pending_seconds": int(pending_seconds) if pending_seconds else None,
            "approval_duration_seconds": template.approval_duration_seconds,
            "approval_path": template.approval_path,
            "approval_outcome_reason": template.approval_outcome_reason,
            "message": message,
            "submitted_at": template.submitted_at.isoformat() + "Z" if template.submitted_at else None,
            "approved_at": template.approved_at.isoformat() + "Z" if template.approved_at else None,
        }), 200
        
    except Exception as e:
        logger.exception("Template status error")
        return jsonify({"error": str(e)}), 500


# ==============================================================
# GET /templates/analytics
# ==============================================================

@template_bp.route("/analytics", methods=["GET"])
def get_template_analytics():
    """
    Approval time analytics for tuning validation rules.
    
    Query Params:
    - account_id (optional): Filter by account
    - days (optional): Days to look back (default 30)
    
    Response:
    {
        "total_templates": 50,
        "approval_rate": 0.92,
        "avg_approval_seconds": 45,
        "by_category": {...},
        "by_outcome_reason": {...},
        "fast_approvals": 35,
        "slow_approvals": 10
    }
    """
    try:
        account_id = request.args.get("account_id", type=int)
        days = request.args.get("days", 30, type=int)
        
        # Base query
        query = WhatsAppTemplate.query
        
        if account_id:
            query = query.filter_by(account_id=account_id)
        
        # Date filter
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        query = query.filter(WhatsAppTemplate.created_at >= cutoff)
        
        templates = query.all()
        
        if not templates:
            return jsonify({
                "total_templates": 0,
                "message": "No templates found in the specified period"
            }), 200
        
        # Calculate metrics
        total = len(templates)
        approved = [t for t in templates if t.status == "APPROVED"]
        rejected = [t for t in templates if t.status == "REJECTED"]
        pending = [t for t in templates if t.status == "PENDING"]
        
        approval_rate = len(approved) / total if total > 0 else 0
        
        # Average approval time
        approval_times = [t.approval_duration_seconds for t in approved if t.approval_duration_seconds]
        avg_approval_seconds = sum(approval_times) / len(approval_times) if approval_times else None
        
        # Fast vs slow approvals
        fast_approvals = len([t for t in approved if t.approval_duration_seconds and t.approval_duration_seconds <= 60])
        slow_approvals = len([t for t in approved if t.approval_duration_seconds and t.approval_duration_seconds > 120])
        
        # By category
        by_category = {}
        for cat in ["UTILITY", "MARKETING", "AUTHENTICATION"]:
            cat_templates = [t for t in templates if t.category == cat]
            cat_approved = [t for t in cat_templates if t.status == "APPROVED"]
            by_category[cat] = {
                "total": len(cat_templates),
                "approved": len(cat_approved),
                "approval_rate": len(cat_approved) / len(cat_templates) if cat_templates else 0,
            }
        
        # By outcome reason
        by_outcome_reason = {}
        for t in templates:
            reason = t.approval_outcome_reason or "UNKNOWN"
            if reason not in by_outcome_reason:
                by_outcome_reason[reason] = 0
            by_outcome_reason[reason] += 1
        
        # Median approval time
        median_approval_seconds = None
        if approval_times:
            sorted_times = sorted(approval_times)
            mid = len(sorted_times) // 2
            if len(sorted_times) % 2 == 0:
                median_approval_seconds = (sorted_times[mid - 1] + sorted_times[mid]) / 2
            else:
                median_approval_seconds = sorted_times[mid]
        
        # Percentile breakdown (sales gold)
        percentile_breakdown = {
            "under_10s": 0,
            "under_30s": 0,
            "under_2min": 0,
            "over_2min": 0,
        }
        for t in approved:
            if t.approval_duration_seconds:
                if t.approval_duration_seconds < 10:
                    percentile_breakdown["under_10s"] += 1
                elif t.approval_duration_seconds < 30:
                    percentile_breakdown["under_30s"] += 1
                elif t.approval_duration_seconds < 120:
                    percentile_breakdown["under_2min"] += 1
                else:
                    percentile_breakdown["over_2min"] += 1
        
        # Calculate percentages
        approved_count = len(approved)
        percentile_percent = {}
        for key, count in percentile_breakdown.items():
            percentile_percent[key] = round((count / approved_count * 100), 1) if approved_count > 0 else 0
        
        return jsonify({
            "total_templates": total,
            "approved": len(approved),
            "rejected": len(rejected),
            "pending": len(pending),
            "approval_rate": round(approval_rate, 2),
            "avg_approval_seconds": int(avg_approval_seconds) if avg_approval_seconds else None,
            "median_approval_seconds": int(median_approval_seconds) if median_approval_seconds else None,
            "fast_approvals": fast_approvals,
            "slow_approvals": slow_approvals,
            "percentile_breakdown": percentile_breakdown,
            "percentile_percent": percentile_percent,
            "by_category": by_category,
            "by_outcome_reason": by_outcome_reason,
        }), 200
        
    except Exception as e:
        logger.exception("Template analytics error")
        return jsonify({"error": str(e)}), 500


# Import timedelta for analytics
from datetime import timedelta
