import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { buildLoginRedirectUrl } from 'librechat-data-provider';
import { useAuthContext } from '~/hooks';

/** Plain "opened the app" locations — signed-out visitors land on the public
 *  welcome page instead of the login flow; deep links keep the login redirect */
const DEFAULT_ENTRY_PATHS = new Set(['/', '/c/new']);

export default function useAuthRedirect() {
  const { user, roles, isAuthenticated } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isAuthenticated) {
        return;
      }

      const isDefaultEntry =
        DEFAULT_ENTRY_PATHS.has(location.pathname) && !location.search && !location.hash;

      navigate(
        isDefaultEntry
          ? '/welcome'
          : buildLoginRedirectUrl(location.pathname, location.search, location.hash),
        {
          replace: true,
        },
      );
    }, 300);

    return () => {
      clearTimeout(timeout);
    };
  }, [isAuthenticated, navigate, location]);

  return {
    user,
    roles,
    isAuthenticated,
  };
}
