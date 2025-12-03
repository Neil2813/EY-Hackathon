import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, FileText, DollarSign, User, LogIn, LogOut, Workflow as WorkflowIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export const Navbar = () => {
  const { isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-lg shadow-soft">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Title */}
          <Link to="/" className="flex items-center space-x-2">
            <h1 className="text-2xl font-heading font-bold tracking-wide hover:opacity-80 transition-opacity">
              Phoenix RFP Xcelerator
            </h1>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-1">
            {isLoggedIn && (
              <>
                <Link to="/dashboard">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className={`gap-2 ${isActive('/dashboard') ? 'bg-accent text-accent-foreground' : ''}`}
                  >
                    <Home className="h-4 w-4" />
                    <span className="hidden md:inline">Dashboard</span>
                  </Button>
                </Link>
                
                <Link to="/workflow">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className={`gap-2 ${isActive('/workflow') ? 'bg-accent text-accent-foreground' : ''}`}
                  >
                    <WorkflowIcon className="h-4 w-4" />
                    <span className="hidden md:inline">Workflow</span>
                  </Button>
                </Link>
                
                <Link to="/profile">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className={`gap-2 ${isActive('/profile') ? 'bg-accent text-accent-foreground' : ''}`}
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden md:inline">Profile</span>
                  </Button>
                </Link>
              </>
            )}

            {/* Auth Button */}
            {isLoggedIn ? (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="gap-2 ml-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            ) : (
              <Link to="/login">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="gap-2 ml-2"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden md:inline">Login</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
