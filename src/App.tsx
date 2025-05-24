
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ChatProvider } from "@/contexts/ChatContext";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import BuyCredits from "./pages/BuyCredits";
import Usage from "./pages/Usage";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import PDFUpload from "./pages/PDFUpload";
import PDFAnalysis from "./pages/PDFAnalysis";
import PDFList from "./pages/PDFList";
import SocialMedia from "./pages/SocialMedia";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ChatProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/buy-credits" element={<BuyCredits />} />
              <Route path="/usage" element={<Usage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/pdf-upload" element={<PDFUpload />} />
              <Route path="/pdf-analysis/:id" element={<PDFAnalysis />} />
              <Route path="/pdf-list" element={<PDFList />} />
              <Route path="/social-media" element={<SocialMedia />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ChatProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
