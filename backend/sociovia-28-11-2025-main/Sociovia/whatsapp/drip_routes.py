import logging
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify

from models import db
from .models import WhatsAppAccount
from .drip_models import WhatsAppDripCampaign, WhatsAppDripStep, WhatsAppDripEnrollment
from .flow_access import require_account_access

logger = logging.getLogger(__name__)

drip_bp = Blueprint("drip", __name__, url_prefix="/api/whatsapp")

# ============================================================
# Campaign Management
# ============================================================

@drip_bp.route("/accounts/<int:account_id>/drip-campaigns", methods=["GET"])
@require_account_access
def list_campaigns(account_id: int, account: WhatsAppAccount, workspace_id: str):
    """List all drip campaigns."""
    try:
        campaigns = WhatsAppDripCampaign.query.filter_by(
            account_id=account_id,
            workspace_id=workspace_id
        ).order_by(WhatsAppDripCampaign.created_at.desc()).all()
        
        return jsonify({
            "success": True,
            "campaigns": [c.to_dict() for c in campaigns]
        })
    except Exception as e:
        logger.exception(f"Error listing drip campaigns: {e}")
        return jsonify({"error": "Failed to list campaigns"}), 500

@drip_bp.route("/accounts/<int:account_id>/drip-campaigns", methods=["POST"])
@require_account_access
def create_campaign(account_id: int, account: WhatsAppAccount, workspace_id: str):
    """Create a new drip campaign with steps."""
    data = request.get_json() or {}
    
    name = data.get("name")
    if not name:
        return jsonify({"error": "Name is required"}), 400
        
    try:
        campaign = WhatsAppDripCampaign(
            workspace_id=workspace_id,
            account_id=account_id,
            name=name,
            description=data.get("description"),
            trigger_type=data.get("trigger_type", "manual"),
            status=data.get("status", "draft")
        )
        
        db.session.add(campaign)
        db.session.flush() # get ID
        
        # Add Steps
        steps_data = data.get("steps", [])
        for i, step_data in enumerate(steps_data):
            step = WhatsAppDripStep(
                campaign_id=campaign.id,
                step_order=i + 1,
                delay_seconds=step_data.get("delay_seconds", 0),
                template_name=step_data.get("template_name", ""),
                language=step_data.get("language", "en_US")
            )
            db.session.add(step)
            
        db.session.commit()
        
        return jsonify({
            "success": True,
            "campaign": campaign.to_dict(),
            "message": "Campaign created"
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error creating drip campaign: {e}")
        return jsonify({"error": str(e)}), 500

@drip_bp.route("/accounts/<int:account_id>/drip-campaigns/<int:campaign_id>/enroll", methods=["POST"])
@require_account_access
def enroll_user(account_id: int, campaign_id: int, account: WhatsAppAccount, workspace_id: str):
    """Manually enroll a user into a drip campaign."""
    data = request.get_json() or {}
    phone_number = data.get("phone_number")
    
    if not phone_number:
        return jsonify({"error": "Phone number is required"}), 400
        
    try:
        campaign = WhatsAppDripCampaign.query.get_or_404(campaign_id)
        
        # Check if already enrolled
        existing = WhatsAppDripEnrollment.query.filter_by(
            campaign_id=campaign_id,
            phone_number=phone_number,
            status="active"
        ).first()
        
        if existing:
            return jsonify({"error": "User already enrolled in this campaign"}), 400
            
        # Create enrollment
        # First step runs after its delay relative to NOW
        first_step = WhatsAppDripStep.query.filter_by(campaign_id=campaign_id, step_order=1).first()
        
        next_run = None
        if first_step:
            next_run = datetime.now(timezone.utc) + timedelta(seconds=first_step.delay_seconds)
            
        enrollment = WhatsAppDripEnrollment(
            campaign_id=campaign_id,
            phone_number=phone_number,
            current_step_order=0, # Not strictly on step 1 yet (waiting for step 1)
            next_run_at=next_run,
            status="active"
        )
        
        campaign.enrolled_count += 1
        db.session.add(enrollment)
        db.session.commit()
        
        return jsonify({
            "success": True, 
            "message": f"Enrolled {phone_number}",
            "next_run_at": next_run.isoformat() if next_run else None
        })
        
    except Exception as e:
        db.session.rollback()
        logger.exception(f"Error enrolling user: {e}")
        return jsonify({"error": str(e)}), 500
