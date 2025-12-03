import { useAuth } from '@/contexts/AuthContext';
import { useRFP } from '@/contexts/RFPContext';
import { useActivity } from '@/contexts/ActivityContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle2, Clock, Activity } from 'lucide-react';
import { format } from 'date-fns';

const Dashboard = () => {
  const { currentUser } = useAuth();
  const { rfps } = useRFP();
  const { activities } = useActivity();

  const totalRFPs = rfps.length;
  const openRFPs = rfps.filter(rfp => rfp.status === 'Open').length;
  const submittedRFPs = rfps.filter(rfp => rfp.status === 'Submitted').length;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Section */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="text-3xl font-heading">
              Welcome, {currentUser?.name || 'User'}
            </CardTitle>
            <CardDescription className="text-lg">
              Role: {currentUser?.role || 'N/A'}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* RFP Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-soft border-2 hover:shadow-medium transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total RFPs</CardTitle>
              <FileText className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-heading">{totalRFPs}</div>
              {totalRFPs === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  No RFPs yet. Go to the RFPs page to add one.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-soft border-2 hover:shadow-medium transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Open RFPs</CardTitle>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-heading">{openRFPs}</div>
            </CardContent>
          </Card>

          <Card className="shadow-soft border-2 hover:shadow-medium transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Submitted RFPs</CardTitle>
              <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-heading">{submittedRFPs}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="shadow-medium">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              <CardTitle className="font-heading">Recent Activity</CardTitle>
            </div>
            <CardDescription>Your latest actions in the system</CardDescription>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No recent activity. Start by creating an RFP!
              </p>
            ) : (
              <div className="space-y-4">
                {activities.slice(0, 5).map((activity) => (
                  <div 
                    key={activity.id} 
                    className="flex items-start gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{activity.action}</p>
                      <p className="text-sm text-muted-foreground">{activity.details}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(activity.timestamp, 'MMM dd, HH:mm')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
