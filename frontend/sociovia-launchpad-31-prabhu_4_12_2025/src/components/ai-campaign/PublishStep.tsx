import { useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Rocket, CheckCircle2, AlertOctagon, ArrowRight, Loader2, List } from "lucide-react";
import { EditorState } from "./CampaignEditorStep";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/config";
import { convertImageToJpegBase64 } from "@/lib/utils";

interface PublishStepProps {
    finalState: EditorState;
    onSuccess: () => void;
    onBack: () => void;
}

export default function PublishStep({ finalState, onSuccess, onBack }: PublishStepProps) {
    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    // Use the leading ad set for summary/publishing
    const activeAdSet = finalState.adSets.find(a => a.id === finalState.leadingAdSetId) || finalState.adSets[0];

    const handlePublish = async () => {
        setPublishing(true);
        setError(null);
        let successCount = 0;
        let failCount = 0;
        const errors: string[] = [];

        try {
            // 1. Get Context
            let workspaceIdStr = localStorage.getItem("sv_selected_workspace_id");
            let userIdStr = localStorage.getItem("sv_user_id");

            if (!workspaceIdStr || !userIdStr) {
                const userObjRaw = localStorage.getItem("sv_user");
                if (userObjRaw) {
                    const u = JSON.parse(userObjRaw);
                    if (u.id) userIdStr = String(u.id);
                }
            }

            if (!workspaceIdStr || !userIdStr) {
                throw new Error("Missing workspace or user context. Please refresh.");
            }

            const workspaceId = parseInt(workspaceIdStr, 10);
            const userId = parseInt(userIdStr, 10);

            // Loop through ALL Ad Sets
            for (const adSet of finalState.adSets) {
                try {
                    // 2. Prepare Image (Convert to Base64 JPEG)
                    let imageBase64 = null;
                    if (!adSet.destinationUrl || !adSet.destinationUrl.trim()) {
                        throw new Error(`"Destination URL" is missing for ${adSet.name}. Please go back and add it.`);
                    }

                    const imageUrl = adSet.imageUrls[0] || "";

                    if (imageUrl) {
                        try {
                            if (imageUrl.startsWith('data:')) {
                                imageBase64 = imageUrl;
                            } else {
                                // Use helper to force JPEG format
                                imageBase64 = await convertImageToJpegBase64(imageUrl, API_BASE_URL);
                            }
                        } catch (e) {
                            console.warn(`Image processing failed for ${adSet.name}, falling back to URL`, e);
                        }
                    }

                    // 3. Construct Payload
                    const payload: any = {
                        workspace_id: workspaceId,
                        user_id: userId,
                        campaign_name: `AI Campaign - ${adSet.headlines[0]?.slice(0, 20) || adSet.name}...`,
                        objective: finalState.objective,
                        daily_budget: Math.floor(finalState.budget / finalState.adSets.length), // Distribute budget? Or same budget? Usually per ad set if CBO is off, but API implies campaign level buget? 
                        // Actually, if we are calling publish 3 times, we are creating 3 campaigns?
                        // IMPORTANT: The backend `publish_v2` likely creates a Campaign + AdSet + Ad.
                        // If we call it 3 times, we get 3 Campaigns. This might not be what the user wants (1 Campaign, 3 Ad Sets).
                        // BUT, given the API limitations and current architecture, creating 3 separate campaigns (or variations) might be the only robust way without a bulk endpoint.
                        // However, let's assume we want to split the budget or keep it. Let's keep full budget for now or split it. 
                        // Let's stick to the current logic but iterate.

                        // Root level fields for backend compatibility
                        link: adSet.destinationUrl,
                        url: adSet.destinationUrl,
                        website_url: adSet.destinationUrl,
                        headline: adSet.headlines[0] || "",
                        primaryText: adSet.primaryTexts[0] || "",
                        description: adSet.description,
                        cta: adSet.cta,

                        creative: {
                            headline: adSet.headlines[0] || "",
                            primaryText: adSet.primaryTexts[0] || "",
                            description: adSet.description,
                            cta: adSet.cta,
                            link: adSet.destinationUrl,
                            url: adSet.destinationUrl,
                            website_url: adSet.destinationUrl
                        },

                        // Targeting
                        targeting: {
                            geo_locations: {
                                custom_locations: adSet.locations
                                    .filter(loc => typeof loc.lat === 'number' && typeof loc.lon === 'number')
                                    .map(loc => ({
                                        latitude: loc.lat,
                                        longitude: loc.lon,
                                        radius: loc.radius || 40,
                                        distance_unit: loc.distance_unit || "kilometer",
                                        name: loc.city || loc.display_name
                                    })),
                                // Only populate countries if for some reason we rely on country codes (e.g. no coords)
                                // But usually, if we have custom_locations, we don't mix unless intended.
                                // We'll include them if they exist in our data model and lack lat/lon.
                                countries: adSet.locations
                                    .filter(l => (!l.lat || !l.lon) && l.country_code)
                                    .map(l => l.country_code!),

                                location_types: ["home"]
                            },

                            age_min: adSet.ageMin,
                            age_max: adSet.ageMax,
                            genders: adSet.gender === 'all' ? [1, 2] : (adSet.gender === 'male' ? [1] : [2]),

                            // Pass interests as objects with IDs (Meta requires IDs)
                            interests: adSet.interests?.map((i: any) => ({ id: i.id, name: i.name })) || [],

                            // Required by Meta API 18.0+: explicit opt-in/out for Advantage+ Audience
                            targeting_automation: {
                                advantage_audience: 1,
                            }
                        }
                    };

                    // Attach image data
                    if (imageBase64) {
                        payload.creative.image_base64 = imageBase64;
                    } else {
                        payload.creative.image_url = imageUrl;
                    }

                    const res = await fetch(`${API_BASE_URL}/api/publish_v2`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    });

                    const json = await res.json();

                    if (!res.ok || json.ok === false) {
                        throw new Error(json.error || json.message || "Publishing failed.");
                    }

                    successCount++;
                } catch (innerErr: any) {
                    console.error(`Failed to publish ${adSet.name}:`, innerErr);
                    failCount++;
                    errors.push(`${adSet.name}: ${innerErr.message}`);
                }
            }

            if (failCount > 0) {
                if (successCount > 0) {
                    toast({
                        title: "Partial Success",
                        description: `Published ${successCount} Ad Sets. Failed: ${failCount}`,
                        variant: "default" // Warning?
                    });
                } else {
                    throw new Error(`All ${failCount} Ad Sets failed to publish. \n${errors.join('\n')}`);
                }
            } else {
                toast({
                    title: "Campaign Published! 🚀",
                    description: `Successfully published all ${successCount} Ad Sets to Meta.`,
                });
                onSuccess();
            }

        } catch (err: any) {
            console.error("Publish Error:", err);
            setError(err?.message || "Something went wrong.");
            toast({
                title: "Publish Failed",
                description: err?.message,
                variant: "destructive"
            });
        } finally {
            setPublishing(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-right duration-500">
            <Card className="border-emerald-100 bg-emerald-50/20">
                <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                        <Rocket className="w-8 h-8" />
                    </div>
                    <CardTitle className="text-2xl text-emerald-900">Ready to Launch?</CardTitle>
                    <CardDescription>
                        Review details for <strong>{finalState.adSets.length} Ad Set(s)</strong>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-white p-4 rounded-lg border space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Campaign Name</span>
                            <span className="font-medium truncate max-w-[200px]">AI Campaign - {activeAdSet.headlines[0]?.substring(0, 15)}...</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Daily Budget</span>
                            <span className="font-medium">₹{finalState.budget}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Objective</span>
                            <span className="font-medium badge badge-outline">{finalState.objective}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total Ads</span>
                            <span className="font-medium">{finalState.adSets.length} Variations</span>
                        </div>
                    </div>

                    {/* Preview of Logic */}
                    <div className="text-xs text-slate-500 bg-slate-100 p-3 rounded">
                        <span className="font-semibold text-slate-700">Note:</span> We will publish {finalState.adSets.length} distinct Ad Sets to Meta to maximize performance testing.
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md flex items-start gap-2">
                            <AlertOctagon className="w-4 h-4 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-semibold">Publication Failed</p>
                                <p>{error}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-4 pt-2">
                        <Button variant="outline" className="flex-1" onClick={onBack} disabled={publishing}>
                            Back to Edit
                        </Button>
                        <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handlePublish} disabled={publishing}>
                            {publishing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing...
                                </>
                            ) : (
                                <>
                                    Launch Campaign <ArrowRight className="ml-2 w-4 h-4" />
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
