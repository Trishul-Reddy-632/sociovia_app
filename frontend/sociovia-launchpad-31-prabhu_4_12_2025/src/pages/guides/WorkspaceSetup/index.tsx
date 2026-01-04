import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Bot, Link as LinkIcon } from "lucide-react";
import { Link } from "react-router-dom";

const WorkspaceSetup = () => {
    return (
        <div className="container mx-auto py-10 px-4 max-w-4xl">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold tracking-tight text-primary mb-2">Workspace Setup</h1>
                <p className="text-muted-foreground">Configure your environment for success.</p>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-primary" />
                            Manual Setup
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">
                            Manually enter your workspace details, including name, industry, and timezone. This gives you full control over the configuration.
                        </p>
                        <Button variant="outline" asChild>
                            <Link to="/workspace/create">Create Workspace</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bot className="w-5 h-5 text-primary" />
                            AI-Generated Setup
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">
                            Simply provide your business website URL. Our AI will analyze your site and automatically populate your workspace details, including industry and description.
                        </p>
                        <div className="flex items-center gap-2 text-sm text-primary font-medium">
                            <LinkIcon className="w-4 h-4" />
                            <span>Requires valid business URL</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default WorkspaceSetup;
