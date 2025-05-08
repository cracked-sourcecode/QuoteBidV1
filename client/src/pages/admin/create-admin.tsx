import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function CreateAdmin() {
  const [secretKey, setSecretKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await apiRequest('POST', '/api/admin/create-default', {
        adminSecretKey: secretKey
      });
      
      const data = await response.json();
      setResult(data);
      
      toast({
        title: 'Success',
        description: 'Admin account created successfully',
      });
    } catch (error) {
      console.error('Failed to create admin account:', error);
      
      toast({
        title: 'Error',
        description: 'Failed to create admin account',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create Default Admin Account</CardTitle>
          <CardDescription>
            Use this utility to create a default admin account for the platform.
            You will need the admin secret key provided by system administrator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="secretKey">Admin Secret Key</Label>
              <Input
                id="secretKey"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="Enter the admin secret key"
                required
              />
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Default Admin'}
            </Button>

            {result && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
                <h3 className="text-green-800 font-medium">Admin Account Created!</h3>
                <p className="text-green-700 mt-2">Use these credentials to log in:</p>
                <div className="mt-2 p-3 bg-white rounded border border-green-100">
                  <div className="grid grid-cols-[100px_1fr] gap-2">
                    <div className="font-medium">Username:</div>
                    <div>{result.credentials?.username}</div>
                    <div className="font-medium">Password:</div>
                    <div>{result.credentials?.password}</div>
                  </div>
                </div>
                <p className="text-sm text-green-600 mt-3">
                  Make sure to save these credentials in a secure location. 
                  You won't be able to see this password again.
                </p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}