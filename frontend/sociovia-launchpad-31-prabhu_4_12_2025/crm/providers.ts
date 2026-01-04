import {
    Facebook, Zap, FileSpreadsheet, FileText, Network, KanbanSquare
} from "lucide-react";

export type ProviderId = 'meta_leadgen' | 'zapier' | 'sheets' | 'typeform' | 'hubspot' | 'pipedrive';

export interface ProviderConfig {
    id: ProviderId;
    label: string;
    icon: any;
    color: string;
    bg: string;
    endpoint: string;
    description: string;
    docs: {
        usage: string;
        payload: object;
        tips?: string[];
    };
}

export const PROVIDERS: ProviderConfig[] = [
    {
        id: 'zapier',
        label: 'Zapier',
        icon: Zap,
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        endpoint: '/webhook/zapier',
        description: 'Connect with 5,000+ apps.',
        docs: {
            usage: "Use the 'Webhooks by Zapier' (Custom Request) action.",
            payload: {
                "name": "John Doe",
                "email": "john@example.com",
                "phone": "+15550123",
                "company": "Acme Inc",
                "source": "Zapier"
            },
            tips: ["Select 'POST' method", "Set 'JSON' as Payload Type"]
        }
    },
    {
        id: 'sheets',
        label: 'Google Sheets',
        icon: FileSpreadsheet,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        endpoint: '/webhook/sheets',
        description: 'Sync new rows automatically.',
        docs: {
            usage: "Send a row object. Works best with Apps Script or Zapier Sheets triggers.",
            payload: {
                "row": {
                    "name": "Jane User",
                    "email": "jane@example.com",
                    "phone": "555-0199",
                    "company": "Global Corp"
                }
            }
        }
    },
    {
        id: 'typeform',
        label: 'Typeform',
        icon: FileText,
        color: 'text-stone-800',
        bg: 'bg-stone-100',
        endpoint: '/webhook/typeform',
        description: 'Import form responses.',
        docs: {
            usage: "Add this URL as a Webhook in your Typeform Connect settings.",
            payload: {
                "form_response": {
                    "form_id": "AbCdEf",
                    "submitted_at": "2024-01-01T10:00:00Z",
                    "answers": ["..."]
                }
            },
            tips: ["We automatically map email, phone, and name fields."]
        }
    },
    {
        id: 'meta_leadgen',
        label: 'Meta LeadGen',
        icon: Facebook,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        endpoint: '/webhook/meta-lead',
        description: 'Facebook & Instagram Instant Forms.',
        docs: {
            usage: "Configure in Meta App Dashboard > Webhooks.",
            payload: {
                "object": "page",
                "entry": [{
                    "changes": [{
                        "field": "leadgen",
                        "value": { "leadgen_id": "44444444" }
                    }]
                }]
            },
            tips: ["Requires 'Meta Verify Token' (see Security Keys)."]
        }
    },
    {
        id: 'hubspot',
        label: 'HubSpot',
        icon: Network,
        color: 'text-orange-500',
        bg: 'bg-orange-50/50',
        endpoint: '/webhook/hubspot',
        description: 'Sync contacts from HubSpot.',
        docs: {
            usage: "Use HubSpot Workflows to send a webhook on contact creation.",
            payload: {
                "objectId": 12345,
                "properties": {
                    "firstname": "Alice",
                    "email": "alice@hubspot.com",
                    "company": "HubSpotter"
                }
            }
        }
    },
    {
        id: 'pipedrive',
        label: 'Pipedrive',
        icon: KanbanSquare,
        color: 'text-green-600',
        bg: 'bg-green-50',
        endpoint: '/webhook/pipedrive',
        description: 'Sync persons/deals.',
        docs: {
            usage: "Create a Webhook in Pipedrive Tools > Webhooks.",
            payload: {
                "current": {
                    "person_name": "Bob Builder",
                    "person_email": "bob@build.com",
                    "org_name": "Construction Co"
                }
            }
        }
    },
];
