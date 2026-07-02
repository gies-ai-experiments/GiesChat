import { memo, useContext, useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { ThemeContext, isDark, useMediaQuery } from '@librechat/client';
import { getConfigDefaults, PermissionTypes, Permissions } from 'librechat-data-provider';
import ModelSelector from './Menus/Endpoints/ModelSelector';
import { useGetStartupConfig } from '~/data-provider';
import ExportAndShareMenu from './ExportAndShareMenu';
import { OpenSidebar, PresetsMenu } from './Menus';
import BookmarkMenu from './Menus/BookmarkMenu';
import { TemporaryChat } from './TemporaryChat';
import AddMultiConvo from './AddMultiConvo';
import { useHasAccess } from '~/hooks';
import { cn } from '~/utils';
import store from '~/store';

const defaultInterface = getConfigDefaults().interface;

function Header() {
  const { data: startupConfig } = useGetStartupConfig();
  const navVisible = useRecoilValue(store.sidebarExpanded);
  const { theme, setTheme } = useContext(ThemeContext);
  const isDarkTheme = isDark(theme);

  const interfaceConfig = useMemo(
    () => startupConfig?.interface ?? defaultInterface,
    [startupConfig],
  );

  const hasAccessToBookmarks = useHasAccess({
    permissionType: PermissionTypes.BOOKMARKS,
    permission: Permissions.USE,
  });

  const hasAccessToMultiConvo = useHasAccess({
    permissionType: PermissionTypes.MULTI_CONVO,
    permission: Permissions.USE,
  });

  const hasAccessToTemporaryChat = useHasAccess({
    permissionType: PermissionTypes.TEMPORARY_CHAT,
    permission: Permissions.USE,
  });

  const isSmallScreen = useMediaQuery('(max-width: 768px)');
  const nextTheme = isDarkTheme ? 'light' : 'dark';
  const backgroundToggleLabel = isDarkTheme ? 'White background' : 'Black background';

  return (
    <div className="via-presentation/70 md:from-presentation/80 md:via-presentation/50 2xl:from-presentation/0 absolute top-0 z-10 flex h-[52px] w-full items-center justify-between bg-gradient-to-b from-presentation to-transparent p-2 font-semibold text-text-primary 2xl:via-transparent">
      <div className="hide-scrollbar flex w-full items-center justify-between gap-2 overflow-x-auto">
        <div className="mx-1 flex items-center">
          {isSmallScreen ? <OpenSidebar /> : null}
          {!(navVisible && isSmallScreen) && (
            <div
              className={cn(
                'flex items-center gap-2 pl-2',
                !isSmallScreen ? 'transition-all duration-200 ease-in-out' : '',
              )}
            >
              <ModelSelector startupConfig={startupConfig} />
              {interfaceConfig.presets === true && interfaceConfig.modelSelect && <PresetsMenu />}
              {hasAccessToBookmarks === true && <BookmarkMenu />}
              {hasAccessToMultiConvo === true && <AddMultiConvo />}
              {isSmallScreen && (
                <>
                  <button
                    type="button"
                    aria-label={`Switch to ${backgroundToggleLabel}`}
                    title={`Switch to ${backgroundToggleLabel}`}
                    onClick={() => setTheme(nextTheme)}
                    className={cn(
                      'h-9 shrink-0 rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--illini-orange)]',
                      isDarkTheme
                        ? 'border-white/40 bg-white text-black hover:bg-white/90'
                        : 'border-black/20 bg-black text-white hover:bg-[var(--illini-blue)]',
                    )}
                  >
                    {isDarkTheme ? 'White' : 'Black'}
                  </button>
                  <ExportAndShareMenu
                    isSharedButtonEnabled={startupConfig?.sharedLinksEnabled ?? false}
                  />
                  {hasAccessToTemporaryChat === true && <TemporaryChat />}
                </>
              )}
            </div>
          )}
        </div>

        {!isSmallScreen && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={`Switch to ${backgroundToggleLabel}`}
              title={`Switch to ${backgroundToggleLabel}`}
              onClick={() => setTheme(nextTheme)}
              className={cn(
                'h-9 rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--illini-orange)]',
                isDarkTheme
                  ? 'border-white/40 bg-white text-black hover:bg-white/90'
                  : 'border-black/20 bg-black text-white hover:bg-[var(--illini-blue)]',
              )}
            >
              {backgroundToggleLabel}
            </button>
            <ExportAndShareMenu
              isSharedButtonEnabled={startupConfig?.sharedLinksEnabled ?? false}
            />
            {hasAccessToTemporaryChat === true && <TemporaryChat />}
          </div>
        )}
      </div>
      {/* Empty div for spacing */}
      <div />
    </div>
  );
}

const MemoizedHeader = memo(Header);
MemoizedHeader.displayName = 'Header';

export default MemoizedHeader;
