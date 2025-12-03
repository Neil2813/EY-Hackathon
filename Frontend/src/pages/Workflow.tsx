import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Play, 
  Loader2,
  FileText,
  Search,
  Settings,
  Calculator,
  Package,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface WorkflowStep {
  step_name: string;
  agent_name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  output?: any;
  summary?: string;
  error?: string;
}

interface WorkflowProgress {
  workflow_id: string;
  current_step: number;
  total_steps: number;
  steps: WorkflowStep[];
  final_response?: any;
}

const Workflow = () => {
  const [mode, setMode] = useState<'discovery' | 'upload'>('discovery');
  const [workflow, setWorkflow] = useState<WorkflowProgress | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any | null>(null);

  const startWorkflow = async () => {
    setUploadResult(null);
    setIsStarting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/rfp/workflow/start`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to start workflow');
      const data = await response.json();
      setWorkflow(data);
      toast.success('Workflow started successfully');
    } catch (error) {
      toast.error('Failed to start workflow');
      console.error(error);
    } finally {
      setIsStarting(false);
    }
  };

  const executeStep = async () => {
    if (!workflow) return;
    
    setIsExecuting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/rfp/workflow/${workflow.workflow_id}/execute`,
        {
          method: 'POST',
        }
      );
      if (!response.ok) throw new Error('Failed to execute workflow step');
      const data = await response.json();
      setWorkflow(data);
      
      // Check if workflow is complete
      if (data.final_response) {
        toast.success('Workflow completed successfully!');
      } else {
        toast.success('Step completed');
      }
    } catch (error: any) {
      toast.error(`Workflow execution failed: ${error.message}`);
      console.error(error);
      // Refresh workflow to get error status
      if (workflow) {
        fetchWorkflow(workflow.workflow_id);
      }
    } finally {
      setIsExecuting(false);
    }
  };

  const saveResultToHistory = (pdfName: string, response: any) => {
    try {
      const key = 'rfpResults';
      const existingRaw = localStorage.getItem(key);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const entry = {
        id: `${Date.now()}`,
        timestamp: new Date().toISOString(),
        pdfName,
        response,
      };
      const updated = [entry, ...existing].slice(0, 50);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save result history', err);
    }
  };

  useEffect(() => {
    if (workflow?.final_response) {
      saveResultToHistory('AUTO-DISCOVERY', workflow.final_response);
    }
  }, [workflow?.final_response]);

  const handleUploadAndRun = async () => {
    if (!uploadFile) {
      toast.error('Please select a PDF file first');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await fetch(`${API_BASE_URL}/api/v1/rfp/auto-bid-upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to run auto-bid on uploaded PDF');
      }

      const data = await response.json();
      setUploadResult(data);
      saveResultToHistory(uploadFile.name, data);
      toast.success('Upload workflow completed successfully!');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Upload workflow failed');
    } finally {
      setIsUploading(false);
    }
  };

  const fetchWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/rfp/workflow/${workflowId}`);
      if (!response.ok) throw new Error('Failed to fetch workflow');
      const data = await response.json();
      setWorkflow(data);
    } catch (error) {
      console.error(error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/50">Completed</Badge>;
      case 'running':
        return <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/50">Running</Badge>;
      case 'error':
        return <Badge className="bg-red-500/20 text-red-700 border-red-500/50">Error</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-700 border-gray-500/50">Pending</Badge>;
    }
  };

  const getAgentIcon = (agentName: string) => {
    switch (agentName) {
      case 'Sales Agent':
        return <Search className="h-4 w-4" />;
      case 'Technical Agent':
        return <Package className="h-4 w-4" />;
      case 'Pricing Agent':
        return <Calculator className="h-4 w-4" />;
      case 'Main Agent':
        return <Settings className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const progressPercentage = workflow
    ? (workflow.current_step / workflow.total_steps) * 100
    : 0;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-heading font-bold">RFP Workflow</h1>
            <p className="text-muted-foreground mt-2">
              End-to-end agentic AI workflow for RFP response generation
            </p>
          </div>
        </div>

        <Tabs value={mode} onValueChange={(val) => setMode(val as 'discovery' | 'upload')}>
          <TabsList>
            <TabsTrigger value="discovery">Auto-Discovery (Sales Agent)</TabsTrigger>
            <TabsTrigger value="upload">Upload PDF</TabsTrigger>
          </TabsList>

          <TabsContent value="discovery" className="space-y-6">
            <div className="flex items-center justify-end">
              {!workflow && (
                <Button onClick={startWorkflow} disabled={isStarting} size="lg">
                  {isStarting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Start Workflow
                    </>
                  )}
                </Button>
              )}
            </div>

            {workflow && (
          <>
            {/* Progress Overview */}
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="font-heading">Workflow Progress</CardTitle>
                <CardDescription>
                  Workflow ID: {workflow.workflow_id}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{workflow.current_step} / {workflow.total_steps} steps</span>
                  </div>
                  <Progress value={progressPercentage} className="h-3" />
                </div>
                {workflow.final_response && (
                  <Alert className="bg-green-500/10 border-green-500/50">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertTitle>Workflow Completed!</AlertTitle>
                    <AlertDescription>
                      Total Bid Value: ₹{workflow.final_response.total_bid_value?.toLocaleString() || '0'}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Workflow Steps */}
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="font-heading">Workflow Steps</CardTitle>
                <CardDescription>
                  Step-by-step execution of the agentic AI pipeline
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workflow.steps.map((step, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        step.status === 'running'
                          ? 'border-blue-500 bg-blue-50/50'
                          : step.status === 'completed'
                          ? 'border-green-500 bg-green-50/50'
                          : step.status === 'error'
                          ? 'border-red-500 bg-red-50/50'
                          : 'border-gray-200 bg-gray-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="mt-1">
                            {getStatusIcon(step.status)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{step.step_name}</h3>
                              {getStatusBadge(step.status)}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              {getAgentIcon(step.agent_name)}
                              <span>{step.agent_name}</span>
                            </div>
                            {step.summary && (
                              <p className="text-sm text-muted-foreground mb-2">{step.summary}</p>
                            )}
                            {step.error && (
                              <Alert className="mt-2 bg-red-50 border-red-200">
                                <AlertCircle className="h-4 w-4 text-red-500" />
                                <AlertDescription className="text-red-700">
                                  {step.error}
                                </AlertDescription>
                              </Alert>
                            )}
                            {step.output && step.status === 'completed' && (
                              <div className="mt-3 p-3 bg-white rounded border text-sm">
                                <pre className="whitespace-pre-wrap text-xs">
                                  {JSON.stringify(step.output, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            {!workflow.final_response && (
              <Card className="shadow-medium">
                <CardContent className="pt-6">
                  <div className="flex justify-end gap-3">
                    <Button
                      onClick={executeStep}
                      disabled={isExecuting || workflow.current_step >= workflow.total_steps}
                      size="lg"
                    >
                      {isExecuting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Executing...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Execute Next Step
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Final Response */}
            {workflow.final_response && (
              <Card className="shadow-medium">
                <CardHeader>
                  <CardTitle className="font-heading">Final RFP Response</CardTitle>
                  <CardDescription>Complete RFP response generated by the agents</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList>
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="technical">Technical Matching</TabsTrigger>
                      <TabsTrigger value="pricing">Pricing</TabsTrigger>
                      <TabsTrigger value="summary">Summary</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="overview" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">RFP ID</p>
                          <p className="font-semibold">{workflow.final_response.rfp_id}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Title</p>
                          <p className="font-semibold">{workflow.final_response.rfp_title}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Due Date</p>
                          <p className="font-semibold">{workflow.final_response.rfp_due_date}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Bid Value</p>
                          <p className="font-semibold text-lg text-green-600">
                            ₹{workflow.final_response.total_bid_value?.toLocaleString() || '0'}
                          </p>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Scope of Supply</p>
                        <p className="text-sm whitespace-pre-wrap">{workflow.final_response.scope_of_supply}</p>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="technical" className="space-y-4">
                      {workflow.final_response.technical_items?.map((item: any, idx: number) => (
                        <Card key={idx}>
                          <CardHeader>
                            <CardTitle className="text-lg">{item.rfp_item?.description}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm text-muted-foreground">Selected SKU</p>
                                <p className="font-semibold">{item.chosen_sku || 'N/A'}</p>
                              </div>
                              {item.top_matches && item.top_matches.length > 0 && (
                                <div>
                                  <p className="text-sm text-muted-foreground mb-2">Top Matches</p>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>SKU</TableHead>
                                        <TableHead>Match %</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {item.top_matches.map((match: any, midx: number) => (
                                        <TableRow key={midx}>
                                          <TableCell>{match.sku}</TableCell>
                                          <TableCell>{match.match_percent}%</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </TabsContent>
                    
                    <TabsContent value="pricing" className="space-y-4">
                      {workflow.final_response.pricing?.items?.map((item: any, idx: number) => (
                        <Card key={idx}>
                          <CardHeader>
                            <CardTitle className="text-lg">{item.rfp_item?.description}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">SKU</p>
                                <p className="font-semibold">{item.chosen_sku}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Quantity</p>
                                <p className="font-semibold">{item.quantity}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Unit Price</p>
                                <p className="font-semibold">₹{item.unit_price?.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Material Cost</p>
                                <p className="font-semibold">₹{item.material_cost?.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Tests Cost</p>
                                <p className="font-semibold">₹{item.tests_cost?.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Total Cost</p>
                                <p className="font-semibold text-lg text-green-600">
                                  ₹{item.total_cost?.toLocaleString()}
                                </p>
                              </div>
                            </div>
                            {item.tests_applied && item.tests_applied.length > 0 && (
                              <div className="mt-4">
                                <p className="text-sm text-muted-foreground mb-2">Tests Applied</p>
                                <div className="flex flex-wrap gap-2">
                                  {item.tests_applied.map((test: string, tidx: number) => (
                                    <Badge key={tidx} variant="outline">{test}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      <Card className="bg-green-50 border-green-200">
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-center">
                            <p className="text-lg font-semibold">Total Bid Value</p>
                            <p className="text-2xl font-bold text-green-600">
                              ₹{workflow.final_response.total_bid_value?.toLocaleString() || '0'}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    
                    <TabsContent value="summary" className="space-y-4">
                      {workflow.final_response.narrative_summary && (
                        <Card>
                          <CardHeader>
                            <CardTitle>Narrative Summary</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="whitespace-pre-wrap text-sm">
                              {workflow.final_response.narrative_summary}
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </>
        )}

            {!workflow && (
              <Card className="shadow-medium">
                <CardContent className="py-12 text-center">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Active Workflow</h3>
                  <p className="text-muted-foreground mb-6">
                    Start a new workflow to begin the RFP response generation process
                  </p>
                  <Button onClick={startWorkflow} disabled={isStarting} size="lg">
                    {isStarting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Start Workflow
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="font-heading">Upload RFP PDF</CardTitle>
                <CardDescription>
                  Upload a single RFP PDF to run the full Sales / Technical / Pricing workflow using the LLM parser.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-accent-foreground hover:file:bg-accent/80"
                />
                <Button onClick={handleUploadAndRun} disabled={isUploading || !uploadFile} size="lg">
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Upload & Run Workflow
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {uploadResult && (
              <Card className="shadow-medium">
                <CardHeader>
                  <CardTitle className="font-heading">Uploaded PDF - RFP Response</CardTitle>
                  <CardDescription>Outcome of the agents for the uploaded PDF</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList>
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="technical">Technical Matching</TabsTrigger>
                      <TabsTrigger value="pricing">Pricing</TabsTrigger>
                      <TabsTrigger value="summary">Summary</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">RFP ID</p>
                          <p className="font-semibold">{uploadResult.rfp_id}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Title</p>
                          <p className="font-semibold">{uploadResult.rfp_title}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Due Date</p>
                          <p className="font-semibold">{uploadResult.rfp_due_date}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Bid Value</p>
                          <p className="font-semibold text-lg text-green-600">
                            ₹{uploadResult.total_bid_value?.toLocaleString() || '0'}
                          </p>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Scope of Supply</p>
                        <p className="text-sm whitespace-pre-wrap">{uploadResult.scope_of_supply}</p>
                      </div>
                    </TabsContent>

                    <TabsContent value="technical" className="space-y-4">
                      {uploadResult.technical_items?.map((item: any, idx: number) => (
                        <Card key={idx}>
                          <CardHeader>
                            <CardTitle className="text-lg">{item.rfp_item?.description}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm text-muted-foreground">Selected SKU</p>
                                <p className="font-semibold">{item.chosen_sku || 'N/A'}</p>
                              </div>
                              {item.top_matches && item.top_matches.length > 0 && (
                                <div>
                                  <p className="text-sm text-muted-foreground mb-2">Top Matches</p>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>SKU</TableHead>
                                        <TableHead>Match %</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {item.top_matches.map((match: any, midx: number) => (
                                        <TableRow key={midx}>
                                          <TableCell>{match.sku}</TableCell>
                                          <TableCell>{match.match_percent}%</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </TabsContent>

                    <TabsContent value="pricing" className="space-y-4">
                      {uploadResult.pricing?.items?.map((item: any, idx: number) => (
                        <Card key={idx}>
                          <CardHeader>
                            <CardTitle className="text-lg">{item.rfp_item?.description}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">SKU</p>
                                <p className="font-semibold">{item.chosen_sku}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Quantity</p>
                                <p className="font-semibold">{item.quantity}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Unit Price</p>
                                <p className="font-semibold">₹{item.unit_price?.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Material Cost</p>
                                <p className="font-semibold">₹{item.material_cost?.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Tests Cost</p>
                                <p className="font-semibold">₹{item.tests_cost?.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Total Cost</p>
                                <p className="font-semibold text-lg text-green-600">
                                  ₹{item.total_cost?.toLocaleString()}
                                </p>
                              </div>
                            </div>
                            {item.tests_applied && item.tests_applied.length > 0 && (
                              <div className="mt-4">
                                <p className="text-sm text-muted-foreground mb-2">Tests Applied</p>
                                <div className="flex flex-wrap gap-2">
                                  {item.tests_applied.map((test: string, tidx: number) => (
                                    <Badge key={tidx} variant="outline">
                                      {test}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      <Card className="bg-green-50 border-green-200">
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-center">
                            <p className="text-lg font-semibold">Total Bid Value</p>
                            <p className="text-2xl font-bold text-green-600">
                              ₹{uploadResult.total_bid_value?.toLocaleString() || '0'}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="summary" className="space-y-4">
                      {uploadResult.narrative_summary && (
                        <Card>
                          <CardHeader>
                            <CardTitle>Narrative Summary</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="whitespace-pre-wrap text-sm">
                              {uploadResult.narrative_summary}
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Workflow;

