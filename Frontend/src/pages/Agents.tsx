import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Play } from 'lucide-react';
import { useActivity } from '@/contexts/ActivityContext';
import { toast } from 'sonner';

type AgentStatus = 'Idle' | 'Running' | 'Completed';

interface Agent {
  id: string;
  name: string;
  description: string;
  status: AgentStatus;
}

const Agents = () => {
  const { addActivity } = useActivity();
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: '1',
      name: 'Sales Agent',
      description: 'Analyzes RFP documents and extracts key requirements, deadlines, and scope information.',
      status: 'Idle',
    },
    {
      id: '2',
      name: 'Technical Agent',
      description: 'Evaluates technical specifications and matches them with available product catalogs and solutions.',
      status: 'Idle',
    },
    {
      id: '3',
      name: 'Pricing Agent',
      description: 'Calculates pricing based on product SKUs, quantities, and testing requirements.',
      status: 'Idle',
    },
    {
      id: '4',
      name: 'Main Orchestrator',
      description: 'Coordinates all agents and manages the overall RFP workflow from start to finish.',
      status: 'Idle',
    },
  ]);

  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case 'Idle':
        return 'bg-gray-500/20 text-gray-700 border-gray-500/50';
      case 'Running':
        return 'bg-blue-500/20 text-blue-700 border-blue-500/50';
      case 'Completed':
        return 'bg-green-500/20 text-green-700 border-green-500/50';
      default:
        return '';
    }
  };

  const handleRunAgent = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    // Set to Running
    setAgents(agents.map(a => 
      a.id === agentId ? { ...a, status: 'Running' as AgentStatus } : a
    ));

    toast.info(`${agent.name} started`);
    addActivity('Agent Started', `${agent.name} is now running`);

    // Simulate completion after 2 seconds
    setTimeout(() => {
      setAgents(agents.map(a => 
        a.id === agentId ? { ...a, status: 'Completed' as AgentStatus } : a
      ));
      toast.success(`${agent.name} completed`);
      addActivity('Agent Completed', `${agent.name} finished successfully`);
    }, 2000);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-heading font-bold">AI Agents</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Intelligent automation for your RFP workflow
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {agents.map((agent) => (
            <Card key={agent.id} className="shadow-medium hover:shadow-strong transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent">
                      <Bot className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="font-heading">{agent.name}</CardTitle>
                    </div>
                  </div>
                  <Badge className={getStatusColor(agent.status)} variant="outline">
                    {agent.status}
                  </Badge>
                </div>
                <CardDescription className="mt-2">{agent.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => handleRunAgent(agent.id)}
                  disabled={agent.status === 'Running'}
                  className="w-full gap-2"
                  variant={agent.status === 'Completed' ? 'secondary' : 'default'}
                >
                  <Play className="h-4 w-4" />
                  {agent.status === 'Running' ? 'Running...' : 'Run Agent'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Agents;
