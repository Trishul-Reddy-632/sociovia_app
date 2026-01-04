// WhatsApp Test Console Types
// ============================

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  wabaId?: string;
  apiVersion: string;
}

export type MessageType = 'text' | 'template' | 'media' | 'interactive';

export type MediaType = 'image' | 'video' | 'audio' | 'document';

export type InteractiveType = 'button' | 'list';

// API Request Types
export interface TextMessagePayload {
  to: string;
  text: string;
  preview_url?: boolean;
}

export interface TemplateMessagePayload {
  to: string;
  template_name: string;
  language: string;
  components?: TemplateComponent[];
  params?: string[];
  header_image_url?: string;
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters?: TemplateParameter[];
}

export interface TemplateParameter {
  type: 'text' | 'image' | 'video' | 'document';
  text?: string;
  image?: { link: string };
  video?: { link: string };
  document?: { link: string; filename?: string };
}

export interface MediaMessagePayload {
  to: string;
  media_type: MediaType;
  media_url?: string;
  media_id?: string;
  caption?: string;
  filename?: string;
}

export interface InteractiveMessagePayload {
  to: string;
  type?: InteractiveType;
  interactive?: {
    type: InteractiveType;
    body: string;
    header?: string;
    footer?: string;
    buttons?: InteractiveButton[];
    button?: string; // For list type - the button text
    sections?: ListSection[];
  };
}

export interface InteractiveButton {
  id: string;
  title: string;
}

export interface ListSection {
  title: string;
  rows: ListRow[];
}

export interface ListRow {
  id: string;
  title: string;
  description?: string;
}

// API Response Types
export interface WhatsAppApiResponse {
  success: boolean;
  wamid?: string;
  message_id?: number;
  conversation_id?: number;
  error?: string;
  error_code?: string;
  payload_sent?: Record<string, unknown>;
}

export interface ConversationMessage {
  id: number;
  conversation_id: number;
  wamid?: string;
  direction: 'incoming' | 'outgoing';
  type: string; // text, template, image, video, audio, document, interactive
  content: Record<string, unknown>; // JSON content
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  error_code?: string;
  error_message?: string;
  created_at: string;
  delivered_at?: string;
  read_at?: string;
}

export interface Conversation {
  id: number;
  account_id: number;
  user_phone: string;
  user_name?: string;
  status: 'open' | 'closed';
  unread_count: number;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  messages?: ConversationMessage[];
}

// Local Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'wa_test_access_token',
  PHONE_NUMBER_ID: 'wa_test_phone_number_id',
  WABA_ID: 'wa_test_waba_id',
  API_VERSION: 'wa_test_api_version',
} as const;
