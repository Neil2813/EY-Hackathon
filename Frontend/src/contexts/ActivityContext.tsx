import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Activity {
  id: string;
  timestamp: Date;
  action: string;
  details: string;
}

interface ActivityContextType {
  activities: Activity[];
  addActivity: (action: string, details: string) => void;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export const ActivityProvider = ({ children }: { children: ReactNode }) => {
  const [activities, setActivities] = useState<Activity[]>([]);

  const addActivity = (action: string, details: string) => {
    const newActivity: Activity = {
      id: Date.now().toString(),
      timestamp: new Date(),
      action,
      details,
    };
    setActivities([newActivity, ...activities]);
  };

  return (
    <ActivityContext.Provider value={{ activities, addActivity }}>
      {children}
    </ActivityContext.Provider>
  );
};

export const useActivity = () => {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivity must be used within ActivityProvider');
  }
  return context;
};
