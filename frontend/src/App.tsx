import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ProjectLayout } from './components/ProjectLayout';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectOverviewPage } from './pages/ProjectOverviewPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ReviewCentrePage } from './pages/ReviewCentrePage';
import { RisksPage } from './pages/RisksPage';
import { KnowledgeGapsPage } from './pages/KnowledgeGapsPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { CopilotPage } from './pages/CopilotPage';
import { HandoverPage } from './pages/HandoverPage';
import { MembersPage } from './pages/MembersPage';
import { AuditPage } from './pages/AuditPage';
import { SettingsPage } from './pages/SettingsPage';
import { InviteAcceptPage } from './pages/InviteAcceptPage';
import { ResponsibilitiesPage } from './pages/ResponsibilitiesPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F6F1] dark:bg-[#111827]">
        <div className="text-xs font-bold uppercase tracking-widest text-[#B9825A] animate-pulse">
          Loading Workspace...
        </div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const AppContent: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-[#F8F6F1] dark:bg-[#111827] text-[#151923] dark:text-white transition-colors">
        <Navbar />
        <div className="flex-1">
          <Routes>
            {/* Public Pages */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/invite" element={<InviteAcceptPage />} />

            {/* Authenticated Dashboard & Settings */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            {/* Authenticated Project Workspace & 10 Core Engines */}
            <Route
              path="/projects/:projectId"
              element={
                <ProtectedRoute>
                  <ProjectLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ProjectOverviewPage />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="responsibilities" element={<ResponsibilitiesPage />} />
              <Route path="review" element={<ReviewCentrePage />} />
              <Route path="risks" element={<RisksPage />} />
              <Route path="gaps" element={<KnowledgeGapsPage />} />
              <Route path="simulator" element={<SimulatorPage />} />
              <Route path="copilot" element={<CopilotPage />} />
              <Route path="handover" element={<HandoverPage />} />
              <Route path="members" element={<MembersPage />} />
              <Route path="audit" element={<AuditPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
