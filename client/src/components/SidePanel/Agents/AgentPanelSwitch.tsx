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
  /** Stamped onto agents created here, so a host can later filter to its own builds. */
  createdVia?: string;
}

export default function AgentPanelSwitch({
  onAgentCreated,
  createdVia,
}: AgentPanelSwitchProps = {}) {
  return (
    <AgentPanelProvider>
      <AgentPanelSwitchWithContext onAgentCreated={onAgentCreated} createdVia={createdVia} />
    </AgentPanelProvider>
  );
}

function AgentPanelSwitchWithContext({ onAgentCreated, createdVia }: AgentPanelSwitchProps) {
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
  return <AgentPanel onAgentCreated={onAgentCreated} createdVia={createdVia} />;
}
