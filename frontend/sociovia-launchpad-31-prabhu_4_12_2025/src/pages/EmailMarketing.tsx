import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, ExternalLink, Sparkles } from "lucide-react";

const EmailMarketing = () => {
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
                        <h1 className="text-3xl font-bold text-white">Email Marketing</h1>
                        <p className="text-gray-400">Create and manage email campaigns</p>
                    </div>
                </div>

                {/* Coming Soon Card */}
                <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                            <Mail className="h-8 w-8 text-green-400" />
                        </div>
                        <CardTitle className="text-2xl text-white">Email Marketing Coming Soon</CardTitle>
                        <CardDescription className="text-gray-400">
                            We're building powerful email marketing tools to help you reach your audience.
                            Create beautiful email campaigns, automate sequences, and track engagement all in one place.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button
                                onClick={() => navigate('/dashboard')}
                                className="bg-gradient-to-r from-purple-600 to-green-600 hover:from-purple-700 hover:to-green-700"
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
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-yellow-400" />
                                AI Email Writer
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-400 text-sm">
                                Generate compelling email content with AI assistance.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                        <CardHeader>
                            <CardTitle className="text-lg text-white">Automation</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-400 text-sm">
                                Set up automated email sequences for nurturing leads.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                        <CardHeader>
                            <CardTitle className="text-lg text-white">Analytics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-400 text-sm">
                                Track open rates, click-through rates, and conversions.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default EmailMarketing;
