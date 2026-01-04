import { Card, CardContent } from "@/components/ui/card";
import { Rocket, Lightbulb, Target, Brain, Users, Globe2, Handshake } from "lucide-react";

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-[#F9F9F9] p-8">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2 text-[#1A1A1A]">About Us</h1>
          <p className="text-lg text-gray-600">
            AI-powered automation to make digital advertising simple, smart & effective 🚀
          </p>
        </div>

        {/* Who We Are */}
        <Card className="shadow-lg rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Rocket className="w-6 h-6 text-[#3DDC84]" />
              <h2 className="text-2xl font-semibold">Who We Are</h2>
            </div>
            <p className="text-gray-700 leading-relaxed">
              Adtomate Solutions Private Limited is an AI-powered marketing automation
              platform designed to make digital advertising simple, smart, and effective.
              We believe that every business — from startups to enterprises — should have
              access to world-class ad automation tools without needing deep technical
              expertise or large marketing teams.
            </p>
          </CardContent>
        </Card>

        {/* Vision */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Lightbulb className="w-6 h-6 text-[#00B4D8]" />
              <h2 className="text-2xl font-semibold">Our Vision</h2>
            </div>
            <p className="text-gray-700 leading-relaxed">
              To revolutionize digital marketing by enabling businesses worldwide to run
              smart, optimized, and fully automated ad campaigns powered by Artificial Intelligence.
            </p>
          </CardContent>
        </Card>

        {/* Mission */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-6 h-6 text-[#3DDC84]" />
              <h2 className="text-2xl font-semibold">Our Mission</h2>
            </div>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Simplify the way businesses create, manage, and optimize ads.</li>
              <li>Empower companies with data-driven insights and smart recommendations.</li>
              <li>Build an all-in-one ecosystem including AI Ad Automation, Funnel Building, CRM Integration & Analytics.</li>
            </ul>
          </CardContent>
        </Card>

        {/* What We Do */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Brain className="w-6 h-6 text-[#00B4D8]" />
              <h2 className="text-2xl font-semibold">What We Do</h2>
            </div>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Automate Ads: AI-driven recommendations to create and run campaigns.</li>
              <li>Build Funnels: Map customer journey from awareness to conversion.</li>
              <li>Manage Leads: Sync & organize leads in an integrated CRM.</li>
              <li>Gain Insights: Track ad performance with intelligent ROI suggestions.</li>
            </ul>
            <p className="mt-3 text-gray-700 italic">
              We’re not just a tool — we’re your digital growth partner.
            </p>
          </CardContent>
        </Card>

        {/* Team */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-[#3DDC84]" />
              <h2 className="text-2xl font-semibold">Our Team</h2>
            </div>
            <p className="text-gray-700 leading-relaxed">
              Founded by passionate innovators, Sociovia is powered by AI engineers, marketers,
              and strategists who combine technology & creativity. Our culture is built on
              curiosity, collaboration, and solving real business challenges.
            </p>
          </CardContent>
        </Card>

        {/* Future */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Globe2 className="w-6 h-6 text-[#00B4D8]" />
              <h2 className="text-2xl font-semibold">Our Future</h2>
            </div>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Multi-platform integrations (Google Ads, LinkedIn, Shopify, etc.)</li>
              <li>Global availability across markets.</li>
              <li>A full-stack AI-powered marketing suite for the future.</li>
            </ul>
          </CardContent>
        </Card>

        {/* Join Us */}
        <Card className="bg-[#3DDC84] text-white shadow-lg">
          <CardContent className="p-6 text-center">
            <div className="flex justify-center mb-4">
              <Handshake className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Join Us on the Journey</h2>
            <p className="leading-relaxed">
              At Sociovia, we believe marketing should be accessible, affordable, and powerful
              for every business. Whether you’re a startup, SME, or enterprise, we’re here to
              help you grow.
            </p>
            <p className="mt-3 font-semibold">✨ Because at Sociovia — AI is the Future of Advertising.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
