import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="route-loader">
        <div className="route-loader__card">
          <span className="route-loader__eyebrow">AI Escape Room</span>
          <h2>Loading secure session</h2>
          <p>Preparing the room and restoring your progress.</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
