
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { FileText, Upload } from "lucide-react";
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
        
        {/* Make PDF upload section more prominent */}
        <div className="mb-6">
          <div className="flex justify-center mb-4">
            <FileText className="h-12 w-12 text-blue-600" />
          </div>
          <p className="text-gray-600 mb-4">
            Try our PDF Content Gather feature to extract content from PDF designs:
          </p>
          <div className="flex justify-center mb-4">
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link to="/pdf-upload" className="flex items-center">
                <Upload className="mr-2 h-4 w-4" />
                Upload PDF Now
              </Link>
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Button asChild>
            <Link to="/">Return to Home</Link>
          </Button>
          
          <Button variant="outline" asChild>
            <Link to="/pdf-upload" className="flex items-center">
              <Upload className="mr-2 h-4 w-4" />
              Upload PDF
            </Link>
          </Button>
          
          {isPDFRoute && (
            <Button variant="outline" asChild>
              <Link to="/pdf-list" className="flex items-center">
                <FileText className="mr-2 h-4 w-4" />
                View My PDFs
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotFound;
