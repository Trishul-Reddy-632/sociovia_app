import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      {/* Emoji / Icon */}
      <div className="text-6xl mb-6 animate-bounce">🚧</div>

      {/* Heading */}
      <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-4">
        404 - Not Found
      </h1>

      {/* Subtext */}
      <p className="text-lg text-gray-600 mb-8 max-w-md text-center">
        Oops! The page you’re looking for doesn’t exist or has been moved.  
        Let’s get you back on track.
      </p>

      {/* CTA Button */}
      <Link to="/">
        <Button size="lg" className="rounded-2xl shadow-md hover:shadow-lg transition">
          ⬅ Go Back Home
        </Button>
      </Link>

      {/* Fun extra message */}
      <p className="mt-6 text-sm text-gray-400 italic">
        Lost? Don’t worry, even the best explorers get stuck sometimes. 🧭
      </p>
    </div>
  );
};

export default NotFound;
