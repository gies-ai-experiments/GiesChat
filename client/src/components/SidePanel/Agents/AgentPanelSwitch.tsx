import { useEffect } from 'react';
import { useRecoilValue } from 'recoil';
import { AgentPanelProvider, useAgentPanelContext } from '~/Providers/AgentPanelContext';
import { Panel, isEphemeralAgent } from '~/common';
import VersionPanel from './Version/VersionPanel';
import AgentPanel from './AgentPanel';
import store from '~/store';

interface AgentPanelSwitchProps {
  /** Fired after an agent is created, so a host (e.g. a dialog) can react. */
  onAgentCreated?: (agentId: string) => void;
}

export default function AgentPanelSwitch({ onAgentCreated }: AgentPanelSwitchProps = {}) {
  return (
    <AgentPanelProvider>
      <AgentPanelSwitchWithContext onAgentCreated={onAgentCreated} />
    </AgentPanelProvider>
  );
}

function AgentPanelSwitchWithContext({ onAgentCreated }: AgentPanelSwitchProps) {
  const { activePanel, setCurrentAgentId } = useAgentPanelContext();
  const agentId = useRecoilValue(store.conversationAgentIdByIndex(0));

  useEffect(() => {
    const agent_id = agentId ?? '';
    if (!isEphemeralAgent(agent_id)) {
      setCurrentAgentId(agent_id);
    }
  }, [setCurrentAgentId, agentId]);

  if (activePanel === Panel.version) {
    return <VersionPanel />;
  }
  return <AgentPanel onAgentCreated={onAgentCreated} />;
}
