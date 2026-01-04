import logging
from datetime import datetime, timezone, timedelta
from models import db
from .models import WhatsAppAccount
from .drip_models import WhatsAppDripCampaign, WhatsAppDripStep, WhatsAppDripEnrollment
from .services import WhatsAppService

logger = logging.getLogger(__name__)

def process_drip_campaigns():
    """
    Main scheduler function to process due drip steps.
    Should be called every minute.
    """
    try:
        now = datetime.now(timezone.utc)
        
        # 1. Fetch due enrollments
        due_enrollments = WhatsAppDripEnrollment.query.filter(
            WhatsAppDripEnrollment.status == "active",
            WhatsAppDripEnrollment.next_run_at <= now
        ).limit(50).all() # Process in batches
        
        if not due_enrollments:
            return
            
        logger.info(f"Processing {len(due_enrollments)} drip enrollments...")
        
        for enrollment in due_enrollments:
            try:
                process_single_enrollment(enrollment)
            except Exception as e:
                logger.error(f"Failed to process enrollment {enrollment.id}: {e}")
                # Don't fail the whole batch
                
        db.session.commit()
        
    except Exception as e:
        logger.exception(f"Drip scheduler error: {e}")
        db.session.rollback()

def process_single_enrollment(enrollment: WhatsAppDripEnrollment):
    """
    Process a single enrollment: Send message and advance step.
    """
    campaign = WhatsAppDripCampaign.query.get(enrollment.campaign_id)
    if not campaign or campaign.status != "active":
        # Pause enrollment if campaign paused/deleted
        enrollment.status = "paused"
        return

    # Determine next step
    next_step_order = enrollment.current_step_order + 1
    
    step = WhatsAppDripStep.query.filter_by(
         campaign_id=enrollment.campaign_id,
         step_order=next_step_order
    ).first()
    
    if not step:
         # No more steps -> Complete
         enrollment.status = "completed"
         enrollment.next_run_at = None
         campaign.completed_count += 1
         return

    # Send Message
    account = WhatsAppAccount.query.get(campaign.account_id)
    if not account:
        logger.error(f"Account {campaign.account_id} not found for drip {campaign.id}")
        enrollment.status = "failed"
        return
        
    service = WhatsAppService(db.session, account.phone_number_id, account.get_access_token())
    
    # Send Template
    result = service.send_template(
        to=enrollment.phone_number,
        template_name=step.template_name,
        language_code=step.language
    )
    
    if result.get("success"):
        # Advance state
        enrollment.current_step_order = step.step_order
        
        # Calculate next run time based on NEXT step's delay
        next_next_step = WhatsAppDripStep.query.filter_by(
             campaign_id=enrollment.campaign_id,
             step_order=step.step_order + 1
        ).first()
        
        if next_next_step:
            enrollment.next_run_at = datetime.now(timezone.utc) + timedelta(seconds=next_next_step.delay_seconds)
        else:
            # Look ahead to see if there are even more steps (gaps in sequence?)
            # For now assume contiguous. If no next step, mark complete.
            enrollment.status = "completed"
            enrollment.next_run_at = None
            campaign.completed_count += 1
            
        # Log successful send (optional)
        logger.info(f"[Automation Source: DRIP CAMPAIGN] Campaign {campaign.id} Step {step.step_order} sent to {enrollment.phone_number}")
        
    else:
        logger.error(f"Drip send failed: {result}")
        # Retry logic? For now, leave next_run_at as is to retry (or bump it slightly?)
        # Let's bump it by 1 hour to avoid spam loop on failure
        enrollment.next_run_at = datetime.now(timezone.utc) + timedelta(hours=1)
