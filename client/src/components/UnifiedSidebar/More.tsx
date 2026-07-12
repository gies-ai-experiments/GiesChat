import { memo, useCallback } from 'react';
import * as Menu from '@ariakit/react/menu';
import { useMediaQuery } from '@librechat/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { Ellipsis, Compass } from 'lucide-react';
import { TOUR_REPLAY_KEY, TOUR_REPLAY_EVENT } from '~/components/Tour';
import { useLocalize } from '~/hooks';

function More({ onCollapse }: { onCollapse?: () => void }) {
  const localize = useLocalize();
  const navigate = useNavigate();
  const location = useLocation();
  const isSmallScreen = useMediaQuery('(max-width: 768px)');

  const startTour = useCallback(() => {
    if (location.pathname.startsWith('/c/')) {
      window.dispatchEvent(new Event(TOUR_REPLAY_EVENT));
    } else {
      sessionStorage.setItem(TOUR_REPLAY_KEY, '1');
      navigate('/c/new');
    }
    if (isSmallScreen) {
      onCollapse?.();
    }
  }, [location.pathname, navigate, isSmallScreen, onCollapse]);

  return (
    <Menu.MenuProvider placement="right-start">
      <Menu.MenuButton
        aria-label={localize('com_ui_more')}
        data-testid="nav-more-button"
        title={localize('com_ui_more')}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-active-alt aria-[expanded=true]:bg-surface-active-alt"
      >
        <Ellipsis className="h-5 w-5" aria-hidden="true" />
      </Menu.MenuButton>
      <Menu.Menu portal gutter={8} className="popover-ui z-[126] w-[220px] rounded-lg">
        <Menu.MenuItem
          onClick={startTour}
          className="select-item text-sm"
          data-testid="nav-more-tour"
        >
          <Compass className="icon-md" aria-hidden="true" />
          {localize('com_ui_tour_replay')}
        </Menu.MenuItem>
      </Menu.Menu>
    </Menu.MenuProvider>
  );
}

export default memo(More);
