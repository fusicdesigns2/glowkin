
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  const isPDFRoute = location.pathname.includes('pdf');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-lg shadow-md p-8 text-center max-w-md w-full">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-6">Page not found</p>
        
        {isPDFRoute && (
          <div className="mb-6">
            <div className="flex justify-center mb-4">
              <FileText className="h-12 w-12 text-blue-600" />
            </div>
            <p className="text-gray-600 mb-4">
              Looking for our PDF Content Gather feature? You might need to:
            </p>
            <ul className="text-left text-gray-600 mb-4 space-y-2 pl-5 list-disc">
              <li>Log in to access your PDFs</li>
              <li>Upload a PDF first before viewing analysis</li>
              <li>Check your URL parameters</li>
            </ul>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Button asChild>
            <Link to="/">Return to Home</Link>
          </Button>
          
          {isPDFRoute && (
            <>
              <Button variant="outline" asChild>
                <Link to="/pdf-upload">Upload PDF</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/pdf-list">View My PDFs</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotFound;
