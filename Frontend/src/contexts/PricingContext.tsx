import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface ProductRow {
  id: string;
  rfpId: string;
  oemSku: string;
  quantity: number;
  unitPrice: number;
}

export interface TestRow {
  id: string;
  rfpId: string;
  testName: string;
  numberOfTests: number;
  pricePerTest: number;
}

interface PricingContextType {
  products: ProductRow[];
  tests: TestRow[];
  addProduct: (product: Omit<ProductRow, 'id'>) => void;
  addTest: (test: Omit<TestRow, 'id'>) => void;
  getProductsByRFP: (rfpId: string) => ProductRow[];
  getTestsByRFP: (rfpId: string) => TestRow[];
  getTotalMaterialCost: (rfpId: string) => number;
  getTotalTestCost: (rfpId: string) => number;
  getGrandTotal: (rfpId: string) => number;
}

const PricingContext = createContext<PricingContextType | undefined>(undefined);

export const PricingProvider = ({ children }: { children: ReactNode }) => {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [tests, setTests] = useState<TestRow[]>([]);

  const addProduct = (product: Omit<ProductRow, 'id'>) => {
    setProducts([...products, { ...product, id: Date.now().toString() }]);
  };

  const addTest = (test: Omit<TestRow, 'id'>) => {
    setTests([...tests, { ...test, id: Date.now().toString() }]);
  };

  const getProductsByRFP = (rfpId: string) => {
    return products.filter(p => p.rfpId === rfpId);
  };

  const getTestsByRFP = (rfpId: string) => {
    return tests.filter(t => t.rfpId === rfpId);
  };

  const getTotalMaterialCost = (rfpId: string) => {
    return getProductsByRFP(rfpId).reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);
  };

  const getTotalTestCost = (rfpId: string) => {
    return getTestsByRFP(rfpId).reduce((sum, t) => sum + (t.numberOfTests * t.pricePerTest), 0);
  };

  const getGrandTotal = (rfpId: string) => {
    return getTotalMaterialCost(rfpId) + getTotalTestCost(rfpId);
  };

  return (
    <PricingContext.Provider value={{
      products,
      tests,
      addProduct,
      addTest,
      getProductsByRFP,
      getTestsByRFP,
      getTotalMaterialCost,
      getTotalTestCost,
      getGrandTotal,
    }}>
      {children}
    </PricingContext.Provider>
  );
};

export const usePricing = () => {
  const context = useContext(PricingContext);
  if (!context) {
    throw new Error('usePricing must be used within PricingProvider');
  }
  return context;
};
