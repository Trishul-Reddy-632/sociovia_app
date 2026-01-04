
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { OptimizationProvider } from './context/OptimizationContext';
import OptimizationLayout from './OptimizationLayout';

// Screens
import OptimizationEntry from './screens/Entry/OptimizationEntry';
import OptimizationWizard from './screens/Wizard/OptimizationWizard';
import LiveOptimizationDashboard from './screens/Dashboard/LiveOptimizationDashboard';
import RiskControlCenter from './screens/Risk/RiskControlCenter';
import PrivacySafety from './screens/Privacy/PrivacySafety';
import OptimizationSettings from './screens/Settings/OptimizationSettings';
import OptimizationSupport from './screens/Support/OptimizationSupport';
import OptimizationDocs from './screens/Support/OptimizationDocs';

export default function OptimizationRoot() {
    return (
        <OptimizationProvider>
            <Routes>
                {/* Public Entry - No Sidebar */}
                <Route path="/" element={<OptimizationEntry />} />

                {/* Wizard - No Sidebar (Focused Flow) */}
                <Route path="/setup" element={<OptimizationWizard />} />

                {/* Protected Hub - With Sidebar */}
                <Route element={<OptimizationLayout />}>
                    <Route path="/dashboard" element={<LiveOptimizationDashboard />} />
                    <Route path="/risk" element={<RiskControlCenter />} />
                    <Route path="/privacy" element={<PrivacySafety />} />
                    <Route path="/settings" element={<OptimizationSettings />} />
                    <Route path="/support" element={<OptimizationSupport />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </OptimizationProvider>
    );
}
