import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ObjectiveType =
  | 'BRAND_AWARENESS'
  | 'REACH'
  | 'ENGAGEMENT'
  | 'LEAD_GENERATION'
  | 'TRAFFIC'
  | 'CONVERSIONS';

export type AudienceMode = 'AI' | 'MANUAL';

export type QuestionType =
  | 'FULL_NAME' | 'EMAIL' | 'PHONE' | 'TEXT' | 'TEXTAREA'
  | 'MCQ_SINGLE' | 'MCQ_MULTI' | 'RATING' | 'DATE'
  | 'FILE_UPLOAD' | 'ADDRESS' | 'DROPDOWN' | 'BOOLEAN';

export interface Question {
  id: string;
  type: QuestionType;
  label: string;
  placeholder?: string;
  help_text?: string;
  required: boolean;
  options?: { label: string; value: string }[];
  conditionalOn?: { questionId: string; operator: 'eq' | 'contains'; value: string };
}

export interface LeadFormConfig {
  form_name: string;
  intro_text: string;
  privacy_policy_url: string;
  questions: Question[];
  thank_you_text: string;
}

/**
 * Exported Campaign type
 */
export interface Campaign {
  id: string;
  title?: string;
  owner_id?: string;
}

/**
 * Audience estimate shape
 */
export interface AudienceEstimate {
  lower?: number;
  upper?: number;
  label?: string;
  method?: string;
}

/**
 * Audience shape
 */
export interface AudienceShape {
  mode: AudienceMode;
  location: {
    country: string;
    country_code?: string;
    region?: string;
    city?: string;
    industry?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    distance_unit?: string;
  };
  // Multi-location support
  locations?: Array<{
    country: string;
    country_code?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    distance_unit?: string;
  }>;
  age: [number, number];
  gender: 'all' | 'male' | 'female';
  interests: string[];
  estimate?: AudienceEstimate;
  // Additional metadata
  workspace_id?: string;
  lookalike_uploaded?: boolean;
  lookalike_filename?: string;
  lead_form_id?: string;
}

/**
 * Budget / placements / creative shapes
 */
export interface BudgetShape {
  type: 'daily' | 'lifetime';
  amount: number;
  currency: string;
  startDate: string;
  endDate: string;
  optimization: 'CLICKS' | 'LEADS' | 'PURCHASES';
  leads_form?: LeadFormConfig;
  // Selected existing form (mutually exclusive or complementary to leads_form which is "new/draft")
  selectedFormId?: string;
}

export interface PlacementsShape {
  automatic: boolean;
  manual: string[];
}

export interface CreativeShape {
  imageId?: string;
  imageUrl?: string;
  videoUrl?: string;
  primaryText: string;
  headline: string;
  description: string;
  cta: string;
  url: string;
}

/**
 * Shape for selected images as used in ChatUI.tsx
 */
export interface SelectedImages {
  images: { id: string; url: string }[];
  workspace: any;
  account: any;
  isCarousel?: boolean;
}

export interface CampaignState {
  currentStep: number;
  objective: ObjectiveType | null;
  campaign?: Campaign;
  audience: AudienceShape;
  budget: BudgetShape;
  placements: PlacementsShape;
  creative: CreativeShape;
  selectedImages: SelectedImages | null;
  selectedForm?: { id: string; name: string; viewUrl: string; createdOn: string } | null; // For global tracking
  workspace?: any; // Workspace data used across campaign creation
  setStep: (step: number) => void;
  setObjective: (objective: ObjectiveType) => void;
  setCampaign: (campaign: Partial<Campaign>) => void;
  setAudience: (audience: Partial<AudienceShape>) => void;
  setBudget: (budget: Partial<BudgetShape>) => void;
  setPlacements: (placements: Partial<PlacementsShape>) => void;
  setCreative: (creative: Partial<CreativeShape>) => void;
  setSelectedImages: (data: SelectedImages) => void;
  setSelectedForm: (form: { id: string; name: string; viewUrl: string; createdOn: string } | null) => void;
  setWorkspace: (workspace: any) => void;
  reset: () => void;
}

const initialState = {
  currentStep: 1,
  objective: null as ObjectiveType | null,
  campaign: undefined as Campaign | undefined,
  audience: {
    mode: 'AI' as AudienceMode,
    location: { country: 'India', region: '', city: '', industry: '' },
    age: [25, 45] as [number, number],
    gender: 'all' as const,
    interests: [] as string[],
    estimate: undefined as AudienceEstimate | undefined,
  },
  budget: {
    type: 'daily' as const,
    amount: 500,
    currency: 'INR',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    optimization: 'CLICKS' as const,
  },
  placements: {
    automatic: true,
    manual: [] as string[],
  },
  creative: {
    imageId: '',
    imageUrl: '',
    videoUrl: '',
    primaryText: '',
    headline: '',
    description: '',
    cta: 'SHOP_NOW',
    url: '',
  },
  selectedImages: null as SelectedImages | null,
  selectedForm: null,
  workspace: undefined as any,
};

export const useCampaignStore = create<CampaignState>()(
  persist(
    (set) => ({
      ...initialState,
      setStep: (step) => set({ currentStep: step }),
      setObjective: (objective) => set({ objective }),
      setCampaign: (campaign) =>
        set((state) => ({
          campaign: { ...state.campaign, ...campaign } as Campaign,
        })),
      setAudience: (audience) =>
        set((state) => ({
          audience: { ...state.audience, ...audience },
        })),
      setBudget: (budget) =>
        set((state) => ({
          budget: { ...state.budget, ...budget },
        })),
      setPlacements: (placements) =>
        set((state) => ({
          placements: { ...state.placements, ...placements },
        })),
      setCreative: (creative) =>
        set((state) => ({
          creative: { ...state.creative, ...creative },
        })),
      setSelectedImages: (data) => set({ selectedImages: data }),
      setSelectedForm: (form) => set({ selectedForm: form }),
      setWorkspace: (workspace) => set({ workspace }),
      reset: () => set(initialState),
    }),
    {
      name: 'sociovia-campaign',
      // Exclude videoUrl from persistence to avoid localStorage quota issues
      partialize: (state) => ({
        ...state,
        creative: {
          ...state.creative,
          videoUrl: '', // Don't persist video data
        },
      }),
    }
  )
);

// Separate non-persisted store for large video data
interface VideoStore {
  videoUrl: string;
  videoFile: File | null;
  thumbnailUrl: string;
  thumbnailFile: File | null;
  setVideoUrl: (url: string) => void;
  setVideoFile: (file: File | null) => void;
  setThumbnailUrl: (url: string) => void;
  setThumbnailFile: (file: File | null) => void;
  clearVideo: () => void;
  clearThumbnail: () => void;
}

export const useVideoStore = create<VideoStore>((set) => ({
  videoUrl: '',
  videoFile: null,
  thumbnailUrl: '',
  thumbnailFile: null,
  setVideoUrl: (url) => set({ videoUrl: url }),
  setVideoFile: (file) => set({ videoFile: file }),
  setThumbnailUrl: (url) => set({ thumbnailUrl: url }),
  setThumbnailFile: (file) => set({ thumbnailFile: file }),
  clearVideo: () => set({ videoUrl: '', videoFile: null, thumbnailUrl: '', thumbnailFile: null }),
  clearThumbnail: () => set({ thumbnailUrl: '', thumbnailFile: null }),
}));