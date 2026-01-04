# crm_management/routes/webhook.py
from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
from typing import Optional, Tuple, Dict, Any
import time
from collections import defaultdict

bp = Blueprint("webhook", __name__, url_prefix="/webhook")


RATE_LIMIT_BUCKET = defaultdict(list)
MAX_REQUESTS_PER_MIN = 60   # per workspace


def _rate_limit_check(workspace_id: str):
    """
    Simple in-memory sliding-window rate limit.
    60 requests per workspace per minute.
    """
    if not workspace_id:
        return True, None   

    now = time.time()
    cutoff = now - 60

    bucket = RATE_LIMIT_BUCKET[workspace_id]
    RATE_LIMIT_BUCKET[workspace_id] = [t for t in bucket if t > cutoff]

    if len(RATE_LIMIT_BUCKET[workspace_id]) >= MAX_REQUESTS_PER_MIN:
        return False, f"Rate limit exceeded: {MAX_REQUESTS_PER_MIN} requests/min"

    RATE_LIMIT_BUCKET[workspace_id].append(now)
    return True, None


# ------------------- SECURITY: API KEY CHECK -------------------
def _validate_api_key(workspace_id):
    Setting = current_app.crm_models["Setting"]
    if not workspace_id:
        return False, "Missing workspace_id"

    ws_key = request.headers.get("X-Webhook-Key")
    if not ws_key:
        return False, "Missing X-Webhook-Key"

    db = current_app.db
    rec = (
        db.session.query(Setting)
        .filter_by(workspace_id=workspace_id, name="webhook_api_key")
        .first()
    )
    if not rec:
        return False, "Workspace webhook API key not set"

    if rec.value != ws_key:
        return False, "Invalid webhook key"

    return True, None


# ------------------- HELPERS -------------------
def _get_workspace_id_from_request(payload: dict) -> Optional[str]:
    ws = payload.get("workspace_id") or request.headers.get("X-Workspace-ID")
    return str(ws) if ws else None


def _get_lead_and_activity_models():
    models = getattr(current_app, "crm_models", {}) or {}
    return models.get("Lead"), models.get("Activity")


def _now():
    return datetime.utcnow()


def _safe_str(v):
    return None if v is None else str(v)


# ------------------- UPSERT LOGIC -------------------
def _upsert_lead_from_provider(
    *,
    external_source: str,
    external_id: Optional[str],
    payload_fields: Dict[str, Any],
    workspace_id: Optional[str],
):
    db = current_app.db
    Lead, _ = _get_lead_and_activity_models()
    if Lead is None:
        return None, False, "Lead model missing"

    now = _now()
    existing = None

    # 1) Try external_id match
    if external_id and hasattr(Lead, "external_id"):
        try:
            q = db.session.query(Lead)
            if workspace_id:
                q = q.filter(Lead.workspace_id == workspace_id)
            existing = q.filter(
                Lead.external_source == external_source,
                Lead.external_id == str(external_id),
            ).one_or_none()
        except Exception:
            existing = None

    # 2) Fallback match by email / phone
    email = payload_fields.get("email")
    phone = payload_fields.get("phone")

    if existing is None and (email or phone):
        try:
            q = db.session.query(Lead)
            if workspace_id:
                q = q.filter(Lead.workspace_id == workspace_id)
            if email:
                existing = q.filter(Lead.email == email).first()
            if not existing and phone:
                existing = q.filter(Lead.phone == phone).first()
        except Exception:
            existing = None

    created = False

    # ---------- UPDATE ----------
    if existing:
        try:
            updated = False
            for f in ("name", "email", "phone", "company", "job_title", "source"):
                v = payload_fields.get(f)
                if v and getattr(existing, f, None) != v:
                    setattr(existing, f, v)
                    updated = True

            if hasattr(existing, "external_source"):
                existing.external_source = external_source

            if external_id and hasattr(existing, "external_id"):
                existing.external_id = str(external_id)

            if hasattr(existing, "sync_status"):
                existing.sync_status = "in_sync"

            if hasattr(existing, "last_sync_at"):
                existing.last_sync_at = now

            if updated:
                db.session.add(existing)
                db.session.commit()

            return existing, False, None
        except Exception as e:
            db.session.rollback()
            return None, False, "db_update_failed"

    # ---------- CREATE ----------
    try:
        create_kwargs = {
            "name": payload_fields.get("name") or payload_fields.get("email") or "Unknown",
            "email": email,
            "phone": phone,
            "company": payload_fields.get("company"),
            "job_title": payload_fields.get("job_title"),
            "source": payload_fields.get("source") or external_source,
            "status": "new",
            "workspace_id": workspace_id,
            "external_source": external_source,
            "external_id": external_id,
            "sync_status": "in_sync",
            "last_sync_at": now,
            "created_at": now,
            "updated_at": now,
        }

        lead_obj = Lead(**create_kwargs)
        db.session.add(lead_obj)
        db.session.commit()
        return lead_obj, True, None

    except Exception:
        db.session.rollback()
        return None, False, "db_create_failed"


