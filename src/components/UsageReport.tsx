
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function UsageReport() {
  const { user } = useAuth();
  const { threads } = useChat();
  
  // Calculate total messages sent
  const totalMessages = threads.reduce((acc, thread) => {
    return acc + thread.messages.filter(msg => msg.role === 'user').length;
  }, 0);
  
  // Calculate total AI responses received
  const totalResponses = threads.reduce((acc, thread) => {
    return acc + thread.messages.filter(msg => msg.role === 'assistant').length;
  }, 0);
  
  // Calculate credits used (estimated)
  const creditsUsed = totalResponses * 5; // Assuming average of 5 credits per response
  
  // Generate dummy data for the chart (in a real app, this would come from actual usage)
  const generateDummyData = () => {
    const days = 7;
    const data = [];
    
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      
      // Generate some varying usage data
      let usage = 0;
      if (i < 3) {
        // More recent days have more activity
        usage = Math.floor(Math.random() * 10) + 5;
      } else {
        // Older days have less activity
        usage = Math.floor(Math.random() * 5) + 1;
      }
      
      data.push({
        name: date.toLocaleDateString('en-US', { weekday: 'short' }),
        credits: usage,
      });
    }
    
    return data;
  };
  
  const usageData = generateDummyData();
  
  if (!user) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Usage Report</CardTitle>
          <CardDescription>Please log in to view your usage report</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Your Usage Report</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current Balance</CardDescription>
            <CardTitle className="text-2xl">{user.credits} credits</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Questions Asked</CardDescription>
            <CardTitle className="text-2xl">{totalMessages}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Credits Used</CardDescription>
            <CardTitle className="text-2xl">{creditsUsed}</CardTitle>
          </CardHeader>
        </Card>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Usage Over Time</CardTitle>
          <CardDescription>Credits used per day over the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usageData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="credits" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Model Usage</CardTitle>
            <CardDescription>Credits used per AI model</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>ChatGPT (Default)</span>
                <span className="font-semibold">{creditsUsed} credits</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-maiRed rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest interactions</CardDescription>
          </CardHeader>
          <CardContent>
            {threads.length > 0 ? (
              <div className="space-y-3">
                {threads.slice(0, 3).map(thread => (
                  <div key={thread.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium">{thread.title}</p>
                      <p className="text-sm text-gray-500">
                        {thread.messages.length} messages
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(thread.lastUpdated).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No activity yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
