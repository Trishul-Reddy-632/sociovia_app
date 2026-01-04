from datetime import datetime, timezone
from models import db
from sqlalchemy import func

class WhatsAppDripCampaign(db.Model):
    """
    Drip Campaign Metadata.
    """
    __tablename__ = "whatsapp_drip_campaigns"
    
    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.String(255), nullable=False, index=True)
    account_id = db.Column(db.Integer, db.ForeignKey("whatsapp_accounts.id"), nullable=False, index=True)
    
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    
    # Trigger conditions
    trigger_type = db.Column(db.String(50), default="manual") # manual, new_subscriber, tag_added
    trigger_value = db.Column(db.String(255)) # e.g. tag name
    
    status = db.Column(db.String(20), default="draft") # draft, active, paused
    
    # Stats
    enrolled_count = db.Column(db.Integer, default=0)
    completed_count = db.Column(db.Integer, default=0)
    
    created_at = db.Column(db.DateTime(timezone=True), default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())
    
    steps = db.relationship("WhatsAppDripStep", backref="campaign", cascade="all, delete-orphan", order_by="WhatsAppDripStep.step_order")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "trigger_type": self.trigger_type,
            "status": self.status,
            "enrolled_count": self.enrolled_count,
            "completed_count": self.completed_count,
            "steps": [s.to_dict() for s in self.steps],
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class WhatsAppDripStep(db.Model):
    """
    Step in a Drip Campaign.
    """
    __tablename__ = "whatsapp_drip_steps"
    
    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey("whatsapp_drip_campaigns.id"), nullable=False)
    
    step_order = db.Column(db.Integer, nullable=False) # 1, 2, 3...
    
    # Delay before this step (from previous step or start)
    delay_seconds = db.Column(db.Integer, default=0)
    
    # Message to send
    template_name = db.Column(db.String(255), nullable=False)
    language = db.Column(db.String(10), default="en_US")
    
    created_at = db.Column(db.DateTime(timezone=True), default=func.now())
    
    def to_dict(self):
        return {
            "id": self.id,
            "step_order": self.step_order,
            "delay_seconds": self.delay_seconds,
            "template_name": self.template_name,
            "language": self.language
        }

class WhatsAppDripEnrollment(db.Model):
    """
    Tracks a user's progress through a drip campaign.
    """
    __tablename__ = "whatsapp_drip_enrollments"
    
    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey("whatsapp_drip_campaigns.id"), nullable=False)
    
    phone_number = db.Column(db.String(50), nullable=False) # The user
    
    current_step_order = db.Column(db.Integer, default=0) # 0 = just started, waiting for step 1
    next_run_at = db.Column(db.DateTime(timezone=True)) # When to run the next step
    
    status = db.Column(db.String(20), default="active") # active, completed, failed, paused
    
    created_at = db.Column(db.DateTime(timezone=True), default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())
