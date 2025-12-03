import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRFP } from '@/contexts/RFPContext';
import { useActivity } from '@/contexts/ActivityContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';

const RFPs = () => {
  const [rfpId, setRfpId] = useState('');
  const [title, setTitle] = useState('');
  const [client, setClient] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<'Open' | 'In Progress' | 'Submitted'>('Open');

  const { rfps, addRFP } = useRFP();
  const { addActivity } = useActivity();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!rfpId || !title || !client || !dueDate) {
      toast.error('Please fill in all fields');
      return;
    }

    addRFP({
      id: Date.now().toString(),
      rfpId,
      title,
      client,
      dueDate,
      status,
    });

    addActivity('RFP Created', `Created RFP: ${title} (${rfpId})`);
    toast.success('RFP added successfully!');

    // Reset form
    setRfpId('');
    setTitle('');
    setClient('');
    setDueDate('');
    setStatus('Open');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-blue-500/20 text-blue-700 border-blue-500/50';
      case 'In Progress':
        return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/50';
      case 'Submitted':
        return 'bg-green-500/20 text-green-700 border-green-500/50';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-4xl font-heading font-bold">RFPs</h1>

        {/* RFP Creation Form */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="font-heading">Create New RFP</CardTitle>
            <CardDescription>Add a new RFP to the system</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rfpId">RFP ID</Label>
                  <Input
                    id="rfpId"
                    placeholder="RFP-2024-001"
                    value={rfpId}
                    onChange={(e) => setRfpId(e.target.value)}
                    className="bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="RFP Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client">Client / LSTK Name</Label>
                  <Input
                    id="client"
                    placeholder="Client Name"
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    className="bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Submission Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(val) => setStatus(val as any)}>
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
              <Button type="submit" className="w-full md:w-auto">
                Add RFP
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* RFP List */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="font-heading">RFP List</CardTitle>
            <CardDescription>All RFPs in the system</CardDescription>
          </CardHeader>
          <CardContent>
            {rfps.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  No RFPs created yet. Use the form above to add one.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-accent/50">
                      <TableHead>RFP ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rfps.map((rfp) => (
                      <TableRow key={rfp.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{rfp.rfpId}</TableCell>
                        <TableCell>{rfp.title}</TableCell>
                        <TableCell>{rfp.client}</TableCell>
                        <TableCell>{format(new Date(rfp.dueDate), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(rfp.status)} variant="outline">
                            {rfp.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/rfps/${rfp.id}`)}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RFPs;
