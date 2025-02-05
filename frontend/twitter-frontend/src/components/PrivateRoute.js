import { Navigate, useLocation } from 'react-router-dom';

function PrivateRoute({ children }) {
  const isAuthenticated = !!localStorage.getItem('user_id');
  const location = useLocation();

  if (!isAuthenticated) {
    // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Kullanıcı giriş yapmışsa içeriği göster
  return children;
}

export default PrivateRoute; 