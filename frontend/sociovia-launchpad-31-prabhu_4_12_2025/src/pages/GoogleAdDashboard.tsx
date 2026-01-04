import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3, ExternalLink } from "lucide-react";

const GoogleAdDashboard = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(-1)}
                        className="text-white hover:bg-white/10"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Google Ads Dashboard</h1>
                        <p className="text-gray-400">Manage and monitor your Google Ads campaigns</p>
                    </div>
                </div>

                {/* Coming Soon Card */}
                <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
                            <BarChart3 className="h-8 w-8 text-blue-400" />
                        </div>
                        <CardTitle className="text-2xl text-white">Google Ads Integration Coming Soon</CardTitle>
                        <CardDescription className="text-gray-400">
                            We're working on integrating Google Ads management directly into Sociovia.
                            Soon you'll be able to create, manage, and analyze your Google Ads campaigns all in one place.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button
                                variant="outline"
                                className="border-white/20 text-white hover:bg-white/10"
                                onClick={() => window.open('https://ads.google.com', '_blank')}
                            >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Open Google Ads
                            </Button>
                            <Button
                                onClick={() => navigate('/dashboard')}
                                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                            >
                                Back to Dashboard
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Features Preview */}
                <div className="grid md:grid-cols-3 gap-6 mt-8">
                    <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                        <CardHeader>
                            <CardTitle className="text-lg text-white">Campaign Management</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-400 text-sm">
                                Create and manage Search, Display, and Video campaigns directly from Sociovia.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                        <CardHeader>
                            <CardTitle className="text-lg text-white">Performance Analytics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-400 text-sm">
                                Track clicks, impressions, conversions, and ROI with detailed analytics.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                        <CardHeader>
                            <CardTitle className="text-lg text-white">AI Optimization</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-400 text-sm">
                                Leverage AI to optimize bid strategies and improve ad performance.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default GoogleAdDashboard;
