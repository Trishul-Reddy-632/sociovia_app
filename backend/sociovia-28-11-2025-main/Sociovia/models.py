# models.py
from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase

# Base + db — keep your existing pattern
class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

# association table: social_account <-> ad_account (minimal, non-destructive)
page_adaccount = db.Table(
    'page_adaccount',
    db.Column('social_account_id', db.Integer, db.ForeignKey('social_accounts.id', ondelete='CASCADE'), primary_key=True),
    db.Column('ad_account_id', db.Integer, db.ForeignKey('ad_accounts.id', ondelete='CASCADE'), primary_key=True),
    db.Column('attached_at', db.DateTime, default=datetime.utcnow),
    db.Column('source', db.String(64), nullable=True),
)

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(30))

    business_name = db.Column(db.String(255))
    industry = db.Column(db.String(120))

    password_hash = db.Column(db.String(256), nullable=False)

    email_verified = db.Column(db.Boolean, default=False)
    status = db.Column(db.String(32), default="pending_verification")

    # ✅ BETA by default
    plan = db.Column(
        db.String(32),
        nullable=False,
        default="beta",
        index=True
    )
    # beta | starter | growth | enterprise

    verification_code_hash = db.Column(db.String(256))
    verification_expires_at = db.Column(db.DateTime)

    phone_otp_hash = db.Column(db.String(512))
    phone_otp_expires_at = db.Column(db.DateTime)
    phone_last_sent_at = db.Column(db.DateTime)
    phone_verified = db.Column(db.Boolean, default=False)

    rejection_reason = db.Column(db.Text)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# --- Admin model ---
class Admin(db.Model):
    __tablename__ = "admins"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    is_superadmin = db.Column(db.Boolean, default=False)

    def __repr__(self):
        return f'<Admin {self.email}>'


# --- Audit log ---
class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    actor = db.Column(db.String(255))
    action = db.Column(db.String(64))
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    meta = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<AuditLog {self.action} by {self.actor}>'


# --- Workspace ---
class Workspace(db.Model):
    __tablename__ = "workspaces2"
    __table_args__ = {"extend_existing": True}

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    business_name = db.Column(db.String(255), nullable=True)
    business_type = db.Column(db.String(100), nullable=True)
    registered_address = db.Column(db.String(500), nullable=True)
    # Structured address fields
    address_line = db.Column(db.String(500), nullable=True)
    city = db.Column(db.String(100), nullable=True)
    district = db.Column(db.String(100), nullable=True)
    pin_code = db.Column(db.String(20), nullable=True)
    country = db.Column(db.String(100), nullable=True, default='India')
    b2b_b2c = db.Column(db.String(20), nullable=True)
    industry = db.Column(db.String(255), nullable=True)
    description = db.Column(db.Text, nullable=True)
    audience_description = db.Column(db.Text, nullable=True)
    website = db.Column(db.String(255), nullable=True)
    competitor_direct_1 = db.Column(db.String(255), nullable=True)
    competitor_direct_2 = db.Column(db.String(255), nullable=True)
    competitor_indirect_1 = db.Column(db.String(255), nullable=True)
    competitor_indirect_2 = db.Column(db.String(255), nullable=True)
    social_links = db.Column(db.Text, nullable=True)
    usp = db.Column(db.Text, nullable=True)
    logo_path = db.Column(db.String(500), nullable=True)
    creatives_path = db.Column(db.String(500), nullable=True)
    remarks = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = db.relationship("User", backref="workspaces2")


