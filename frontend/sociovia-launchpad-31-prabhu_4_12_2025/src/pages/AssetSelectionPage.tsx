// src/pages/AssetSelectionPage.tsx
"use client";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Image, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AssetSelectionPage({ preSelectedImages }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { setSelectedImages, workspace } = useCampaignStore(); // Assume store has workspace
  const [selectedAssets, setSelectedAssets] = useState(new Set());
  const [workspaceAssets, setWorkspaceAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // If pre-selected, load them as assets
  const initialAssets = preSelectedImages
    ? preSelectedImages.map((img) => ({
        id: img.id,
        url: img.url,
        name: `Selected Asset ${img.id.slice(-4)}`,
        type: "image/jpeg",
        file: null,
      }))
    : [];

  useEffect(() => {
    if (!preSelectedImages && workspace) {
      loadWorkspaceAssets();
    } else {
      setWorkspaceAssets(initialAssets);
      // Pre-select all if pre-selected
      if (initialAssets.length > 0) {
        setSelectedAssets(new Set(initialAssets.map((a) => a.id)));
      }
    }
  }, [preSelectedImages, workspace]);

  const loadWorkspaceAssets = async () => {
    setLoading(true);
    try {
      // Fetch workspace assets - adapt to your API
      const response = await fetch(`/api/workspace/${workspace?.id}/assets`); // Example endpoint
      if (response.ok) {
        const data = await response.json();
        setWorkspaceAssets(data.assets || []);
      } else {
        toast({ description: "Failed to load workspace assets." });
      }
    } catch (error) {
      console.error("Error loading assets:", error);
      toast({ description: "Error loading assets." });
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = workspaceAssets.filter((asset) =>
    asset.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleSelect = (id) => {
    setSelectedAssets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleProceed = () => {
    const selected = Array.from(selectedAssets).map((id) => {
      const asset = workspaceAssets.find((a) => a.id === id);
      return { id: asset?.id || id, url: asset?.url || "" };
    });
    if (selected.length === 0) {
      toast({ description: "Please select at least one asset." });
      return;
    }
    setSelectedImages({ images: selected, workspace });
    navigate("/budget"); // Or next route
    toast({ description: `Selected ${selected.length} assets. Proceeding to campaign setup.` });
  };

  const isSelected = (id) => selectedAssets.has(id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-8">
      <div className="container mx-auto px-4">
        <Card className="max-w-4xl mx-auto shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Image className="h-8 w-8 text-indigo-600" />
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Select Your Creative Assets
              </CardTitle>
            </div>
            <CardDescription className="text-center max-w-md mx-auto">
              {preSelectedImages ? (
                "Review your pre-selected images or choose from workspace."
              ) : (
                "Pick the best visuals from your workspace to power your campaign. Modern vibes only! ✨"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assets by name or URL..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border-2 border-indigo-100 focus:border-indigo-500 rounded-xl"
              />
            </div>

            {/* Assets Grid */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-48 bg-indigo-200 rounded-xl" />
                    <div className="h-4 bg-indigo-100 rounded mt-2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredAssets.map((asset) => {
                  const isSel = isSelected(asset.id);
                  return (
                    <Card
                      key={asset.id}
                      className={cn(
                        "group cursor-pointer overflow-hidden border-2 transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-indigo-500",
                        isSel ? "border-indigo-500 shadow-lg ring-2 ring-indigo-500/20" : "border-gray-200"
                      )}
                      onClick={() => handleToggleSelect(asset.id)}
                    >
                      <CardContent className="p-0 relative">
                        <img
                          src={asset.url}
                          alt={asset.name}
                          className="w-full h-48 object-cover group-hover:brightness-110 transition-transform duration-300"
                          onError={(e) => {
                            (e.target).src = "/creative-thumbnail.jpg";
                          }}
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Checkbox
                            checked={isSel}
                            onCheckedChange={() => handleToggleSelect(asset.id)}
                            className="h-8 w-8 border-2 border-white"
                          />
                        </div>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Badge variant={isSel ? "default" : "secondary"} className="bg-indigo-600 hover:bg-indigo-700">
                            {isSel ? "Selected" : "Select"}
                          </Badge>
                        </div>
                      </CardContent>
                      <CardHeader className="p-3 pb-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium truncate">{asset.name}</Label>
                          <Badge variant="outline" className="text-xs">{asset.type?.split("/")[1] || "image"}</Badge>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
                {filteredAssets.length === 0 && (
                  <Card className="col-span-full text-center py-12 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
                    <Image className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No assets found. Try a different search or generate new ones!</p>
                  </Card>
                )}
              </div>
            )}

            {/* Selection Summary */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {selectedAssets.size} / {workspaceAssets.length} selected
              </div>
              <Button
                onClick={handleProceed}
                disabled={selectedAssets.size === 0}
                className="group bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-2"
              >
                Proceed to Campaign
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}