
import React from 'react';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const { threads } = useChat();
  const navigate = useNavigate();
  
  if (!user) {
    return (
      <div className="min-h-screen bg-maiBg">
        <Header />
        <main className="py-8 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Please log in to view your dashboard</h1>
            <Button onClick={() => navigate('/login')} className="bg-maiRed hover:bg-red-600">
              Log in
            </Button>
          </div>
        </main>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-maiBg">
      <Header />
      <main className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Current Balance</CardDescription>
                <CardTitle className="text-3xl">{user.credits} credits</CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => navigate('/buy-credits')}
                  className="w-full bg-maiRed hover:bg-red-600 mt-2"
                >
                  Buy More Credits
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Chat Threads</CardDescription>
                <CardTitle className="text-3xl">{threads.length}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => navigate('/')} 
                  variant="outline"
                  className="w-full mt-2"
                >
                  Start New Chat
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Usage Report</CardDescription>
                <CardTitle className="text-3xl">View Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => navigate('/usage')}
                  variant="outline" 
                  className="w-full mt-2"
                >
                  View Report
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest chat threads</CardDescription>
              </CardHeader>
              <CardContent>
                {threads.length > 0 ? (
                  <div className="space-y-3">
                    {threads.slice(0, 5).map(thread => (
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
                    You haven't started any chats yet
                  </p>
                )}
                
                {threads.length > 0 && (
                  <Button 
                    onClick={() => navigate('/')}
                    variant="link" 
                    className="mt-4 p-0"
                  >
                    View all chats
                  </Button>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks you might want to do</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={() => navigate('/')}
                  className="w-full bg-maiRed hover:bg-red-600"
                >
                  Ask a Question
                </Button>
                
                <Button 
                  onClick={() => navigate('/buy-credits')}
                  variant="outline" 
                  className="w-full"
                >
                  Buy Credits
                </Button>
                
                <Button 
                  onClick={() => navigate('/usage')}
                  variant="outline" 
                  className="w-full"
                >
                  View Usage Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