# --- SocialAccount (page) ---
class SocialAccount(db.Model):
    __tablename__ = "social_accounts"
    __table_args__ = {"extend_existing": True}

    id = db.Column(db.Integer, primary_key=True)
    provider = db.Column(db.String(50), nullable=False)
    provider_user_id = db.Column(db.String(255), nullable=False, index=True)
    account_name = db.Column(db.String(255), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    access_token = db.Column(db.Text, nullable=True)
    token_expires_at = db.Column(db.DateTime, nullable=True)
    profile = db.Column(db.JSON, nullable=True)
    scopes = db.Column(db.String(1024), nullable=True)
    instagram_business_id = db.Column(db.String(255), nullable=True)
    ad_account_id = db.Column(db.String(64), nullable=True, index=True)   # legacy scalar (kept)
    created_at = db.Column(db.DateTime, default=db.func.now())
    updated_at = db.Column(db.DateTime, default=db.func.now(), onupdate=db.func.now())
    workspace_id = db.Column(db.Integer, nullable=True, index=True)

    # new many-to-many relationship (minimal)
    ad_accounts = db.relationship("AdAccount", secondary=page_adaccount, back_populates="pages", lazy="dynamic")

    def serialize(self):
        # include ad account ids from relationship (non-destructive)
        try:
            ad_account_ids = [a.account_id for a in self.ad_accounts] if self.ad_accounts is not None else []
        except Exception:
            # fallback if lazy/dynamic relationship not loaded
            ad_account_ids = []
        return {
            "id": self.id,
            "provider": self.provider,
            "provider_user_id": self.provider_user_id,
            "account_name": self.account_name,
            "user_id": self.user_id,
            "access_token": self.access_token,
            "token_expires_at": self.token_expires_at.isoformat() if self.token_expires_at else None,
            "profile": self.profile,
            "scopes": self.scopes,
            "instagram_business_id": self.instagram_business_id,
            "ad_account_id": self.ad_account_id,     # legacy scalar (kept)
            "ad_account_ids": ad_account_ids,        # many-to-many results
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# --- AIUsage ---
class AIUsage(db.Model):
    __tablename__ = "ai_usage"

    id = db.Column(db.BigInteger, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey("workspaces2.id"), nullable=True, index=True)

    feature = db.Column(db.String(100), nullable=False)
    route_path = db.Column(db.String(255), nullable=True)
    model = db.Column(db.String(100), nullable=False)

    input_tokens = db.Column(db.Integer, nullable=False, default=0)
    output_tokens = db.Column(db.Integer, nullable=False, default=0)
    total_tokens = db.Column(db.Integer, nullable=False, default=0)

    cost_inr = db.Column(db.Numeric(12, 4), nullable=False, default=0)
    request_id = db.Column(db.String(100), nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship("User", backref=db.backref("ai_usages", lazy="dynamic"))
    workspace = db.relationship("Workspace", backref=db.backref("ai_usages", lazy="dynamic"))

    def __repr__(self):
        return f"<AIUsage user={self.user_id} feature={self.feature} model={self.model} cost_inr={self.cost_inr}>"


# --- AssistantThread & AssistantMessage ---
class AssistantThread(db.Model):
    __tablename__ = "assistant_threads"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    workspace_id = db.Column(db.Integer, db.ForeignKey("workspaces2.id"), nullable=False)

    title = db.Column(db.String(255))
    summary = db.Column(db.Text)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    messages = db.relationship(
        "AssistantMessage",
        backref="thread",
        lazy=True,
        order_by="AssistantMessage.created_at",
        cascade="all, delete-orphan",
    )


class AssistantMessage(db.Model):
    __tablename__ = "assistant_messages"

    id = db.Column(db.Integer, primary_key=True)
    thread_id = db.Column(db.Integer, db.ForeignKey("assistant_threads.id"), nullable=False)
    role = db.Column(db.String(16), nullable=False)
    text = db.Column(db.Text, nullable=False)
    message_type = db.Column(db.String(32))
    data_json = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# --- AIUsageDailySummary ---
class AIUsageDailySummary(db.Model):
    __tablename__ = "ai_usage_daily_summary"

    id = db.Column(db.BigInteger, primary_key=True)
    day = db.Column(db.Date, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey("workspaces2.id"), nullable=True, index=True)
    feature = db.Column(db.String(100), nullable=False)

    total_calls = db.Column(db.Integer, nullable=False, default=0)
    total_input_tokens = db.Column(db.BigInteger, nullable=False, default=0)
    total_output_tokens = db.Column(db.BigInteger, nullable=False, default=0)
    total_tokens = db.Column(db.BigInteger, nullable=False, default=0)
    total_cost_inr = db.Column(db.Numeric(14, 4), nullable=False, default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship("User", backref=db.backref("ai_usage_daily", lazy="dynamic"))
    workspace = db.relationship("Workspace", backref=db.backref("ai_usage_daily", lazy="dynamic"))

    __table_args__ = (
        db.UniqueConstraint("day", "user_id", "workspace_id", "feature", name="uq_ai_usage_daily_user_ws_feature_day"),
    )

    def __repr__(self):
        return f"<AIUsageDailySummary day={self.day} user={self.user_id} feature={self.feature} cost={self.total_cost_inr}>"


# --- Workflow & WorkflowRun ---
from sqlalchemy.dialects.postgresql import JSONB

class Workflow(db.Model):
    __tablename__ = "workflows"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    workspace_id = db.Column(db.Integer, db.ForeignKey("workspaces2.id"), nullable=False)

    name = db.Column(db.String(255), nullable=False)
    template_id = db.Column(db.String(100), nullable=True)
    json = db.Column(JSONB, nullable=False)
    schedule_cron = db.Column(db.String(64), nullable=True)
    is_active = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    runs = db.relationship("WorkflowRun", backref="workflow", lazy=True)


class WorkflowRun(db.Model):
    __tablename__ = "workflow_runs"

    id = db.Column(db.Integer, primary_key=True)
    workflow_id = db.Column(db.Integer, db.ForeignKey("workflows.id"), nullable=False)

    started_at = db.Column(db.DateTime, nullable=False)
    finished_at = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(50), default="success")

    report_json = db.Column(JSONB, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class AdAccount(db.Model):
    __tablename__ = "ad_accounts"

    id = db.Column(db.Integer, primary_key=True)

    account_id = db.Column(db.String(128), nullable=False, index=True)
    workspace_id = db.Column(db.String(64), nullable=False, index=True)

    name = db.Column(db.String(255), nullable=True)
    business_id = db.Column(db.String(128), nullable=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    access_token = db.Column(db.Text, nullable=True)
    token_expires_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, default=db.func.now())
    updated_at = db.Column(db.DateTime, default=db.func.now(), onupdate=db.func.now())

    pages = db.relationship(
        "SocialAccount",
        secondary=page_adaccount,
        back_populates="ad_accounts",
        lazy="dynamic",
    )

    __table_args__ = (
        db.UniqueConstraint("account_id", "workspace_id", name="uq_account_workspace"),
    )

    def serialize(self):
        return {
            "id": self.id,
            "account_id": self.account_id,
            "workspace_id": self.workspace_id,
            "name": self.name,
            "business_id": self.business_id,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# --- small helper for attaching an ad_account to a page (idempotent) ---
def attach_ad_to_page(db_session, social_account_id: int, ad_account_account_id: str, source: str = "app"):
    """
    Create AdAccount row if missing, then insert into page_adaccount mapping (idempotent).
    db_session: SQLAlchemy session (e.g. db.session)
    social_account_id: social_accounts.id
    ad_account_account_id: ad_accounts.account_id (string like 'act_1234')
    """
    # try find ad account
    aa = db_session.query(AdAccount).filter_by(account_id=str(ad_account_account_id)).first()
    if not aa:
        aa = AdAccount(account_id=str(ad_account_account_id), created_at=datetime.utcnow(), updated_at=datetime.utcnow())
        db_session.add(aa)
        db_session.flush()

    # idempotent insert using raw SQL ON CONFLICT DO NOTHING
    db_session.execute(
        "INSERT INTO page_adaccount (social_account_id, ad_account_id, attached_at, source) "
        "VALUES (:said, :aaid, NOW(), :src) ON CONFLICT (social_account_id, ad_account_id) DO NOTHING",
        {"said": int(social_account_id), "aaid": int(aa.id), "src": source}
    )
    db_session.commit()


