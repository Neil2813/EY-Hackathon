import { useState } from 'react';
import { useRFP } from '@/contexts/RFPContext';
import { usePricing } from '@/contexts/PricingContext';
import { useActivity } from '@/contexts/ActivityContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

const Pricing = () => {
  const { rfps } = useRFP();
  const { addProduct, addTest, getProductsByRFP, getTestsByRFP, getTotalMaterialCost, getTotalTestCost, getGrandTotal } = usePricing();
  const { addActivity } = useActivity();

  const [selectedRFPId, setSelectedRFPId] = useState('');

  // Product form
  const [oemSku, setOemSku] = useState('');
  const [prodQty, setProdQty] = useState('');
  const [unitPrice, setUnitPrice] = useState('');

  // Test form
  const [testName, setTestName] = useState('');
  const [numTests, setNumTests] = useState('');
  const [pricePerTest, setPricePerTest] = useState('');

  const handleAddProduct = () => {
    if (!selectedRFPId) {
      toast.error('Please select an RFP first');
      return;
    }
    if (!oemSku || !prodQty || !unitPrice) {
      toast.error('Please fill all product fields');
      return;
    }

    addProduct({
      rfpId: selectedRFPId,
      oemSku,
      quantity: parseInt(prodQty),
      unitPrice: parseFloat(unitPrice),
    });

    addActivity('Product Added', `Added product pricing for RFP ${selectedRFPId}`);
    toast.success('Product row added');
    setOemSku('');
    setProdQty('');
    setUnitPrice('');
  };

  const handleAddTest = () => {
    if (!selectedRFPId) {
      toast.error('Please select an RFP first');
      return;
    }
    if (!testName || !numTests || !pricePerTest) {
      toast.error('Please fill all test fields');
      return;
    }

    addTest({
      rfpId: selectedRFPId,
      testName,
      numberOfTests: parseInt(numTests),
      pricePerTest: parseFloat(pricePerTest),
    });

    addActivity('Test Added', `Added test pricing for RFP ${selectedRFPId}`);
    toast.success('Test row added');
    setTestName('');
    setNumTests('');
    setPricePerTest('');
  };

  const products = selectedRFPId ? getProductsByRFP(selectedRFPId) : [];
  const tests = selectedRFPId ? getTestsByRFP(selectedRFPId) : [];
  const totalMaterial = selectedRFPId ? getTotalMaterialCost(selectedRFPId) : 0;
  const totalTest = selectedRFPId ? getTotalTestCost(selectedRFPId) : 0;
  const grandTotal = selectedRFPId ? getGrandTotal(selectedRFPId) : 0;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-4xl font-heading font-bold">Pricing</h1>

        {/* RFP Selection */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="font-heading">Select RFP</CardTitle>
            <CardDescription>Choose an RFP to manage its pricing</CardDescription>
          </CardHeader>
          <CardContent>
            {rfps.length === 0 ? (
              <p className="text-muted-foreground">No RFPs available. Create one in the RFPs page.</p>
            ) : (
              <Select value={selectedRFPId} onValueChange={setSelectedRFPId}>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Select an RFP" />
                </SelectTrigger>
                <SelectContent>
                  {rfps.map((rfp) => (
                    <SelectItem key={rfp.id} value={rfp.id}>
                      {rfp.rfpId} - {rfp.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {selectedRFPId && (
          <>
            {/* Product Pricing */}
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="font-heading">Product Pricing</CardTitle>
                <CardDescription>Add product line items with pricing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="oemSku">OEM SKU</Label>
                    <Input
                      id="oemSku"
                      placeholder="SKU-12345"
                      value={oemSku}
                      onChange={(e) => setOemSku(e.target.value)}
                      className="bg-secondary/50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="prodQty">Quantity</Label>
                    <Input
                      id="prodQty"
                      type="number"
                      placeholder="10"
                      value={prodQty}
                      onChange={(e) => setProdQty(e.target.value)}
                      className="bg-secondary/50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="unitPrice">Unit Price ($)</Label>
                    <Input
                      id="unitPrice"
                      type="number"
                      step="0.01"
                      placeholder="99.99"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      className="bg-secondary/50"
                    />
                  </div>
                </div>
                <Button onClick={handleAddProduct} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Product Row
                </Button>

                {products.length > 0 && (
                  <div className="rounded-lg border overflow-hidden mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-accent/50">
                          <TableHead>OEM SKU</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Line Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((prod) => (
                          <TableRow key={prod.id}>
                            <TableCell>{prod.oemSku}</TableCell>
                            <TableCell>{prod.quantity}</TableCell>
                            <TableCell>${prod.unitPrice.toFixed(2)}</TableCell>
                            <TableCell className="font-semibold">
                              ${(prod.quantity * prod.unitPrice).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Testing Pricing */}
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="font-heading">Testing / Services Pricing</CardTitle>
                <CardDescription>Add testing and service line items</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="testName">Test Name</Label>
                    <Input
                      id="testName"
                      placeholder="Functional Test"
                      value={testName}
                      onChange={(e) => setTestName(e.target.value)}
                      className="bg-secondary/50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="numTests">Number of Tests</Label>
                    <Input
                      id="numTests"
                      type="number"
                      placeholder="5"
                      value={numTests}
                      onChange={(e) => setNumTests(e.target.value)}
                      className="bg-secondary/50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pricePerTest">Price per Test ($)</Label>
                    <Input
                      id="pricePerTest"
                      type="number"
                      step="0.01"
                      placeholder="150.00"
                      value={pricePerTest}
                      onChange={(e) => setPricePerTest(e.target.value)}
                      className="bg-secondary/50"
                    />
                  </div>
                </div>
                <Button onClick={handleAddTest} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Test Row
                </Button>

                {tests.length > 0 && (
                  <div className="rounded-lg border overflow-hidden mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-accent/50">
                          <TableHead>Test Name</TableHead>
                          <TableHead>Number of Tests</TableHead>
                          <TableHead>Price per Test</TableHead>
                          <TableHead>Test Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tests.map((test) => (
                          <TableRow key={test.id}>
                            <TableCell>{test.testName}</TableCell>
                            <TableCell>{test.numberOfTests}</TableCell>
                            <TableCell>${test.pricePerTest.toFixed(2)}</TableCell>
                            <TableCell className="font-semibold">
                              ${(test.numberOfTests * test.pricePerTest).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="shadow-strong border-2">
              <CardHeader>
                <CardTitle className="font-heading text-2xl">Pricing Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-lg">
                  <span>Total Material Cost:</span>
                  <span className="font-semibold">${totalMaterial.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span>Total Test Cost:</span>
                  <span className="font-semibold">${totalTest.toFixed(2)}</span>
                </div>
                <div className="border-t-2 border-border pt-3 mt-3"></div>
                <div className="flex justify-between text-2xl font-bold">
                  <span>Grand Total:</span>
                  <span>${grandTotal.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Pricing;
