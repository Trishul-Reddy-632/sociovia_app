
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { Mail, MessageCircle, FileText, Phone } from 'lucide-react';

export default function OptimizationSupport() {
    const navigate = useNavigate();
    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Support & Help</h1>
                <p className="text-slate-500">Get assistance with your optimization strategy.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card
                    className="hover:shadow-md transition-shadow cursor-pointer group hover:border-blue-200"
                    onClick={() => navigate('/optimization/support/docs')}
                >
                    <CardContent className="p-6 text-center space-y-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-slate-900">Documentation</h3>
                            <p className="text-sm text-muted-foreground mt-1">Read the full guide on how The Council works.</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-6 text-center space-y-4">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                            <MessageCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Live Chat</h3>
                            <p className="text-sm text-muted-foreground mt-1">Chat with a strategy specialist (9am - 5pm EST).</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-6 text-center space-y-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto text-purple-600">
                            <Phone className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Priority Support</h3>
                            <p className="text-sm text-muted-foreground mt-1">Schedule a 1-on-1 review call.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                <div className="space-y-6">
                    <h3 className="text-xl font-bold">Frequently Asked Questions</h3>
                    <div className="space-y-4">
                        <FaqItem question="Why was my ad paused?" answer="The Risk Agent likely detected high creative fatigue (CTR drop) or the ROAS fell below your safety floor." />
                        <FaqItem question="Can I override the system?" answer="Yes. You can manual override any decision in the Dashboard. Manual actions lock the entity for 24h." />
                        <FaqItem question="How does Aggressive Mode work?" answer="It softens the risk vetoes, allowing scaling even with minor fatigue issues if ROAS is very high." />
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Contact Us</CardTitle>
                        <CardDescription>Send us a direct message.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label>Subject</Label>
                            <Input placeholder="I have a question about..." />
                        </div>
                        <div className="grid gap-2">
                            <Label>Message</Label>
                            <Textarea placeholder="Describe your issue detailed..." className="min-h-[120px]" />
                        </div>
                        <Button className="w-full">Send Message</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function FaqItem({ question, answer }: any) {
    return (
        <div className="border rounded-lg p-4 bg-white shadow-sm">
            <h4 className="font-semibold text-slate-900 mb-2">{question}</h4>
            <p className="text-sm text-slate-600">{answer}</p>
        </div>
    )
}
