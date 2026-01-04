import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, XCircle, Eye } from "lucide-react";

interface WorkflowRun {
  id: string;
  status: "queued" | "running" | "success" | "failed";
  startedAt: string;
  finishedAt?: string;
  actionsPerformed: number;
  error?: string;
}

interface WorkflowRunsTableProps {
  runs: WorkflowRun[];
  onViewRun: (runId: string) => void;
}

const statusConfig = {
  queued: { icon: Clock, color: "bg-muted text-muted-foreground", label: "Queued" },
  running: { icon: Clock, color: "bg-blue-500 text-white animate-pulse", label: "Running" },
  success: { icon: CheckCircle, color: "bg-green-500 text-white", label: "Success" },
  failed: { icon: XCircle, color: "bg-red-500 text-white", label: "Failed" },
};

export function WorkflowRunsTable({ runs, onViewRun }: WorkflowRunsTableProps) {
  if (runs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No runs yet</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Run ID</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Started</TableHead>
          <TableHead>Finished</TableHead>
          <TableHead>Actions</TableHead>
          <TableHead className="text-right">View</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => {
          const StatusIcon = statusConfig[run.status].icon;
          return (
            <TableRow key={run.id}>
              <TableCell className="font-mono text-xs">{run.id.slice(0, 8)}</TableCell>
              <TableCell>
                <Badge className={statusConfig[run.status].color}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusConfig[run.status].label}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">{new Date(run.startedAt).toLocaleString()}</TableCell>
              <TableCell className="text-sm">
                {run.finishedAt ? new Date(run.finishedAt).toLocaleString() : "-"}
              </TableCell>
              <TableCell>{run.actionsPerformed}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => onViewRun(run.id)}>
                  <Eye className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
