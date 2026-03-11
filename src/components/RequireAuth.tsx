import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface RequireAuthProps {
    children: React.ReactNode;
    onLoginRequired?: () => void;
}

export default function RequireAuth({ children, onLoginRequired }: RequireAuthProps) {
    const { isAuthenticated, loading } = useAuth();
    const location = useLocation();

    useEffect(() => {
        if (!loading && !isAuthenticated && onLoginRequired) {
            onLoginRequired();
        }
    }, [isAuthenticated, loading, onLoginRequired]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gaming-accent"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        // Drop them on the home page smoothly; the useEffect catches this state and fires the Modal
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}
