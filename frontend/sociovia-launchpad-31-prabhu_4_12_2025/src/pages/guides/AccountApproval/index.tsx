import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle2, XCircle } from "lucide-react";

const AccountApproval = () => {
    return (
        <div className="container mx-auto py-10 px-4 max-w-4xl">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold tracking-tight text-primary mb-2">Account Approval</h1>
                <p className="text-muted-foreground">Understanding the review process.</p>
            </div>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-amber-500" />
                            Under Review
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">
                            Once you've created your account, it goes into a review queue. Our team verifies your business details to ensure compliance with our policies.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            This process typically takes 24-48 hours. You will be notified via email once the review is complete.
                        </p>
                    </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                    <Card className="border-green-100 bg-green-50/30">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-green-700">
                                <CheckCircle2 className="w-5 h-5" />
                                Approved
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-green-800/80">
                                If approved, you'll gain full access to the platform. You can then proceed to set up your workspace and start creating campaigns.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-red-100 bg-red-50/30">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-red-700">
                                <XCircle className="w-5 h-5" />
                                Rejected
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-red-800/80">
                                If rejected, you'll receive an email detailing the reasons. You may be asked to provide additional information or correct discrepancies.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AccountApproval;
