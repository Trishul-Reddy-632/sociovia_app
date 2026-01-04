import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import logo from "@/assets/sociovia_logo.png";

const EFFECTIVE_DATE = "01st September 2025";

export default function PrivacyPolicy(): JSX.Element {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center gap-4">
          <img src={logo} alt="Sociovia" className="h-12" />
          <div>
            <h1 className="text-2xl font-bold">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">Effective Date: {EFFECTIVE_DATE}</p>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Adtomate Solutions Private Limited ("Sociovia", "we", "our", or "us") is committed to protecting your privacy.
              This Privacy Policy explains what information we collect, how we use and share it, and the choices you have.
            </p>
            <p className="mt-3">
              By using our website, platform or services, you agree to the terms of this Privacy Policy.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Information We Collect</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc ml-5 space-y-2">
              <li>
                <strong>Information you provide:</strong> name, email, phone, business details, workspace and billing information, and credentials you submit to connect third-party services.
              </li>
              <li>
                <strong>Third-party data:</strong> when you connect accounts (e.g. Meta/Facebook Ads, Shopify, CRMs) we may access ad account IDs, campaigns, performance metrics, and leads as permitted.
              </li>
              <li>
                <strong>Automatically collected:</strong> logs (IP, device, browser), usage data, cookies and analytics data to operate and improve the service.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How We Use Your Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p>We use the data to:</p>
            <ul className="list-disc ml-5 space-y-2">
              <li>Provide and operate the Services (campaign management, creative suggestions, lead sync).</li>
              <li>Generate AI-driven insights and reports.</li>
              <li>Support integrations and sync data to your connected CRMs.</li>
              <li>Communicate important updates, billing, and support messages.</li>
            </ul>
            <p className="mt-3">We do not sell personal information to third parties.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sharing & Third Parties</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              We share data only in limited scenarios: (a) with service providers (hosting, analytics, email), (b) with platforms you explicitly connect (Meta, Shopify, CRMs), (c) to comply with legal obligations, or (d) in connection with a business transaction (merger/acquisition).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security & Storage</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              We implement industry-standard technical and organizational safeguards such as encryption, access controls, and regular security reviews. While we strive to keep your data secure, no system is completely immune to risk.
            </p>
            <p className="mt-2">
              If you disconnect an integration (e.g., Facebook Ads), related synced data will be deleted or anonymized within 30 days unless otherwise required by law.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Rights</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Depending on your jurisdiction (GDPR, CCPA, etc.), you may have the right to access, correct, or delete your personal data, withdraw consent, and export your data. To exercise any rights, contact us at <strong>info@sociovia.com</strong>.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Children</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Sociovia is not intended for individuals under the age of 18. We do not knowingly collect data from children.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Changes to This Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <p>We may update this policy periodically. The Effective Date at the top reflects the latest update.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              For questions about privacy, data requests or complaints contact us:
            </p>
            <ul className="list-disc ml-5 mt-2">
              <li>📧 <strong>contact@sociovia.com</strong></li>
              <li>🏢 Adtomate Solutions Private Limited — 71 S/f R/s F/p, Hari Nagar Ashram, South Delhi, New Delhi, Delhi, India, 110014</li>
            </ul>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button asChild>
            <a href="/" aria-label="Return home">Back to Home</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
