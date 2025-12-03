import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRFP } from '@/contexts/RFPContext';
import { useActivity } from '@/contexts/ActivityContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const RFPDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getRFPById, updateRFP, addLineItem, addRequirement } = useRFP();
  const { addActivity } = useActivity();

  const rfp = getRFPById(id!);

  const [lineItemDesc, setLineItemDesc] = useState('');
  const [lineItemQty, setLineItemQty] = useState('');
  const [lineItemUnit, setLineItemUnit] = useState('');

  const [requirementText, setRequirementText] = useState('');

  if (!rfp) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-lg text-muted-foreground">RFP not found</p>
              <Button onClick={() => navigate('/rfps')} className="mt-4">
                Back to RFPs
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleStatusChange = (newStatus: string) => {
    updateRFP(rfp.id, { status: newStatus as any });
    addActivity('Status Updated', `Changed status of ${rfp.rfpId} to ${newStatus}`);
    toast.success('Status updated');
  };

  const handleAddLineItem = () => {
    if (!lineItemDesc || !lineItemQty || !lineItemUnit) {
      toast.error('Please fill all line item fields');
      return;
    }

    addLineItem(rfp.id, {
      description: lineItemDesc,
      quantity: parseInt(lineItemQty),
      unit: lineItemUnit,
    });

    addActivity('Line Item Added', `Added line item to ${rfp.rfpId}`);
    toast.success('Line item added');
    setLineItemDesc('');
    setLineItemQty('');
    setLineItemUnit('');
  };

  const handleAddRequirement = () => {
    if (!requirementText) {
      toast.error('Please enter a requirement');
      return;
    }

    addRequirement(rfp.id, { text: requirementText });
    addActivity('Requirement Added', `Added requirement to ${rfp.rfpId}`);
    toast.success('Requirement added');
    setRequirementText('');
  };

  const handleAgentAction = (action: string) => {
    if (action === 'technical') {
      updateRFP(rfp.id, { readyForTechnical: true });
      addActivity('Agent Action', `Marked ${rfp.rfpId} ready for Technical Agent`);
      toast.success('Marked ready for Technical Agent');
    } else if (action === 'pricing') {
      updateRFP(rfp.id, { readyForPricing: true });
      addActivity('Agent Action', `Marked ${rfp.rfpId} ready for Pricing`);
      toast.success('Marked ready for Pricing');
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate('/rfps')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to RFP List
        </Button>

        {/* RFP Header */}
        <Card className="shadow-medium">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-3xl font-heading">{rfp.title}</CardTitle>
                <CardDescription className="text-lg mt-2">
                  {rfp.rfpId} • {rfp.client}
                </CardDescription>
              </div>
              <Badge className="text-sm px-4 py-1">
                {rfp.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Due Date</Label>
                <p className="text-lg font-medium">{format(new Date(rfp.dueDate), 'MMMM dd, yyyy')}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Update Status</Label>
                <Select value={rfp.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Submitted">Submitted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scope of Supply */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="font-heading">Scope of Supply</CardTitle>
            <CardDescription>Manage line items for this RFP</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="lineDesc">Description</Label>
                <Input
                  id="lineDesc"
                  placeholder="Item description"
                  value={lineItemDesc}
                  onChange={(e) => setLineItemDesc(e.target.value)}
                  className="bg-secondary/50"
                />
              </div>
              <div>
                <Label htmlFor="lineQty">Quantity</Label>
                <Input
                  id="lineQty"
                  type="number"
                  placeholder="10"
                  value={lineItemQty}
                  onChange={(e) => setLineItemQty(e.target.value)}
                  className="bg-secondary/50"
                />
              </div>
              <div>
                <Label htmlFor="lineUnit">Unit</Label>
                <Input
                  id="lineUnit"
                  placeholder="pcs"
                  value={lineItemUnit}
                  onChange={(e) => setLineItemUnit(e.target.value)}
                  className="bg-secondary/50"
                />
              </div>
            </div>
            <Button onClick={handleAddLineItem} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Line Item
            </Button>

            {rfp.lineItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No line items added yet</p>
            ) : (
              <div className="rounded-lg border overflow-hidden mt-4">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-accent/50">
                      <TableHead>Description</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rfp.lineItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Requirements */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="font-heading">Testing & Acceptance Requirements</CardTitle>
            <CardDescription>Document requirements for this RFP</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="requirement">Requirement</Label>
              <Textarea
                id="requirement"
                placeholder="Enter a requirement..."
                value={requirementText}
                onChange={(e) => setRequirementText(e.target.value)}
                className="bg-secondary/50 min-h-[100px]"
              />
            </div>
            <Button onClick={handleAddRequirement} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Requirement
            </Button>

            {rfp.requirements.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No requirements added yet</p>
            ) : (
              <ul className="space-y-2 mt-4">
                {rfp.requirements.map((req, index) => (
                  <li key={req.id} className="p-3 rounded-lg bg-secondary/30 border">
                    <span className="font-medium">#{index + 1}</span> - {req.text}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Agent Actions */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="font-heading">Agent Actions</CardTitle>
            <CardDescription>Trigger agent workflows for this RFP</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              onClick={() => handleAgentAction('technical')}
              disabled={rfp.readyForTechnical}
              variant={rfp.readyForTechnical ? 'secondary' : 'default'}
            >
              {rfp.readyForTechnical ? '✓ Ready for Technical' : 'Mark Ready for Technical Agent'}
            </Button>
            <Button
              onClick={() => handleAgentAction('pricing')}
              disabled={rfp.readyForPricing}
              variant={rfp.readyForPricing ? 'secondary' : 'default'}
            >
              {rfp.readyForPricing ? '✓ Ready for Pricing' : 'Mark Ready for Pricing'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RFPDetail;
