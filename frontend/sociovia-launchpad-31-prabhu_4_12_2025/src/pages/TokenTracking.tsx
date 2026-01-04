// Token Tracking Page - Detailed view of AI token usage (Realtime)
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Activity,
    Download,
    ArrowLeft,
    Search,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    IndianRupee as DollarSign,
    Zap,
    TrendingUp,
    RefreshCw,
} from "lucide-react";
import {
    TokenUsageRecord,
    TokenUsageSummary,
    formatCost,
    formatTokenCount,
    getRequestTypeColor,
} from "@/config/tokenPricing";
import { API_ENDPOINT } from "@/config";

export default function TokenTracking() {
    const navigate = useNavigate();
    const [records, setRecords] = useState<TokenUsageRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [filterModel, setFilterModel] = useState<string>("");
    const [filterRequestType, setFilterRequestType] = useState<string>("");
    const [currentPage, setCurrentPage] = useState(1);
    const [sortField, setSortField] =
        useState<keyof TokenUsageRecord>("timestamp");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
    const itemsPerPage = 10;

    // 🔹 Fetch realtime data from backend
    const fetchUsage = useCallback(async () => {
        try {
            setError(null);
            setLoading(true);
            const resp = await fetch(`${API_ENDPOINT}/usage/detailed?days=30`, {
                credentials: "include",
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            if (!data.ok || !Array.isArray(data.records)) {
                throw new Error("Unexpected API response");
            }

            const mapped: TokenUsageRecord[] = data.records.map(
                (r: any, idx: number) => ({
                    id: String(r.id ?? idx),
                    timestamp: r.created_at, // ISO string
                    requestType: r.feature, // e.g. "ai_suggest_audience"
                    model: r.model,
                    inputTokens: r.input_tokens ?? 0,
                    outputTokens: r.output_tokens ?? 0,
                    totalTokens:
                        r.total_tokens ?? (r.input_tokens ?? 0) + (r.output_tokens ?? 0),
                })
            );

            setRecords(
                mapped.sort(
                    (a, b) =>
                        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                )
            );
        } catch (err: any) {
            console.error("Failed to load token usage data:", err);
            setError(err?.message || "Failed to load data");
            setRecords([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load + realtime polling
    useEffect(() => {
        fetchUsage();

        // Poll every 20 seconds for "realtime" updates
        const interval = setInterval(() => {
            fetchUsage();
        }, 20000);

        return () => clearInterval(interval);
    }, [fetchUsage]);

    // Summary statistics
    const summary: TokenUsageSummary = useMemo(() => {
        const totalInputTokens = records.reduce(
            (sum, r) => sum + r.inputTokens,
            0
        );
        const totalOutputTokens = records.reduce(
            (sum, r) => sum + r.outputTokens,
            0
        );
        const totalTokens = records.reduce((sum, r) => sum + r.totalTokens, 0);

        return {
            totalInputTokens,
            totalOutputTokens,
            totalTokens,
            lastUpdated: new Date().toISOString(),
        };
    }, [records]);

    const uniqueModels = useMemo(
        () => Array.from(new Set(records.map((r) => r.model))).sort(),
        [records]
    );

    const uniqueRequestTypes = useMemo(
        () => Array.from(new Set(records.map((r) => r.requestType))).sort(),
        [records]
    );

    const mostUsedModel = useMemo(() => {
        const modelCounts = records.reduce((acc, r) => {
            acc[r.model] = (acc[r.model] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return (
            Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
            "N/A"
        );
    }, [records]);

    const mostCommonRequestType = useMemo(() => {
        const typeCounts = records.reduce((acc, r) => {
            acc[r.requestType] = (acc[r.requestType] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return (
            Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
            "N/A"
        );
    }, [records]);

    const filteredRecords = useMemo(() => {
        let filtered = records;

        if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(
                (r) =>
                    r.requestType.toLowerCase().includes(searchLower) ||
                    r.model.toLowerCase().includes(searchLower) ||
                    r.id.toLowerCase().includes(searchLower)
            );
        }

        if (filterModel) {
            filtered = filtered.filter((r) => r.model === filterModel);
        }

        if (filterRequestType) {
            filtered = filtered.filter((r) => r.requestType === filterRequestType);
        }

        return filtered;
    }, [records, search, filterModel, filterRequestType]);

    const sortedRecords = useMemo(() => {
        return [...filteredRecords].sort((a, b) => {
            const aVal = a[sortField];
            const bVal = b[sortField];

            if (typeof aVal === "string" && typeof bVal === "string") {
                return sortDirection === "asc"
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            }

            if (typeof aVal === "number" && typeof bVal === "number") {
                return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
            }

            return 0;
        });
    }, [filteredRecords, sortField, sortDirection]);

    const paginatedRecords = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedRecords.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedRecords, currentPage]);

    const totalPages = Math.ceil(sortedRecords.length / itemsPerPage);

    const handleSort = (field: keyof TokenUsageRecord) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("desc");
        }
    };

    const exportToCSV = () => {
        const headers = [
            "Timestamp",
            "Request Type",
            "Model",
            "Input Tokens",
            "Output Tokens",
            "Total Tokens",
        ];

        const rows = sortedRecords.map((r) => [
            new Date(r.timestamp).toLocaleString(),
            r.requestType,
            r.model,
            r.inputTokens,
            r.outputTokens,
            r.totalTokens,
        ]);

        const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
            "\n"
        );
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `token-usage-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading && !records.length && !error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
                    <p className="text-muted-foreground">Loading token usage data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b bg-card shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate("/dashboard")}
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Dashboard
                            </Button>
                            <div className="border-l h-6" />
                            <div>
                                <h1 className="text-2xl font-bold flex items-center gap-2">
                                    <Activity className="h-6 w-6 text-primary" />
                                    Token Usage Tracking
                                </h1>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Realtime breakdown of AI token consumption
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchUsage}
                                disabled={loading}
                            >
                                <RefreshCw
                                    className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""
                                        }`}
                                />
                                Refresh
                            </Button>
                            <Button onClick={exportToCSV} size="sm">
                                <Download className="h-4 w-4 mr-2" />
                                Export CSV
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-6">
                {/* Error state */}
                {error && (
                    <div className="mb-4 text-sm text-red-600 border border-red-200 bg-red-50 px-4 py-2 rounded-md">
                        Failed to load latest usage data: {error}
                    </div>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Tokens</p>
                                    <p className="text-2xl font-bold">
                                        {formatTokenCount(summary.totalTokens)}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {formatTokenCount(summary.totalInputTokens)} in /{" "}
                                        {formatTokenCount(summary.totalOutputTokens)} out
                                    </p>
                                </div>
                                <div className="p-3 rounded-full bg-blue-100">
                                    <Zap className="h-6 w-6 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>



                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Most Used Model
                                    </p>
                                    <p className="text-lg font-bold">{mostUsedModel}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Primary AI model
                                    </p>
                                </div>
                                <div className="p-3 rounded-full bg-purple-100">
                                    <Activity className="h-6 w-6 text-purple-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Top Request Type
                                    </p>
                                    <p className="text-sm font-bold">{mostCommonRequestType}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Most frequent operation
                                    </p>
                                </div>
                                <div className="p-3 rounded-full bg-orange-100">
                                    <TrendingUp className="h-6 w-6 text-orange-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters and Search */}
                <Card className="mb-6">
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>

                            <select
                                value={filterModel}
                                onChange={(e) => setFilterModel(e.target.value)}
                                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="">All Models</option>
                                {uniqueModels.map((model) => (
                                    <option key={model} value={model}>
                                        {model}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={filterRequestType}
                                onChange={(e) => setFilterRequestType(e.target.value)}
                                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="">All Request Types</option>
                                {uniqueRequestTypes.map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>

                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSearch("");
                                    setFilterModel("");
                                    setFilterRequestType("");
                                }}
                            >
                                Reset Filters
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Data Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>
                            Token Usage History ({sortedRecords.length} records)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {records.length === 0 && !loading ? (
                            <p className="text-sm text-muted-foreground">
                                No AI usage recorded yet. Trigger some AI actions to see
                                realtime data here.
                            </p>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b text-left text-sm text-muted-foreground">
                                                <th className="pb-3 pr-4">
                                                    <button
                                                        onClick={() => handleSort("timestamp")}
                                                        className="flex items-center gap-1 hover:text-foreground"
                                                    >
                                                        Timestamp
                                                        <ArrowUpDown className="h-3 w-3" />
                                                    </button>
                                                </th>
                                                <th className="pb-3 pr-4">
                                                    <button
                                                        onClick={() => handleSort("requestType")}
                                                        className="flex items-center gap-1 hover:text-foreground"
                                                    >
                                                        Request Type
                                                        <ArrowUpDown className="h-3 w-3" />
                                                    </button>
                                                </th>
                                                <th className="pb-3 pr-4">
                                                    <button
                                                        onClick={() => handleSort("model")}
                                                        className="flex items-center gap-1 hover:text-foreground"
                                                    >
                                                        Model
                                                        <ArrowUpDown className="h-3 w-3" />
                                                    </button>
                                                </th>
                                                <th className="pb-3 pr-4 text-right">
                                                    <button
                                                        onClick={() => handleSort("inputTokens")}
                                                        className="flex items-center gap-1 hover:text-foreground ml-auto"
                                                    >
                                                        Input Tokens
                                                        <ArrowUpDown className="h-3 w-3" />
                                                    </button>
                                                </th>
                                                <th className="pb-3 pr-4 text-right">
                                                    <button
                                                        onClick={() => handleSort("outputTokens")}
                                                        className="flex items-center gap-1 hover:text-foreground ml-auto"
                                                    >
                                                        Output Tokens
                                                        <ArrowUpDown className="h-3 w-3" />
                                                    </button>
                                                </th>
                                                <th className="pb-3 pr-4 text-right">
                                                    <button
                                                        onClick={() => handleSort("totalTokens")}
                                                        className="flex items-center gap-1 hover:text-foreground ml-auto"
                                                    >
                                                        Total
                                                        <ArrowUpDown className="h-3 w-3" />
                                                    </button>
                                                </th>

                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedRecords.map((record) => (
                                                <tr
                                                    key={record.id}
                                                    className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                                                >
                                                    <td className="py-3 pr-4 text-sm">
                                                        {new Date(record.timestamp).toLocaleString()}
                                                    </td>
                                                    <td className="py-3 pr-4">
                                                        <Badge
                                                            variant="secondary"
                                                            className={getRequestTypeColor(
                                                                record.requestType
                                                            )}
                                                        >
                                                            {record.requestType}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3 pr-4 text-sm font-mono">
                                                        {record.model}
                                                    </td>
                                                    <td className="py-3 pr-4 text-sm text-right">
                                                        {formatTokenCount(record.inputTokens)}
                                                    </td>
                                                    <td className="py-3 pr-4 text-sm text-right">
                                                        {formatTokenCount(record.outputTokens)}
                                                    </td>
                                                    <td className="py-3 pr-4 text-sm text-right font-semibold">
                                                        {formatTokenCount(record.totalTokens)}
                                                    </td>

                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between mt-6 pt-4 border-t">
                                        <p className="text-sm text-muted-foreground">
                                            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                                            {Math.min(
                                                currentPage * itemsPerPage,
                                                sortedRecords.length
                                            )}{" "}
                                            of {sortedRecords.length} records
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    setCurrentPage((p) => Math.max(1, p - 1))
                                                }
                                                disabled={currentPage === 1}
                                            >
                                                <ChevronLeft className="h-4 w-4 mr-1" />
                                                Previous
                                            </Button>
                                            <div className="flex items-center gap-1">
                                                {Array.from(
                                                    { length: Math.min(5, totalPages) },
                                                    (_, i) => {
                                                        let pageNum;
                                                        if (totalPages <= 5) {
                                                            pageNum = i + 1;
                                                        } else if (currentPage <= 3) {
                                                            pageNum = i + 1;
                                                        } else if (currentPage >= totalPages - 2) {
                                                            pageNum = totalPages - 4 + i;
                                                        } else {
                                                            pageNum = currentPage - 2 + i;
                                                        }

                                                        return (
                                                            <Button
                                                                key={pageNum}
                                                                variant={
                                                                    currentPage === pageNum
                                                                        ? "default"
                                                                        : "outline"
                                                                }
                                                                size="sm"
                                                                onClick={() => setCurrentPage(pageNum)}
                                                                className="w-8 h-8 p-0"
                                                            >
                                                                {pageNum}
                                                            </Button>
                                                        );
                                                    }
                                                )}
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    setCurrentPage((p) =>
                                                        Math.min(totalPages, p + 1)
                                                    )
                                                }
                                                disabled={currentPage === totalPages}
                                            >
                                                Next
                                                <ChevronRight className="h-4 w-4 ml-1" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
