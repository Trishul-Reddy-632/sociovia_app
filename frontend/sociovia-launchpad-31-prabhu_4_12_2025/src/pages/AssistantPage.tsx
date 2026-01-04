
import React, { useEffect, useState } from 'react';
import FloatingAssistant from './Assistant';
import { useAuth } from '@/contexts/AuthContext';

const AssistantPage = () => {
    const { user } = useAuth();
    const [workspaceId, setWorkspaceId] = useState<string | number>("");

    useEffect(() => {
        const wId = localStorage.getItem("sv_selected_workspace_id") ||
            sessionStorage.getItem("sv_selected_workspace_id");
        if (wId) {
            setWorkspaceId(wId);
        }
    }, []);

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="text-center p-8 bg-white rounded-lg shadow-sm border max-w-md mx-auto mt-20">
                    <h2 className="text-xl font-semibold mb-2">Login Required</h2>
                    <p className="text-slate-500">Please log in to access the Assistant.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-screen bg-slate-100 flex items-center justify-center">
            {/* 
         Since FloatingAssistant is a fixed position widget (usually), 
         rendering it here on an empty page might look like just a widget at the bottom.
         But that satisfies the route usage.
       */}
            <div className="text-slate-400 text-sm absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                Assistant Active (Check bottom right)
            </div>
            <FloatingAssistant
                userId={user.id}
                workspaceId={workspaceId}
            />
        </div>
    );
};

export default AssistantPage;
