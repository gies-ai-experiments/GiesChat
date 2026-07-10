import { memo, useCallback } from 'react';
import * as Menu from '@ariakit/react/menu';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from '@librechat/client';
import { Ellipsis, LayoutGrid, Plug } from 'lucide-react';
import { useLocalize, useShowMarketplace } from '~/hooks';

function More({
  hasPluginsPanel,
  onOpenPlugins,
  onCollapse,
}: {
  hasPluginsPanel: boolean;
  onOpenPlugins: () => void;
  onCollapse?: () => void;
}) {
  const localize = useLocalize();
  const navigate = useNavigate();
  const showAgentMarketplace = useShowMarketplace();
  const isSmallScreen = useMediaQuery('(max-width: 768px)');

  const openMarketplace = useCallback(() => {
    navigate('/agents');
    if (isSmallScreen) {
      onCollapse?.();
    }
  }, [navigate, isSmallScreen, onCollapse]);

  if (!showAgentMarketplace && !hasPluginsPanel) {
    return null;
  }

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
        {showAgentMarketplace && (
          <Menu.MenuItem
            onClick={openMarketplace}
            className="select-item text-sm"
            data-testid="nav-more-marketplace"
          >
            <LayoutGrid className="icon-md" aria-hidden="true" />
            {localize('com_agents_marketplace')}
          </Menu.MenuItem>
        )}
        {hasPluginsPanel && (
          <Menu.MenuItem
            onClick={onOpenPlugins}
            className="select-item text-sm"
            data-testid="nav-more-plugins"
          >
            <Plug className="icon-md" aria-hidden="true" />
            {localize('com_ui_plugins')}
          </Menu.MenuItem>
        )}
      </Menu.Menu>
    </Menu.MenuProvider>
  );
}

export default memo(More);
