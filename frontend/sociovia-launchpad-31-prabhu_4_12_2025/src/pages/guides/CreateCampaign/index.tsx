import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Users, Upload, PenTool, CheckSquare } from "lucide-react";

const CreateCampaign = () => {
    return (
        <div className="container mx-auto py-10 px-4 max-w-5xl">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold tracking-tight text-primary mb-2">Create Campaign</h1>
                <p className="text-muted-foreground">A step-by-step guide to launching your ads.</p>
            </div>

            <Tabs defaultValue="objective" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="objective">Objective & Audience</TabsTrigger>
                    <TabsTrigger value="creative">Creative Upload</TabsTrigger>
                    <TabsTrigger value="copy">Ad Copies</TabsTrigger>
                    <TabsTrigger value="review">Review & Publish</TabsTrigger>
                </TabsList>

                <TabsContent value="objective" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Target className="w-5 h-5 text-primary" />
                                Define Your Goal
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-muted-foreground">
                                Choose what you want to achieve: Brand Awareness, Traffic, Leads, or Sales.
                            </p>
                            <div className="flex items-center gap-2 text-sm font-medium mt-4">
                                <Users className="w-4 h-4 text-primary" />
                                <span>Target Audience</span>
                            </div>
                            <p className="text-muted-foreground text-sm">
                                Select your target demographics, interests, and behaviors. You can also use AI to suggest audiences based on your product.
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="creative" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Upload className="w-5 h-5 text-primary" />
                                Upload Assets
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground mb-4">
                                Upload your images or videos. You can also use our AI tools to generate or enhance creatives.
                            </p>
                            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                <li>Supported formats: JPG, PNG, MP4</li>
                                <li>Recommended size: 1080x1080 for feed</li>
                                <li>AI generation available</li>
                            </ul>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="copy" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <PenTool className="w-5 h-5 text-primary" />
                                Write Ad Copy
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                Craft compelling headlines and primary text. Use our AI copywriter to generate variations optimized for your objective.
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="review" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckSquare className="w-5 h-5 text-primary" />
                                Final Review
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                Double-check all settings, including budget and schedule. Once confirmed, hit publish to send your campaign to Meta for review.
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default CreateCampaign;
