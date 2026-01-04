"""Add WhatsApp CTWA tables

Revision ID: whatsapp_001
Revises: 
Create Date: 2024-12-01

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'whatsapp_001'
down_revision = None  # Update this to your latest migration
branch_labels = None
depends_on = None


def upgrade():
    # WhatsApp Business Account
    op.create_table(
        'wa_business_accounts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workspace_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('waba_id', sa.String(64), nullable=False),
        sa.Column('business_id', sa.String(64), nullable=True),
        sa.Column('name', sa.String(255), nullable=True),
        sa.Column('currency', sa.String(10), server_default='INR'),
        sa.Column('timezone_id', sa.String(64), server_default='Asia/Kolkata'),
        sa.Column('system_user_id', sa.String(128), nullable=True),
        sa.Column('access_token_encrypted', sa.Text(), nullable=True),
        sa.Column('token_expires_at', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(32), server_default='active'),
        sa.Column('verified', sa.Boolean(), server_default='false'),
        sa.Column('webhook_url', sa.String(512), nullable=True),
        sa.Column('webhook_verify_token', sa.String(128), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces2.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('waba_id')
    )
    op.create_index('ix_wa_business_accounts_workspace_id', 'wa_business_accounts', ['workspace_id'])
    op.create_index('ix_wa_business_accounts_waba_id', 'wa_business_accounts', ['waba_id'])

    # WhatsApp Phone Numbers
    op.create_table(
        'wa_phone_numbers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('waba_id', sa.Integer(), nullable=False),
        sa.Column('phone_number_id', sa.String(64), nullable=False),
        sa.Column('display_phone_number', sa.String(32), nullable=False),
        sa.Column('verified_name', sa.String(255), nullable=True),
        sa.Column('quality_rating', sa.String(32), server_default='GREEN'),
        sa.Column('messaging_limit_tier', sa.String(32), nullable=True),
        sa.Column('status', sa.String(32), server_default='CONNECTED'),
        sa.Column('is_official_business_account', sa.Boolean(), server_default='false'),
        sa.Column('is_default', sa.Boolean(), server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['waba_id'], ['wa_business_accounts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('phone_number_id')
    )
    op.create_index('ix_wa_phone_numbers_waba_id', 'wa_phone_numbers', ['waba_id'])
    op.create_index('ix_wa_phone_numbers_phone_number_id', 'wa_phone_numbers', ['phone_number_id'])

    # Message Templates
    op.create_table(
        'wa_message_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('waba_id', sa.Integer(), nullable=False),
        sa.Column('template_id', sa.String(64), nullable=False),
        sa.Column('name', sa.String(512), nullable=False),
        sa.Column('language', sa.String(16), nullable=False, server_default='en'),
        sa.Column('category', sa.String(64), nullable=True),
        sa.Column('status', sa.String(32), server_default='PENDING'),
        sa.Column('components_json', postgresql.JSONB(), nullable=True),
        sa.Column('quality_score', sa.String(32), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('synced_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['waba_id'], ['wa_business_accounts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('waba_id', 'template_id', 'language', name='uq_wa_template_waba_id_lang')
    )
    op.create_index('ix_wa_message_templates_waba_id', 'wa_message_templates', ['waba_id'])
    op.create_index('ix_wa_message_templates_template_id', 'wa_message_templates', ['template_id'])
    op.create_index('ix_wa_message_templates_name', 'wa_message_templates', ['name'])

    # CTWA Campaigns
    op.create_table(
        'ctwa_campaigns',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workspace_id', sa.Integer(), nullable=False),
        sa.Column('waba_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('meta_campaign_id', sa.String(64), nullable=True),
        sa.Column('ad_account_id', sa.String(64), nullable=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('objective', sa.String(64), server_default='MESSAGES'),
        sa.Column('special_ad_categories', postgresql.JSONB(), server_default='[]'),
        sa.Column('daily_budget', sa.Numeric(12, 2), nullable=True),
        sa.Column('lifetime_budget', sa.Numeric(12, 2), nullable=True),
        sa.Column('start_time', sa.DateTime(), nullable=True),
        sa.Column('end_time', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(32), server_default='draft'),
        sa.Column('meta_status', sa.String(32), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('impressions', sa.BigInteger(), server_default='0'),
        sa.Column('clicks', sa.BigInteger(), server_default='0'),
        sa.Column('spend', sa.Numeric(12, 2), server_default='0'),
        sa.Column('conversations_started', sa.BigInteger(), server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces2.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['waba_id'], ['wa_business_accounts.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('meta_campaign_id')
    )
    op.create_index('ix_ctwa_campaigns_workspace_id', 'ctwa_campaigns', ['workspace_id'])
    op.create_index('ix_ctwa_campaigns_meta_campaign_id', 'ctwa_campaigns', ['meta_campaign_id'])
    op.create_index('ix_ctwa_campaigns_ad_account_id', 'ctwa_campaigns', ['ad_account_id'])

    # CTWA Ad Sets
    op.create_table(
        'ctwa_adsets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('campaign_id', sa.Integer(), nullable=False),
        sa.Column('meta_adset_id', sa.String(64), nullable=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('targeting_json', postgresql.JSONB(), nullable=True),
        sa.Column('daily_budget', sa.Numeric(12, 2), nullable=True),
        sa.Column('bid_amount', sa.Numeric(12, 2), nullable=True),
        sa.Column('optimization_goal', sa.String(64), server_default='CONVERSATIONS'),
        sa.Column('billing_event', sa.String(64), server_default='IMPRESSIONS'),
        sa.Column('destination_type', sa.String(32), server_default='WHATSAPP'),
        sa.Column('phone_number_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(32), server_default='draft'),
        sa.Column('meta_status', sa.String(32), nullable=True),
        sa.Column('start_time', sa.DateTime(), nullable=True),
        sa.Column('end_time', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['campaign_id'], ['ctwa_campaigns.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['phone_number_id'], ['wa_phone_numbers.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('meta_adset_id')
    )
    op.create_index('ix_ctwa_adsets_campaign_id', 'ctwa_adsets', ['campaign_id'])
    op.create_index('ix_ctwa_adsets_meta_adset_id', 'ctwa_adsets', ['meta_adset_id'])

    # CTWA Creatives
    op.create_table(
        'ctwa_creatives',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('adset_id', sa.Integer(), nullable=False),
        sa.Column('meta_creative_id', sa.String(64), nullable=True),
        sa.Column('meta_ad_id', sa.String(64), nullable=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('headline', sa.String(255), nullable=True),
        sa.Column('body', sa.Text(), nullable=True),
        sa.Column('image_hash', sa.String(128), nullable=True),
        sa.Column('image_url', sa.String(1024), nullable=True),
        sa.Column('video_id', sa.String(64), nullable=True),
        sa.Column('video_url', sa.String(1024), nullable=True),
        sa.Column('thumbnail_url', sa.String(1024), nullable=True),
        sa.Column('cta_type', sa.String(64), server_default='WHATSAPP_MESSAGE'),
        sa.Column('cta_text', sa.String(64), nullable=True),
        sa.Column('template_id', sa.Integer(), nullable=True),
        sa.Column('welcome_message', sa.Text(), nullable=True),
        sa.Column('status', sa.String(32), server_default='draft'),
        sa.Column('meta_status', sa.String(32), nullable=True),
        sa.Column('page_id', sa.String(64), nullable=True),
        sa.Column('instagram_account_id', sa.String(64), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['adset_id'], ['ctwa_adsets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['template_id'], ['wa_message_templates.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('meta_creative_id'),
        sa.UniqueConstraint('meta_ad_id')
    )
    op.create_index('ix_ctwa_creatives_adset_id', 'ctwa_creatives', ['adset_id'])

    # WA Conversations
    op.create_table(
        'wa_conversations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workspace_id', sa.Integer(), nullable=False),
        sa.Column('phone_number_id', sa.Integer(), nullable=False),
        sa.Column('customer_wa_id', sa.String(64), nullable=False),
        sa.Column('customer_phone', sa.String(32), nullable=True),
        sa.Column('customer_name', sa.String(255), nullable=True),
        sa.Column('customer_profile_pic', sa.String(512), nullable=True),
        sa.Column('campaign_id', sa.Integer(), nullable=True),
        sa.Column('adset_id', sa.Integer(), nullable=True),
        sa.Column('creative_id', sa.Integer(), nullable=True),
        sa.Column('ad_id', sa.String(64), nullable=True),
        sa.Column('status', sa.String(32), server_default='active'),
        sa.Column('is_user_initiated', sa.Boolean(), server_default='true'),
        sa.Column('window_expires_at', sa.DateTime(), nullable=True),
        sa.Column('last_user_message_at', sa.DateTime(), nullable=True),
        sa.Column('last_business_message_at', sa.DateTime(), nullable=True),
        sa.Column('tags', postgresql.JSONB(), server_default='[]'),
        sa.Column('custom_data', postgresql.JSONB(), server_default='{}'),
        sa.Column('capi_event_sent', sa.Boolean(), server_default='false'),
        sa.Column('nudge_count', sa.Integer(), server_default='0'),
        sa.Column('last_nudge_at', sa.DateTime(), nullable=True),
        sa.Column('next_nudge_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces2.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['phone_number_id'], ['wa_phone_numbers.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['campaign_id'], ['ctwa_campaigns.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['adset_id'], ['ctwa_adsets.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['creative_id'], ['ctwa_creatives.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('phone_number_id', 'customer_wa_id', name='uq_wa_conv_phone_customer')
    )
    op.create_index('ix_wa_conversations_workspace_id', 'wa_conversations', ['workspace_id'])
    op.create_index('ix_wa_conversations_phone_number_id', 'wa_conversations', ['phone_number_id'])
    op.create_index('ix_wa_conversations_customer_wa_id', 'wa_conversations', ['customer_wa_id'])
    op.create_index('ix_wa_conv_workspace_status', 'wa_conversations', ['workspace_id', 'status'])
    op.create_index('ix_wa_conversations_campaign_id', 'wa_conversations', ['campaign_id'])

    # WA Messages
    op.create_table(
        'wa_messages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('conversation_id', sa.Integer(), nullable=False),
        sa.Column('wamid', sa.String(128), nullable=True),
        sa.Column('direction', sa.String(16), nullable=False),
        sa.Column('from_number', sa.String(32), nullable=True),
        sa.Column('to_number', sa.String(32), nullable=True),
        sa.Column('message_type', sa.String(32), nullable=False),
        sa.Column('text_body', sa.Text(), nullable=True),
        sa.Column('media_id', sa.String(128), nullable=True),
        sa.Column('media_url', sa.String(1024), nullable=True),
        sa.Column('media_mime_type', sa.String(128), nullable=True),
        sa.Column('media_sha256', sa.String(128), nullable=True),
        sa.Column('caption', sa.Text(), nullable=True),
        sa.Column('template_name', sa.String(512), nullable=True),
        sa.Column('template_language', sa.String(16), nullable=True),
        sa.Column('template_components', postgresql.JSONB(), nullable=True),
        sa.Column('interactive_type', sa.String(32), nullable=True),
        sa.Column('interactive_payload', postgresql.JSONB(), nullable=True),
        sa.Column('status', sa.String(32), server_default='sent'),
        sa.Column('status_updated_at', sa.DateTime(), nullable=True),
        sa.Column('error_code', sa.String(32), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('context_message_id', sa.String(128), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['conversation_id'], ['wa_conversations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('wamid')
    )
    op.create_index('ix_wa_messages_conversation_id', 'wa_messages', ['conversation_id'])
    op.create_index('ix_wa_messages_wamid', 'wa_messages', ['wamid'])
    op.create_index('ix_wa_msg_conv_created', 'wa_messages', ['conversation_id', 'created_at'])

    # CAPI Events
    op.create_table(
        'capi_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workspace_id', sa.Integer(), nullable=False),
        sa.Column('event_id', sa.String(128), nullable=False),
        sa.Column('event_name', sa.String(64), nullable=False),
        sa.Column('pixel_id', sa.String(64), nullable=True),
        sa.Column('ad_id', sa.String(64), nullable=True),
        sa.Column('campaign_id', sa.Integer(), nullable=True),
        sa.Column('conversation_id', sa.Integer(), nullable=True),
        sa.Column('event_time', sa.DateTime(), nullable=False),
        sa.Column('event_source_url', sa.String(1024), nullable=True),
        sa.Column('action_source', sa.String(64), server_default='business_messaging'),
        sa.Column('user_data_json', postgresql.JSONB(), nullable=True),
        sa.Column('custom_data_json', postgresql.JSONB(), nullable=True),
        sa.Column('status', sa.String(32), server_default='pending'),
        sa.Column('api_response', postgresql.JSONB(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('retry_count', sa.Integer(), server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces2.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['campaign_id'], ['ctwa_campaigns.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['conversation_id'], ['wa_conversations.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('event_id')
    )
    op.create_index('ix_capi_events_workspace_id', 'capi_events', ['workspace_id'])
    op.create_index('ix_capi_events_event_id', 'capi_events', ['event_id'])

    # WA Scheduled Messages
    op.create_table(
        'wa_scheduled_messages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('conversation_id', sa.Integer(), nullable=False),
        sa.Column('scheduled_at', sa.DateTime(), nullable=False),
        sa.Column('message_type', sa.String(32), nullable=False, server_default='template'),
        sa.Column('template_id', sa.Integer(), nullable=True),
        sa.Column('template_name', sa.String(512), nullable=True),
        sa.Column('template_language', sa.String(16), nullable=True),
        sa.Column('template_components', postgresql.JSONB(), nullable=True),
        sa.Column('text_body', sa.Text(), nullable=True),
        sa.Column('status', sa.String(32), server_default='pending'),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('retry_count', sa.Integer(), server_default='0'),
        sa.Column('max_retries', sa.Integer(), server_default='3'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['conversation_id'], ['wa_conversations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['template_id'], ['wa_message_templates.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_wa_scheduled_messages_conversation_id', 'wa_scheduled_messages', ['conversation_id'])
    op.create_index('ix_wa_scheduled_messages_scheduled_at', 'wa_scheduled_messages', ['scheduled_at'])
    op.create_index('ix_wa_sched_status_time', 'wa_scheduled_messages', ['status', 'scheduled_at'])

    # WA Webhook Events (for debugging)
    op.create_table(
        'wa_webhook_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.String(64), nullable=False),
        sa.Column('waba_id', sa.String(64), nullable=True),
        sa.Column('phone_number_id', sa.String(64), nullable=True),
        sa.Column('payload_json', postgresql.JSONB(), nullable=False),
        sa.Column('processed', sa.Boolean(), server_default='false'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('event_hash', sa.String(64), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_wa_webhook_events_event_type', 'wa_webhook_events', ['event_type'])
    op.create_index('ix_wa_webhook_events_waba_id', 'wa_webhook_events', ['waba_id'])
    op.create_index('ix_wa_webhook_events_event_hash', 'wa_webhook_events', ['event_hash'])
    op.create_index('ix_wa_webhook_created', 'wa_webhook_events', ['created_at'])


def downgrade():
    op.drop_table('wa_webhook_events')
    op.drop_table('wa_scheduled_messages')
    op.drop_table('capi_events')
    op.drop_table('wa_messages')
    op.drop_table('wa_conversations')
    op.drop_table('ctwa_creatives')
    op.drop_table('ctwa_adsets')
    op.drop_table('ctwa_campaigns')
    op.drop_table('wa_message_templates')
    op.drop_table('wa_phone_numbers')
    op.drop_table('wa_business_accounts')
