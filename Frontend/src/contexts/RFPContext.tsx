import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
}

export interface Requirement {
  id: string;
  text: string;
}

export interface RFP {
  id: string;
  rfpId: string;
  title: string;
  client: string;
  dueDate: string;
  status: 'Open' | 'In Progress' | 'Submitted';
  lineItems: LineItem[];
  requirements: Requirement[];
  readyForTechnical: boolean;
  readyForPricing: boolean;
}

interface RFPContextType {
  rfps: RFP[];
  addRFP: (rfp: Omit<RFP, 'lineItems' | 'requirements' | 'readyForTechnical' | 'readyForPricing'>) => void;
  updateRFP: (id: string, updates: Partial<RFP>) => void;
  getRFPById: (id: string) => RFP | undefined;
  addLineItem: (rfpId: string, lineItem: Omit<LineItem, 'id'>) => void;
  addRequirement: (rfpId: string, requirement: Omit<Requirement, 'id'>) => void;
}

const RFPContext = createContext<RFPContextType | undefined>(undefined);

export const RFPProvider = ({ children }: { children: ReactNode }) => {
  const [rfps, setRfps] = useState<RFP[]>([]);

  const addRFP = (rfp: Omit<RFP, 'lineItems' | 'requirements' | 'readyForTechnical' | 'readyForPricing'>) => {
    const newRFP: RFP = {
      ...rfp,
      lineItems: [],
      requirements: [],
      readyForTechnical: false,
      readyForPricing: false,
    };
    setRfps([...rfps, newRFP]);
  };

  const updateRFP = (id: string, updates: Partial<RFP>) => {
    setRfps(rfps.map(rfp => rfp.id === id ? { ...rfp, ...updates } : rfp));
  };

  const getRFPById = (id: string) => {
    return rfps.find(rfp => rfp.id === id);
  };

  const addLineItem = (rfpId: string, lineItem: Omit<LineItem, 'id'>) => {
    setRfps(rfps.map(rfp => {
      if (rfp.id === rfpId) {
        return {
          ...rfp,
          lineItems: [...rfp.lineItems, { ...lineItem, id: Date.now().toString() }]
        };
      }
      return rfp;
    }));
  };

  const addRequirement = (rfpId: string, requirement: Omit<Requirement, 'id'>) => {
    setRfps(rfps.map(rfp => {
      if (rfp.id === rfpId) {
        return {
          ...rfp,
          requirements: [...rfp.requirements, { ...requirement, id: Date.now().toString() }]
        };
      }
      return rfp;
    }));
  };

  return (
    <RFPContext.Provider value={{ rfps, addRFP, updateRFP, getRFPById, addLineItem, addRequirement }}>
      {children}
    </RFPContext.Provider>
  );
};

export const useRFP = () => {
  const context = useContext(RFPContext);
  if (!context) {
    throw new Error('useRFP must be used within RFPProvider');
  }
  return context;
};
