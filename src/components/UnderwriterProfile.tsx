import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Shield, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UnderwriterData {
  id?: string;
  underwriter_id: string;
  name: string;
  insurance_type: string;
  years_experience: number;
  risk_level_assessed: string;
  policy_decisions_monthly: number;
  state: string;
  certifications: string;
  risk_analysis?: any;
}

const UnderwriterProfile = () => {
  const [formData, setFormData] = useState<UnderwriterData>({
    underwriter_id: '',
    name: '',
    insurance_type: '',
    years_experience: 0,
    risk_level_assessed: '',
    policy_decisions_monthly: 0,
    state: '',
    certifications: ''
  });
  
  const [underwriters, setUnderwriters] = useState<UnderwriterData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedUnderwriter, setSelectedUnderwriter] = useState<UnderwriterData | null>(null);
  const { toast } = useToast();

  const insuranceTypes = ['Life', 'General', 'Commercial', 'Reinsurance', 'Health', 'Property'];
  const riskLevels = ['Low', 'Medium', 'High'];
  const states = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'];
  const certifications = ['ANZIIF', 'CPA', 'Fellow ANZIIF', 'CPCU', 'ARM', 'AU'];

  useEffect(() => {
    loadUnderwriters();
  }, []);

  const loadUnderwriters = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('underwriters')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUnderwriters(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load underwriters",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('underwriters')
        .insert({
          ...formData,
          user_id: user.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Underwriter profile created successfully",
      });

      // Reset form
      setFormData({
        underwriter_id: '',
        name: '',
        insurance_type: '',
        years_experience: 0,
        risk_level_assessed: '',
        policy_decisions_monthly: 0,
        state: '',
        certifications: ''
      });

      loadUnderwriters();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeRisk = async (underwriter: UnderwriterData) => {
    setIsAnalyzing(true);
    setSelectedUnderwriter(underwriter);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-underwriter-risk', {
        body: { underwriter }
      });

      if (error) throw error;

      // Update the underwriter with risk analysis
      const { error: updateError } = await supabase
        .from('underwriters')
        .update({ risk_analysis: data.analysis })
        .eq('id', underwriter.id);

      if (updateError) throw updateError;

      toast({
        title: "Analysis Complete",
        description: "Risk analysis has been generated",
      });

      loadUnderwriters();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to analyze risk",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Create Profile</TabsTrigger>
          <TabsTrigger value="view">View Profiles</TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Create Underwriter Profile
              </CardTitle>
              <CardDescription>
                Enter underwriter details for risk analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="underwriter_id">Underwriter ID</Label>
                    <Input
                      id="underwriter_id"
                      value={formData.underwriter_id}
                      onChange={(e) => setFormData({...formData, underwriter_id: e.target.value})}
                      placeholder="1001"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Emma Smith"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="insurance_type">Insurance Type</Label>
                    <Select 
                      value={formData.insurance_type} 
                      onValueChange={(value) => setFormData({...formData, insurance_type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select insurance type" />
                      </SelectTrigger>
                      <SelectContent>
                        {insuranceTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="years_experience">Years Experience</Label>
                    <Input
                      id="years_experience"
                      type="number"
                      value={formData.years_experience}
                      onChange={(e) => setFormData({...formData, years_experience: parseInt(e.target.value) || 0})}
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="risk_level_assessed">Risk Level Assessed</Label>
                    <Select 
                      value={formData.risk_level_assessed} 
                      onValueChange={(value) => setFormData({...formData, risk_level_assessed: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select risk level" />
                      </SelectTrigger>
                      <SelectContent>
                        {riskLevels.map((level) => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="policy_decisions_monthly">Policy Decisions Monthly</Label>
                    <Input
                      id="policy_decisions_monthly"
                      type="number"
                      value={formData.policy_decisions_monthly}
                      onChange={(e) => setFormData({...formData, policy_decisions_monthly: parseInt(e.target.value) || 0})}
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Select 
                      value={formData.state} 
                      onValueChange={(value) => setFormData({...formData, state: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {states.map((state) => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="certifications">Certifications</Label>
                    <Select 
                      value={formData.certifications} 
                      onValueChange={(value) => setFormData({...formData, certifications: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select certification" />
                      </SelectTrigger>
                      <SelectContent>
                        {certifications.map((cert) => (
                          <SelectItem key={cert} value={cert}>{cert}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Underwriter Profile
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="view">
          <div className="space-y-4">
            {underwriters.map((underwriter) => (
              <Card key={underwriter.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {underwriter.name}
                      </CardTitle>
                      <CardDescription>ID: {underwriter.underwriter_id}</CardDescription>
                    </div>
                    <Button 
                      onClick={() => analyzeRisk(underwriter)}
                      disabled={isAnalyzing}
                      variant="outline"
                    >
                      {isAnalyzing && selectedUnderwriter?.id === underwriter.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <TrendingUp className="mr-2 h-4 w-4" />
                      )}
                      Analyze Risk
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <Label className="text-sm font-medium">Insurance Type</Label>
                      <Badge variant="secondary">{underwriter.insurance_type}</Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Experience</Label>
                      <p className="text-sm">{underwriter.years_experience} years</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Risk Level</Label>
                      <Badge variant={
                        underwriter.risk_level_assessed === 'High' ? 'destructive' :
                        underwriter.risk_level_assessed === 'Medium' ? 'default' : 'secondary'
                      }>
                        {underwriter.risk_level_assessed}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Monthly Decisions</Label>
                      <p className="text-sm">{underwriter.policy_decisions_monthly}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label className="text-sm font-medium">State</Label>
                      <p className="text-sm">{underwriter.state}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Certifications</Label>
                      <Badge variant="outline">{underwriter.certifications}</Badge>
                    </div>
                  </div>

                  {underwriter.risk_analysis && (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <Label className="flex items-center gap-2 text-sm font-medium mb-2">
                        <Shield className="h-4 w-4" />
                        AI Risk Analysis
                      </Label>
                      <div className="space-y-2">
                        <p><strong>Risk Score:</strong> {underwriter.risk_analysis.risk_score}/10</p>
                        <p><strong>Performance Rating:</strong> {underwriter.risk_analysis.performance_rating}</p>
                        <p><strong>Recommendations:</strong> {underwriter.risk_analysis.recommendations}</p>
                        <p><strong>Key Insights:</strong> {underwriter.risk_analysis.insights}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            
            {underwriters.length === 0 && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    No underwriter profiles created yet. Create one to get started.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnderwriterProfile;