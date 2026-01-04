import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Mail, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

const AccountCreation = () => {
    return (
        <div className="container mx-auto py-10 px-4 max-w-4xl">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold tracking-tight text-primary mb-2">Account Creation</h1>
                <p className="text-muted-foreground">Start your journey with Sociovia in just a few steps.</p>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-primary" />
                            Step 1: Sign Up
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">
                            Visit the signup page and enter your details. You'll need to provide a valid email address and create a secure password.
                        </p>
                        <Button asChild>
                            <Link to="/signup">Go to Signup</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="w-5 h-5 text-primary" />
                            Step 2: Email Verification
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            Check your inbox for a verification email. Click the link to verify your account. If you don't see it, check your spam folder.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-primary" />
                            Step 3: Profile Completion
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            Complete your profile by adding your business name and other relevant details. This helps us tailor the experience for you.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AccountCreation;
