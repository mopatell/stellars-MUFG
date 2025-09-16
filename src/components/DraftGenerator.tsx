import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { FileText, Sparkles, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DraftGeneratorProps {
  onDraftCreated: () => void;
}

const DraftGenerator = ({ onDraftCreated }: DraftGeneratorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [clauses, setClauses] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    selectedDataset: '',
    selectedClauses: [] as string[],
    additionalInstructions: '',
    generatedContent: ''
  });

  useEffect(() => {
    if (user) {
      fetchDatasets();
      fetchClauses();
    }
  }, [user]);

  const fetchDatasets = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('datasets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    setDatasets(data || []);
  };

  const fetchClauses = async () => {
    const { data } = await supabase
      .from('clauses')
      .select('*')
      .order('title');
    
    setClauses(data || []);
  };

  const generateDraft = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const selectedDataset = datasets.find(d => d.id === formData.selectedDataset);
      const selectedClauseData = clauses.filter(c => formData.selectedClauses.includes(c.id));
      
      const response = await supabase.functions.invoke('generate-policy-draft', {
        body: {
          title: formData.title,
          dataset: selectedDataset,
          clauses: selectedClauseData,
          instructions: formData.additionalInstructions
        }
      });

      if (response.error) throw response.error;

      setFormData(prev => ({
        ...prev,
        generatedContent: response.data.content
      }));

      toast({
        title: "Draft generated successfully",
        description: "AI has generated your policy draft based on the selected data and clauses."
      });
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate policy draft",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async () => {
    if (!user || !formData.generatedContent) return;
    
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('policy_drafts')
        .insert([
          {
            user_id: user.id,
            title: formData.title,
            content: formData.generatedContent,
            selected_clauses: formData.selectedClauses,
            compliance_status: 'pending',
            status: 'draft'
          }
        ]);

      if (error) throw error;

      toast({
        title: "Draft saved successfully",
        description: "Your policy draft has been saved and is ready for review."
      });

      // Reset form
      setFormData({
        title: '',
        selectedDataset: '',
        selectedClauses: [],
        additionalInstructions: '',
        generatedContent: ''
      });

      onDraftCreated();
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message || "Failed to save policy draft",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleClause = (clauseId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedClauses: prev.selectedClauses.includes(clauseId)
        ? prev.selectedClauses.filter(id => id !== clauseId)
        : [...prev.selectedClauses, clauseId]
    }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Draft Generator
          </CardTitle>
          <CardDescription>
            Generate policy drafts using AI based on your data and selected clauses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Policy Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Commercial Property Insurance Policy"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dataset">Select Dataset</Label>
            <Select value={formData.selectedDataset} onValueChange={(value) => setFormData(prev => ({ ...prev, selectedDataset: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a dataset to inform the policy" />
              </SelectTrigger>
              <SelectContent>
                {datasets.map((dataset) => (
                  <SelectItem key={dataset.id} value={dataset.id}>
                    {dataset.name} ({dataset.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Select Clauses</Label>
            <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-3">
              {clauses.map((clause) => (
                <div key={clause.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={clause.id}
                    checked={formData.selectedClauses.includes(clause.id)}
                    onChange={() => toggleClause(clause.id)}
                    className="rounded"
                  />
                  <label htmlFor={clause.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {clause.title} ({clause.category})
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Additional Instructions</Label>
            <Textarea
              id="instructions"
              value={formData.additionalInstructions}
              onChange={(e) => setFormData(prev => ({ ...prev, additionalInstructions: e.target.value }))}
              placeholder="Any specific requirements or considerations for the policy..."
              rows={4}
            />
          </div>

          <Button 
            onClick={generateDraft} 
            className="w-full" 
            disabled={loading || !formData.title || !formData.selectedDataset}
          >
            {loading ? "Generating..." : "Generate Policy Draft"}
          </Button>
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generated Draft Preview
          </CardTitle>
          <CardDescription>
            Review and edit your AI-generated policy draft
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.generatedContent ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="content">Policy Content</Label>
                <Textarea
                  id="content"
                  value={formData.generatedContent}
                  onChange={(e) => setFormData(prev => ({ ...prev, generatedContent: e.target.value }))}
                  rows={20}
                  className="font-mono text-sm"
                />
              </div>

              <Separator />

              <div className="flex space-x-2">
                <Button onClick={saveDraft} disabled={loading}>
                  Save Draft
                </Button>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Generate a draft to see the preview here</p>
              <p className="text-sm">Select your data and clauses, then click "Generate Policy Draft"</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DraftGenerator;