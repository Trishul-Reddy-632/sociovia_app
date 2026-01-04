import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import VerifyEmail from "./pages/VerifyEmail";
import UnderReview from "./pages/UnderReview";
import Dashboard from "./pages/Dashboard";

// Admin pages
import AdminLogin from "./pages/admin/AdminLogin";
import AdminReview from "./pages/admin/AdminReview";

// Workspace pages
import Workspace from "./pages/Workspace";
import WorkspaceSetup from "./pages/WorkspaceSetup";
import BindMeta from "./pages/BindMeta";
import UserManagement from "./pages/UserManagement";
import AdAccounts from "./pages/AdAccounts";
import Settings from "./pages/Settings";
import WorkspaceCreate from "./pages/WorkspaceSetup";
import WorkspaceManage from "./pages/WorkspaceManage";

import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import AboutUs from "./pages/AboutUs";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import InstagramFBOAuth from "./pages/InstagramFBOAuth";
import OAuthComplete from "./pages/OAuthComplete";
import Fbuser from "./pages/fbuser";
import FacebookInsights from "./pages/FacebookInsights"
import { AuthProvider } from "@/contexts/AuthContext";
//marketing api 

import MarketingDashboard from "./marketingUI/MarketingDashboard";
import ChatUI from "./marketingUI/ChatUI"
import WorkspaceAssets from "./pages/WorkspaceAssets";
import WorkspaceEdit from "./pages/WorkspaceEdit";


import ObjectiveSelection from "./pages/ObjectiveSelection";
import AudienceSetup from "./pages/AudienceSetup";
import BudgetSchedule from "./pages/BudgetSchedule";
import PlacementSelection from "./pages/PlacementSelection";
import CreativeEditor from "./pages/CreativeEditor";
import ReviewAndConfirm from "./pages/ReviewAndConfirm";
import CreatePageLayout from "./layouts/CreatePageLayout";
import { BrowserRouter as Router, Navigate } from "react-router-dom";
import WorkspaceList from "./pages/WorkspaceList";
import WorkflowBuilder from "./pages/WorkflowBuilder";
import CreativeChoice from "./pages/CreativeChoice";
import CreativeChoice2 from "./pages/CreativeChoice2";
import CampaignDetails from "./marketingUI/CampaignDetails";
import AICampaignBuilder from "./pages/AICampaignBuilder";
import Assistant from "./pages/Assistant";
import TokenTracking from "./pages/TokenTracking";
import GoogleAdDashboard from "./pages/GoogleAdDashboard";
import EmailMarketing from "./pages/EmailMarketing";
import AccountCreation from "./pages/guides/AccountCreation";
import AccountApproval from "./pages/guides/AccountApproval";
import WorkspaceSetupGuide from "./pages/guides/WorkspaceSetup";
import LinkMeta from "./pages/guides/LinkMeta";
import CreateCampaignGuide from "./pages/guides/CreateCampaign";
import MonitorGuide from "./pages/guides/Monitor";
import AgenticFlows from "./pages/guides/AgenticFlows";
import Pricing from "./pages/Pricing";

// CRM Imports
import CRMLayout from "./crm/CRMLayout";
import CRMDashboard from "./crm/pages/CRMDashboard";
import Campaigns from "./crm/pages/Campaigns";
import Leads from "./crm/pages/Leads";
import Deals from "./crm/pages/Deals";
import Contacts from "./crm/pages/Contacts";
import Tasks from "./crm/pages/Tasks";
import CRMSettings from "./crm/pages/Settings";
import CampaignDetailsCRM from "./crm/pages/CampaignDetails";
import CampaignAnalytics from "./crm/pages/CampaignAnalytics";

// WhatsApp Test Console, Inbox & Settings
import { WhatsAppTestConsole, WhatsAppInbox, WhatsAppSettings } from "./whatsapp";

const queryClient = new QueryClient();


