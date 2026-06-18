import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Spinner } from "@/components/ui/primitives";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import Documents from "@/pages/Documents";
import Chat from "@/pages/Chat";
import Valuation from "@/pages/Valuation";
import Ratios from "@/pages/Ratios";
import Competitors from "@/pages/Competitors";
import Sentiment from "@/pages/Sentiment";
import Portfolio from "@/pages/Portfolio";

function FullScreenLoader() {
  return (
    <div className="grid min-h-screen place-items-center">
      <Spinner className="h-8 w-8 text-brand" />
    </div>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/valuation" element={<Valuation />} />
        <Route path="/ratios" element={<Ratios />} />
        <Route path="/competitors" element={<Competitors />} />
        <Route path="/sentiment" element={<Sentiment />} />
        <Route path="/portfolio" element={<Portfolio />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