# ------------------- ACTIVITY LOGGING -------------------
def _create_activity_for_lead(lead_obj, created, workspace_id, raw_payload):
    _, Activity = _get_lead_and_activity_models()
    if not Activity:
        return

    now = _now()
    try:
        a = Activity(
            entity_type="lead",
            entity_id=lead_obj.id,
            type="note_created" if created else "note_updated",
            title="Lead received" if created else "Lead updated",
            description=f"Payload={raw_payload}",
            timestamp=now,
            workspace_id=workspace_id,
        )
        db = current_app.db
        db.session.add(a)
        db.session.commit()
    except:
        db.session.rollback()


# ------------------- PROVIDER PARSERS -------------------
def _parse_meta_payload(payload):
    p = payload.get("lead") or {}
    return (
        _safe_str(
            p.get("id")
            or p.get("lead_id")
            or p.get("leadgen_id")
            or p.get("leadgen_id_string")
        ),
        {
            "name": p.get("name") or p.get("full_name"),
            "email": p.get("email"),
            "phone": p.get("phone"),
            "company": p.get("company"),
            "job_title": p.get("job_title"),
            "source": "Facebook Ad",
        },
    )


def _parse_zapier_payload(payload):
    d = payload.get("data") or payload.get("body") or payload
    return (
        _safe_str(d.get("id") or d.get("record_id")),
        {
            "name": d.get("name"),
            "email": d.get("email"),
            "phone": d.get("phone"),
            "company": d.get("company"),
            "job_title": d.get("job_title"),
            "source": "Zapier",
        },
    )


def _parse_sheets_payload(payload):
    row = payload.get("row") or payload
    return (
        _safe_str(row.get("id")),
        {
            "name": row.get("name"),
            "email": row.get("email"),
            "phone": row.get("phone"),
            "company": row.get("company"),
            "job_title": row.get("job_title"),
            "source": "Google Sheets",
        },
    )


def _parse_typeform_payload(payload):
    fr = payload.get("form_response") or {}
    return (
        _safe_str(fr.get("response_id") or fr.get("token")),
        {
            "name": payload.get("name"),
            "email": payload.get("email"),
            "phone": payload.get("phone"),
            "company": payload.get("company"),
            "job_title": payload.get("job_title"),
            "source": "Typeform",
        },
    )


def _parse_hubspot_payload(payload):
    props = payload.get("properties") or {}
    if "properties" in props:
        props = {k: v.get("value") for k, v in props["properties"].items()}

    return (
        _safe_str(payload.get("objectId")),
        {
            "name": props.get("firstname"),
            "email": props.get("email"),
            "phone": props.get("phone"),
            "company": props.get("company"),
            "job_title": props.get("jobtitle"),
            "source": "HubSpot",
        },
    )


def _parse_pipedrive_payload(payload):
    d = payload.get("current") or payload
    return (
        _safe_str(d.get("id")),
        {
            "name": d.get("person_name"),
            "email": d.get("person_email"),
            "phone": d.get("person_phone"),
            "company": d.get("org_name"),
            "job_title": d.get("job_title"),
            "source": "Pipedrive",
        },
    )


# ------------------- ROUTES -------------------
def _handle(provider, parser, payload):
    external_id, fields = parser(payload)
    workspace_id = _get_workspace_id_from_request(payload)

    # --- API KEY CHECK ---
    ok, err = _validate_api_key(workspace_id)
    if not ok:
        return jsonify({"ok": False, "reason": err}), 401

    # --- RATE LIMIT ---
    ok, reason = _rate_limit_check(workspace_id)
    if not ok:
        return jsonify({"ok": False, "reason": reason}), 429

    # --- UPSERT ---
    lead_obj, created, err = _upsert_lead_from_provider(
        external_source=provider,
        external_id=external_id,
        payload_fields=fields,
        workspace_id=workspace_id,
    )

    if err:
        return jsonify({"ok": False, "reason": err}), 500

    _create_activity_for_lead(lead_obj, created, workspace_id, payload)

    return jsonify(
        {"ok": True, "lead_id": lead_obj.id, "created": created}
    ), (201 if created else 200)


# Webhook Endpoints
@bp.route("/zapier", methods=["POST"])
def zapier():
    return _handle("zapier", _parse_zapier_payload, request.get_json() or {})


@bp.route("/meta-lead", methods=["POST"])
def meta_lead():
    return _handle("meta", _parse_meta_payload, request.get_json() or {})


@bp.route("/sheets", methods=["POST"])
def sheets():
    return _handle("sheets", _parse_sheets_payload, request.get_json() or {})


@bp.route("/typeform", methods=["POST"])
def typeform():
    return _handle("typeform", _parse_typeform_payload, request.get_json() or {})


@bp.route("/hubspot", methods=["POST"])
def hubspot():
    return _handle("hubspot", _parse_hubspot_payload, request.get_json() or {})


@bp.route("/pipedrive", methods=["POST"])
def pipedrive():
    return _handle("pipedrive", _parse_pipedrive_payload, request.get_json() or {})


# generic catch-all
@bp.route("/provider/<provider>", methods=["POST"])
def generic_provider(provider):
    return _handle(
        provider.lower(),
        lambda p: (None, {"name": p.get("name"), "email": p.get("email")}),
        request.get_json() or {},
    )
