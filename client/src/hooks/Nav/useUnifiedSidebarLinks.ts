import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { Bot, GraduationCap, Lightbulb, MessagesSquare } from 'lucide-react';
import { useUserKeyQuery } from 'librechat-data-provider/react-query';
import {
  SystemRoles,
  EModelEndpoint,
  getConfigDefaults,
  getEndpointField,
} from 'librechat-data-provider';
import type { TEndpointsConfig } from 'librechat-data-provider';
import type { NavLink } from '~/common';
import BrainstormPanel from '~/components/Brainstorm/BrainstormPanel';
import ConversationsSection from '~/components/UnifiedSidebar/ConversationsSection';
import { useAdminAccess, useGetEndpointsQuery, useGetStartupConfig } from '~/data-provider';
import useSideNavLinks from '~/hooks/Nav/useSideNavLinks';
import { useAuthContext, useShowMarketplace } from '~/hooks';
import store from '~/store';

const defaultInterface = getConfigDefaults().interface;

export default function useUnifiedSidebarLinks() {
  const conversation = useRecoilValue(store.conversationByIndex(0));
  const endpoint = conversation?.endpoint;
  const { data: startupConfig } = useGetStartupConfig();
  const { data: endpointsConfig = {} as TEndpointsConfig } = useGetEndpointsQuery();

  const interfaceConfig = useMemo(
    () => startupConfig?.interface ?? defaultInterface,
    [startupConfig],
  );

  const endpointType = useMemo(
    () => getEndpointField(endpointsConfig, endpoint, 'type'),
    [endpoint, endpointsConfig],
  );

  const userProvidesKey = useMemo(
    () => !!(endpointsConfig?.[endpoint ?? '']?.userProvide ?? false),
    [endpointsConfig, endpoint],
  );

  const { data: keyExpiry = { expiresAt: undefined } } = useUserKeyQuery(endpoint ?? '');

  const keyProvided = useMemo(
    () => (userProvidesKey ? !!(keyExpiry.expiresAt ?? '') : true),
    [keyExpiry.expiresAt, userProvidesKey],
  );

  const sideNavLinks = useSideNavLinks({
    keyProvided,
    endpoint,
    endpointType,
    interfaceConfig,
    endpointsConfig,
    includeHidePanel: false,
  });

  const brainstormEnabled = startupConfig?.brainstormRoomsEnabled === true;
  const showAgentMarketplace = useShowMarketplace();
  /**
   * The sidebar mounts for everyone, so asking the server about admin capabilities
   * unconditionally costs every student a 403 on first page load. Users left on the
   * default role hold none of them; anyone on ADMIN or a custom role still asks.
   */
  const { user } = useAuthContext();
  const { hasAdminAccess } = useAdminAccess(user != null && user.role !== SystemRoles.USER);

  const links = useMemo(() => {
    const conversationLink: NavLink = {
      title: 'com_ui_chat_history',
      label: '',
      icon: MessagesSquare,
      id: 'conversations',
      Component: ConversationsSection,
    };
    const brainstormLink: NavLink | null = brainstormEnabled
      ? {
          title: 'com_ui_rooms',
          label: '',
          icon: Lightbulb,
          id: 'brainstorm',
          Component: BrainstormPanel,
        }
      : null;
    const agentsLink: NavLink | null = showAgentMarketplace
      ? {
          title: 'com_ui_agents',
          label: '',
          icon: Bot,
          id: 'agents-home',
          href: '/agents',
        }
      : null;
    /** Only rendered for capability holders — the route it points at 403s for everyone else. */
    const adminLink: NavLink | null = hasAdminAccess
      ? {
          title: 'com_ui_admin_dashboard',
          label: '',
          icon: GraduationCap,
          id: 'admin-dashboard',
          href: '/admin',
        }
      : null;
    const panelLinks = sideNavLinks.filter((link) => link.id !== EModelEndpoint.agents);

    return [
      conversationLink,
      ...(brainstormLink ? [brainstormLink] : []),
      ...(agentsLink ? [agentsLink] : []),
      ...(adminLink ? [adminLink] : []),
      ...panelLinks,
    ];
  }, [sideNavLinks, brainstormEnabled, showAgentMarketplace, hasAdminAccess]);

  return links;
}
