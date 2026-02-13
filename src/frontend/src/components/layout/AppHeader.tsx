import { Link, useNavigate } from '@tanstack/react-router';
import { MessageSquare, Calendar, Shield } from 'lucide-react';
import LoginButton from '../auth/LoginButton';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useIsAdmin } from '../../hooks/useIsAdmin';

export default function AppHeader() {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const { data: isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const isAuthenticated = !!identity;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img
              src="/assets/generated/chatbot-mascot.dim_512x512.png"
              alt="ServiceBot"
              className="h-10 w-10 rounded-full"
            />
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg text-foreground">ServiceBot</span>
              <span className="text-xs text-muted-foreground">Instant Home Services</span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => navigate({ to: '/' })}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              Book Service
            </button>
            {isAuthenticated && (
              <button
                onClick={() => navigate({ to: '/bookings' })}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Calendar className="h-4 w-4" />
                My Bookings
              </button>
            )}
            {isAuthenticated && !isAdminLoading && isAdmin && (
              <button
                onClick={() => navigate({ to: '/admin' })}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Shield className="h-4 w-4" />
                Admin
              </button>
            )}
          </nav>
        </div>
        <LoginButton />
      </div>
    </header>
  );
}