const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/under-review" element={<UnderReview />} />

            {/* User dashboard */}
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Workspace routes */}
            <Route path="/workspace" element={<Workspace />} />
            <Route path="/workspace/setup" element={<WorkspaceSetup />} />
            <Route path="/workspace/bind-meta" element={<BindMeta />} />
            <Route path="/workspace/users" element={<UserManagement />} />
            <Route path="/workspace/ad-accounts" element={<AdAccounts />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/workspace/create" element={<WorkspaceCreate />} />
            <Route path="/workspace/manage/:id" element={<WorkspaceManage />} />
            <Route path="/workspace/:id" element={<WorkspaceManage />} />

            {/* Admin routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/review" element={<AdminReview />} />

            {/* Legal & misc */}
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/cookie-policy" element={<AboutUs />} />
            <Route path="/about-us" element={<AboutUs />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/instagram-oauth" element={<InstagramFBOAuth />} />
            <Route path="/oauth-complete" element={<OAuthComplete />} />
            <Route path="/fb_user" element={<Fbuser />} />
            <Route path="/fb-insights" element={<FacebookInsights />} />
            <Route path="/marketing-dashboard" element={<MarketingDashboard />} />
            <Route path="/workspace/:id/assets" element={<WorkspaceAssets />} />
            <Route path="/sociovia-ai" element={<ChatUI />} />
            <Route path="/workspace/:id/chat" element={<ChatUI />} />
            <Route path="/workspace/:id/edit" element={<WorkspaceEdit />} />
            {/* Catch-all */}

            <Route path="/create" element={<CreatePageLayout />}>
              {/* redirect /create -> /create/objective */}
              <Route index element={<Navigate to="objective" replace />} />
              <Route path="objective" element={<ObjectiveSelection />} />
              <Route path="audience" element={<AudienceSetup />} />
              <Route path="budget" element={<BudgetSchedule />} />
              <Route path="placements" element={<PlacementSelection />} />
              <Route path="creative" element={<CreativeEditor />} />
              <Route path="review" element={<ReviewAndConfirm />} />
            </Route>
            <Route path="objective" element={<ObjectiveSelection />} />
            <Route path="audience" element={<AudienceSetup />} />
            <Route path="budget" element={<BudgetSchedule />} />
            <Route path="placements" element={<PlacementSelection />} />
            <Route path="creative" element={<CreativeEditor />} />
            <Route path="review" element={<ReviewAndConfirm />} />
            <Route path="/workspaces" element={<WorkspaceList />} />
            <Route path="/start" element={<CreativeChoice />} />
            <Route path="/start2" element={<CreativeChoice2 />} />
            <Route path="/campaign/:id" element={<CampaignDetails />} />
            <Route path="/workflow-builder" element={<WorkflowBuilder />} />
            <Route path="/ai-campaign-builder" element={<AICampaignBuilder />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="/token-tracking" element={<TokenTracking />} />
            <Route path="/dashboard/google" element={<GoogleAdDashboard />} />
            <Route path="/dashboard/email" element={<EmailMarketing />} />

            {/* WhatsApp Test Console, Inbox & Settings */}
            <Route path="/dashboard/whatsapp/test" element={<WhatsAppTestConsole />} />
            <Route path="/dashboard/whatsapp/inbox" element={<WhatsAppInbox />} />
            <Route path="/dashboard/whatsapp/settings" element={<WhatsAppSettings />} />

            {/* CRM Routes */}
            <Route path="/crm" element={<CRMLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<CRMDashboard />} />
              <Route path="campaigns" element={<Campaigns />} />
              <Route path="campaigns/:id" element={<CampaignDetailsCRM />} />
              <Route path="campaigns/:id/analytics" element={<CampaignAnalytics />} />
              <Route path="leads" element={<Leads />} />
              <Route path="deals" element={<Deals />} />
              <Route path="contacts" element={<Contacts />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="settings" element={<CRMSettings />} />
            </Route>

            {/* Quick Start Guides */}
            <Route path="/guides/account-creation" element={<AccountCreation />} />
            <Route path="/guides/account-approval" element={<AccountApproval />} />
            <Route path="/guides/workspace-setup" element={<WorkspaceSetupGuide />} />
            <Route path="/guides/link-meta" element={<LinkMeta />} />
            <Route path="/guides/create-campaign" element={<CreateCampaignGuide />} />
            <Route path="/guides/monitor" element={<MonitorGuide />} />
            <Route path="/agentic-flows" element={<AgenticFlows />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
