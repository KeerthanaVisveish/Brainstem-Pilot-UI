import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Welcome from './pages/Welcome';
import AutoBuilder from './pages/AutoBuilder';
import AutoList from './pages/AutoList';
import Settings from './pages/Settings';
import StringBuilderList from './pages/StringBuilderList';
import SkeletonBuilder from './pages/SkeletonBuilder';
import ChildBuilder from './pages/ChildBuilder';
import SubsystemConfigPage from './pages/SubsystemConfigPage';
import AutoSimulator from './pages/AutoSimulator';
import Documentation from './pages/Documentation';
import { FieldConfigProvider } from './context/FieldConfigContext';
import { LeagueProvider } from './context/LeagueContext';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <LeagueProvider>
      <FieldConfigProvider>
        <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/autos" element={<AutoList />} />
      <Route path="/auto-builder/:id" element={<AutoBuilder />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/string-builder" element={<StringBuilderList />} />
      <Route path="/skeleton-builder/:id" element={<SkeletonBuilder />} />
      <Route path="/child-builder/:id" element={<ChildBuilder />} />
      <Route path="/subsystem-config" element={<SubsystemConfigPage />} />
      <Route path="/auto-simulator" element={<AutoSimulator />} />
      <Route path="/auto-simulator/:id" element={<AutoSimulator />} />
      <Route path="/docs" element={<Documentation />} />
      <Route path="*" element={<PageNotFound />} />
        </Routes>
      </FieldConfigProvider>
    </LeagueProvider>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App