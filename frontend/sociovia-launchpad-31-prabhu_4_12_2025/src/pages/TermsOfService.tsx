import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import logo from "@/assets/sociovia_logo.png";

const EFFECTIVE_DATE = "01st September 2025";

export default function TermsOfService(): JSX.Element {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center gap-4">
          <img src={logo} alt="Sociovia" className="h-12" />
          <div>
            <h1 className="text-2xl font-bold">Terms of Service</h1>
            <p className="text-sm text-muted-foreground">Effective Date: {EFFECTIVE_DATE}</p>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Introduction</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              These Terms of Service (“Terms”) govern your access to and use of Sociovia’s website, platform, and related services (“Services”).
              By using Sociovia, you agree to be bound by these Terms.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>1. Eligibility</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You must be at least 18 years old to use our Services and provide accurate information when creating your account.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Services Provided</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Sociovia offers an AI-driven marketing automation platform to help businesses create, manage and optimize social media ad campaigns, integrate leads into CRMs, and generate insights.
              Features may be modified or discontinued at our discretion.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. User Responsibilities</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc ml-5 space-y-2">
              <li>Use the Services lawfully and in compliance with platform policies (e.g., Meta Advertising Policies).</li>
              <li>Do not attempt to bypass security controls or misuse the platform.</li>
              <li>Ensure ads you run comply with all applicable laws and platform rules.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Account & Access</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              You are responsible for maintaining confidentiality of account credentials and for all activities under your account.
              If you suspect unauthorized access, contact <strong>support@sociovia.com</strong> immediately.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Payment & Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Certain features may be paid. Payment and billing terms will be presented at purchase. Failure to pay may result in suspension.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6. Data Usage & Privacy</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              By using Sociovia, you agree we may collect and process data as described in our Privacy Policy. You retain ownership of your data; we process it to provide Services.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>7. Intellectual Property</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              All content, software and branding of Sociovia are owned by Adtomate Solutions Private Limited. You may not copy, reverse-engineer, or redistribute our platform.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>8. Third Party Services</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Sociovia integrates with third-party platforms (Meta, Shopify, CRMs). We are not responsible for outages, policy changes or errors from those services.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>9. Termination</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              You may stop using the Services at any time. We may suspend or terminate accounts for policy violations or unlawful activity. Upon termination, your access to the Services ends.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>10. Disclaimer & Liability</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Services are provided “as is”. We do not guarantee uninterrupted availability or business outcomes from ads. To the maximum extent permitted by law, Sociovia is not liable for indirect, incidental or consequential losses. Our liability is limited to the amounts paid by you in the prior three months.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>11. Changes to Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <p>We may update these Terms from time to time and will post the revised Effective Date. Continued use after changes means you accept the updated Terms.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>12. Governing Law</CardTitle>
          </CardHeader>
          <CardContent>
            <p>These Terms are governed by the laws of India. Disputes will be subject to the jurisdiction of courts in the city of incorporation.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <p>If you have questions about these Terms, contact us:</p>
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
