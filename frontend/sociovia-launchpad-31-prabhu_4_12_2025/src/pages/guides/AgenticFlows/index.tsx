import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Workflow,
    MessageSquare,
    Zap,
    GitBranch,
    CheckCircle,
    Play,
    Calendar,
    Bell,
    BarChart2,
    Bot,
    Clock,
    TrendingUp,
    Webhook,
    FileText,
    Target,
    Database,
    Users,
    MapPinIcon,
    Pause,
    Copy,
    TrashIcon,
    Mail,
    Phone,
    AlertTriangle,
    DownloadIcon,
    Settings,
    Sparkles
} from "lucide-react";

const AgenticFlows = () => {
    return (
        <div className="container mx-auto py-10 px-4 max-w-6xl">
            <div className="mb-10 text-center">
                <h1 className="text-4xl font-bold tracking-tight text-primary mb-4">Agentic Flows & Assistant</h1>
                <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
                    Master the art of automation with our visual workflow builder and intelligent AI assistant.
                    Design complex marketing strategies that run on autopilot.
                </p>
            </div>

            <Tabs defaultValue="nodes" className="w-full mb-16">
                <div className="flex justify-center mb-8">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="nodes">Node Reference</TabsTrigger>
                        <TabsTrigger value="assistant">AI Assistant</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="nodes" className="space-y-8">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-semibold mb-2">Workflow Node Reference</h2>
                        <p className="text-muted-foreground">Detailed documentation for every building block in your automation arsenal.</p>
                    </div>

                    {/* Triggers */}
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
                                <Zap className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold text-blue-900">Triggers</h3>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <NodeCard
                                icon={Clock}
                                title="Cron Schedule"
                                desc="Run workflow on a specific time schedule (e.g., every day at 2 AM)."
                                color="text-blue-600"
                            />
                            <NodeCard
                                icon={TrendingUp}
                                title="Metric Threshold"
                                desc="Trigger when a specific metric (like ROAS or CPA) exceeds or falls below a value."
                                color="text-blue-600"
                            />
                            <NodeCard
                                icon={Play}
                                title="Manual Trigger"
                                desc="Start the workflow manually from the dashboard."
                                color="text-blue-600"
                            />
                            <NodeCard
                                icon={Webhook}
                                title="Webhook"
                                desc="Trigger via an external API call to a unique URL."
                                color="text-blue-600"
                            />
                            <NodeCard
                                icon={Zap}
                                title="Event-Based"
                                desc="Trigger on custom events like 'lead_submitted' or 'purchase'."
                                color="text-blue-600"
                            />
                            <NodeCard
                                icon={FileText}
                                title="File Upload"
                                desc="Trigger when a file (CSV, etc.) is uploaded to storage."
                                color="text-blue-600"
                            />
                        </div>
                    </section>

                    <Separator />

                    {/* Selectors */}
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-cyan-100 rounded-lg text-cyan-700">
                                <Target className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold text-cyan-900">Selectors</h3>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <NodeCard
                                icon={Target}
                                title="Query Campaigns"
                                desc="Select campaigns based on specific criteria (e.g., Spend > $1000)."
                                color="text-cyan-600"
                            />
                            <NodeCard
                                icon={TrendingUp}
                                title="Top Performers"
                                desc="Select the top N campaigns/adsets by a specific metric."
                                color="text-cyan-600"
                            />
                            <NodeCard
                                icon={Database}
                                title="By Tags"
                                desc="Select entities that have specific tags or labels."
                                color="text-cyan-600"
                            />
                            <NodeCard
                                icon={Users}
                                title="By Audience"
                                desc="Select campaigns targeting specific audience segments."
                                color="text-cyan-600"
                            />
                            <NodeCard
                                icon={MapPinIcon}
                                title="Geographic Filter"
                                desc="Select campaigns targeting specific locations."
                                color="text-cyan-600"
                            />
                        </div>
                    </section>

                    <Separator />

                    {/* Conditions */}
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
                                <GitBranch className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold text-amber-900">Conditions</h3>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <NodeCard
                                icon={GitBranch}
                                title="Compare Metric"
                                desc="Branch the flow based on a metric value (e.g., if ROAS > 2)."
                                color="text-amber-600"
                            />
                            <NodeCard
                                icon={GitBranch}
                                title="AND/OR Logic"
                                desc="Combine multiple conditions with boolean logic."
                                color="text-amber-600"
                            />
                            <NodeCard
                                icon={Sparkles}
                                title="AI Confidence"
                                desc="Check the confidence score of an AI prediction."
                                color="text-amber-600"
                            />
                            <NodeCard
                                icon={Clock}
                                title="Time Window"
                                desc="Check if the current time is within a specific range."
                                color="text-amber-600"
                            />
                            <NodeCard
                                icon={AlertTriangle}
                                title="Compliance Check"
                                desc="Verify if ads meet specific policy requirements."
                                color="text-amber-600"
                            />
                        </div>
                    </section>

                    <Separator />

                    {/* Actions */}
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-green-100 rounded-lg text-green-700">
                                <Play className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold text-green-900">Actions</h3>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <NodeCard
                                icon={Pause}
                                title="Pause Campaign"
                                desc="Automatically pause the selected campaigns."
                                color="text-green-600"
                            />
                            <NodeCard
                                icon={Play}
                                title="Resume Campaign"
                                desc="Resume previously paused campaigns."
                                color="text-green-600"
                            />
                            <NodeCard
                                icon={TrendingUp}
                                title="Adjust Budget"
                                desc="Increase or decrease budget by a percentage or fixed amount."
                                color="text-green-600"
                            />
                            <NodeCard
                                icon={Copy}
                                title="Duplicate AdSet"
                                desc="Create a copy of an adset, optionally with a budget multiplier."
                                color="text-green-600"
                            />
                            <NodeCard
                                icon={Sparkles}
                                title="Swap Creative"
                                desc="Replace the ad creative with a new one."
                                color="text-green-600"
                            />
                            <NodeCard
                                icon={Target}
                                title="Update Targeting"
                                desc="Modify the audience targeting settings."
                                color="text-green-600"
                            />
                            <NodeCard
                                icon={TrashIcon}
                                title="Archive Campaign"
                                desc="Archive campaigns that are no longer needed."
                                color="text-green-600"
                            />
                        </div>
                    </section>

                    <Separator />

                    {/* Approvals */}
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-purple-100 rounded-lg text-purple-700">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold text-purple-900">Approvals</h3>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <NodeCard
                                icon={CheckCircle}
                                title="Request Approval"
                                desc="Pause the workflow until a human approves the action."
                                color="text-purple-600"
                            />
                            <NodeCard
                                icon={Users}
                                title="Multi-Step Approval"
                                desc="Require sequential approvals from multiple teams (e.g., Creative -> Legal)."
                                color="text-purple-600"
                            />
                        </div>
                    </section>

                    <Separator />

                    {/* Notifications */}
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-pink-100 rounded-lg text-pink-700">
                                <Bell className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold text-pink-900">Notifications</h3>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <NodeCard
                                icon={Mail}
                                title="Send Email"
                                desc="Send an email notification to specific recipients."
                                color="text-pink-600"
                            />
                            <NodeCard
                                icon={Bell}
                                title="Slack Message"
                                desc="Post a message to a Slack channel."
                                color="text-pink-600"
                            />
                            <NodeCard
                                icon={Webhook}
                                title="Webhook"
                                desc="Call an external webhook with payload data."
                                color="text-pink-600"
                            />
                            <NodeCard
                                icon={MessageSquare}
                                title="WhatsApp Message"
                                desc="Send a WhatsApp notification to a phone number."
                                color="text-pink-600"
                            />
                            <NodeCard
                                icon={Phone}
                                title="SMS Alert"
                                desc="Send an SMS alert via Twilio or similar provider."
                                color="text-pink-600"
                            />
                            <NodeCard
                                icon={Bell}
                                title="Push Notification"
                                desc="Send a push notification to mobile app users."
                                color="text-pink-600"
                            />
                        </div>
                    </section>

                    <Separator />

                    {/* AI Nodes */}
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-violet-100 rounded-lg text-violet-700">
                                <Bot className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold text-violet-900">AI Capabilities</h3>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <NodeCard
                                icon={Sparkles}
                                title="Generate Copy"
                                desc="Use AI to generate compelling ad copy variations."
                                color="text-violet-600"
                            />
                            <NodeCard
                                icon={Sparkles}
                                title="Score Creative"
                                desc="Predict the performance of ad creatives before launching."
                                color="text-violet-600"
                            />
                            <NodeCard
                                icon={Target}
                                title="Suggest Audience"
                                desc="Get AI-driven recommendations for audience targeting."
                                color="text-violet-600"
                            />
                            <NodeCard
                                icon={TrendingUp}
                                title="Optimize Bidding"
                                desc="AI suggestions for optimal bid strategies."
                                color="text-violet-600"
                            />
                            <NodeCard
                                icon={AlertTriangle}
                                title="Anomaly Detection"
                                desc="Detect unusual patterns or performance drops automatically."
                                color="text-violet-600"
                            />
                        </div>
                    </section>

                    <Separator />

                    {/* Analytics */}
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700">
                                <BarChart2 className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold text-indigo-900">Analytics</h3>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <NodeCard
                                icon={BarChart2}
                                title="Generate Report"
                                desc="Create a performance report (PDF, etc.) for a specific period."
                                color="text-indigo-600"
                            />
                            <NodeCard
                                icon={DownloadIcon}
                                title="Export Data"
                                desc="Export campaign metrics to CSV or Google Sheets."
                                color="text-indigo-600"
                            />
                            <NodeCard
                                icon={Settings}
                                title="Dashboard Update"
                                desc="Update live dashboard widgets with new data."
                                color="text-indigo-600"
                            />
                        </div>
                    </section>
                </TabsContent>

                <TabsContent value="assistant" className="space-y-8">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-semibold mb-2">AI Assistant Capabilities</h2>
                        <p className="text-muted-foreground">Your intelligent companion for campaign management.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <MessageSquare className="w-4 h-4" />
                                    Interactive Chat
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Context-aware chat interface to answer questions, suggest actions, and navigate the platform.
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Calendar className="w-4 h-4" />
                                    Task & Calendar
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Manage tasks and view upcoming events directly within the assistant interface.
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <BarChart2 className="w-4 h-4" />
                                    Data Visualization
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    View KPIs, charts, and analytics summaries generated on-the-fly.
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="mt-6">
                        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100">
                            <CardContent className="pt-6">
                                <div className="flex flex-col md:flex-row items-center gap-6">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold mb-2 text-indigo-900">Workflow Integration</h3>
                                        <p className="text-indigo-700/80 mb-4">
                                            The assistant can suggest entire workflows based on your goals. Simply ask "How do I optimize for conversions?" and it can generate a workflow template for you.
                                        </p>
                                        <div className="flex gap-2 flex-wrap">
                                            <Badge className="bg-indigo-200 text-indigo-800 hover:bg-indigo-300">Template Suggestions</Badge>
                                            <Badge className="bg-indigo-200 text-indigo-800 hover:bg-indigo-300">Direct Navigation</Badge>
                                            <Badge className="bg-indigo-200 text-indigo-800 hover:bg-indigo-300">Action Execution</Badge>
                                        </div>
                                    </div>
                                    <div className="shrink-0">
                                        <Bot className="w-24 h-24 text-indigo-200" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

const NodeCard = ({ icon: Icon, title, desc, color }: { icon: any, title: string, desc: string, color: string }) => (
    <Card className="hover:shadow-md transition-shadow border-l-4 border-l-transparent hover:border-l-current" style={{ color: color.replace('text-', '') }}>
        <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
                <Icon className={`w-4 h-4 ${color}`} />
                {title}
            </CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">{desc}</p>
        </CardContent>
    </Card>
);

export default AgenticFlows;
