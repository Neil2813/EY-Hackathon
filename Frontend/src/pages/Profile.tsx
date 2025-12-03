import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { User } from 'lucide-react';

const Profile = () => {
  const { isLoggedIn, currentUser, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [role, setRole] = useState(currentUser?.role || '');

  if (!isLoggedIn || !currentUser) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-medium">
            <CardContent className="py-12 text-center">
              <p className="text-lg text-muted-foreground mb-4">
                You are not logged in.
              </p>
              <Button onClick={() => navigate('/login')}>
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !role) {
      toast.error('Please fill in all fields');
      return;
    }

    updateProfile({ name, email, role });
    toast.success('Profile updated successfully!');
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-4xl font-heading font-bold">Profile</h1>

        <Card className="shadow-medium">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-accent">
                <User className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="font-heading">Your Information</CardTitle>
                <CardDescription>Manage your account details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-secondary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-secondary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Technical">Technical</SelectItem>
                    <SelectItem value="Pricing">Pricing</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                Update Profile
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-medium border-2">
          <CardHeader>
            <CardTitle className="font-heading">Current Session Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium">{currentUser.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{currentUser.email}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Role:</span>
              <span className="font-medium">{currentUser.role}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
