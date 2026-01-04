import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link2, Facebook, Instagram, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const LinkMeta = () => {
    return (
        <div className="container mx-auto py-10 px-4 max-w-4xl">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold tracking-tight text-primary mb-2">Link Meta Accounts</h1>
                <p className="text-muted-foreground">Connect your Facebook and Instagram accounts to start advertising.</p>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Link2 className="w-5 h-5 text-primary" />
                            Connect Accounts
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-6">
                            Navigate to the "Bind Meta" section in your workspace settings. You'll be redirected to Facebook to authorize the connection.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Button className="bg-[#1877F2] hover:bg-[#1864D9]" asChild>
                                <Link to="/workspace/bind-meta">
                                    <Facebook className="w-4 h-4 mr-2" />
                                    Connect Facebook
                                </Link>
                            </Button>
                            <Button className="bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-90" asChild>
                                <Link to="/workspace/bind-meta">
                                    <Instagram className="w-4 h-4 mr-2" />
                                    Connect Instagram
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            Verification
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            Once connected, ensure that your Ad Accounts and Pages are visible in the dashboard. You may need to grant specific permissions during the authorization process.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default LinkMeta;
