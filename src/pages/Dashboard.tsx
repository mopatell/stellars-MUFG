import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Search, FileText, Shield, LogOut, Plus } from 'lucide-react';
import DatasetUpload from '@/components/DatasetUpload';
import ClauseSearch from '@/components/ClauseSearch';
import DraftGenerator from '@/components/DraftGenerator';
import ComplianceChecker from '@/components/ComplianceChecker';
import UnderwriterProfile from '@/components/UnderwriterProfile';

const Dashboard = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [drafts, setDrafts] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchDrafts();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    setProfile(data);
  };

  const fetchDrafts = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('policy_drafts')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(5);
    
    setDrafts(data || []);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">AI Underwriter</h1>
            <p className="text-muted-foreground">Welcome back, {profile?.full_name || user.email}</p>
          </div>
          <div className='flex justify-center items-center space-x-3'>
            <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
          <a href='https://riskguard.streamlit.app/'>
            <Button variant="outline">
            RiskGuard
          </Button>
          </a>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Drafts</p>
                  <p className="text-3xl font-bold">{drafts.length}</p>
                </div>
                <FileText className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Compliance Rate</p>
                  <p className="text-3xl font-bold">94%</p>
                </div>
                <Shield className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Datasets</p>
                  <p className="text-3xl font-bold">8</p>
                </div>
                <Upload className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Risk Alerts</p>
                  <p className="text-3xl font-bold">3</p>
                </div>
                <Search className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Drafts */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Recent Policy Drafts</CardTitle>
                <CardDescription>Your latest policy drafts and their status</CardDescription>
              </div>
              {/* <Button onClick={() => navigate('/draft/new')}>
                <Plus className="mr-2 h-4 w-4" />
                New Draft
              </Button> */}
            </div>
          </CardHeader>
          <CardContent>
            {drafts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No drafts yet. Create your first policy draft!</p>
            ) : (
              <div className="space-y-4">
                {drafts.map((draft) => (
                  <div key={draft.id} className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{draft.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Status: {draft.status} • {draft.compliance_status}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/draft/${draft.id}`)}>
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Workspace */}
        <Tabs defaultValue="datasets" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="datasets">Datasets</TabsTrigger>
            <TabsTrigger value="clauses">Clause Search</TabsTrigger>
            <TabsTrigger value="generator">Draft Generator</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="underwriter">Underwriter</TabsTrigger>
          </TabsList>
          
          <TabsContent value="datasets" className="mt-6">
            <DatasetUpload onUploadComplete={fetchDrafts} />
          </TabsContent>
          
          <TabsContent value="clauses" className="mt-6">
            <ClauseSearch />
          </TabsContent>
          
          <TabsContent value="generator" className="mt-6">
            <DraftGenerator onDraftCreated={fetchDrafts} />
          </TabsContent>
          
          <TabsContent value="compliance" className="mt-6">
            <ComplianceChecker />
          </TabsContent>
          
          <TabsContent value="underwriter" className="mt-6">
            <UnderwriterProfile />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;