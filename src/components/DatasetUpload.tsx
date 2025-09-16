import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DatasetUploadProps {
  onUploadComplete: () => void;
}

const DatasetUpload = ({ onUploadComplete }: DatasetUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    data: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    
    try {
      let parsedData;
      try {
        parsedData = JSON.parse(formData.data);
      } catch {
        // If not valid JSON, store as text
        parsedData = { content: formData.data };
      }

      const { error } = await supabase
        .from('datasets')
        .insert([
          {
            user_id: user.id,
            name: formData.name,
            type: formData.type,
            data: parsedData
          }
        ]);

      if (error) throw error;

      toast({
        title: "Dataset uploaded successfully",
        description: "Your dataset has been stored and is ready for analysis."
      });

      setFormData({ name: '', type: '', data: '' });
      onUploadComplete();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload dataset",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFormData(prev => ({ ...prev, data: content }));
    };
    reader.readAsText(file);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Dataset
          </CardTitle>
          <CardDescription>
            Upload location, climate, disaster, or market data for analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Dataset Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., California Climate Data 2024"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Dataset Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select dataset type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="location">Location Data</SelectItem>
                  <SelectItem value="climate">Climate Data</SelectItem>
                  <SelectItem value="disaster">Disaster Information</SelectItem>
                  <SelectItem value="market">Market Signals</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Upload File (CSV, JSON, TXT)</Label>
              <Input
                id="file"
                type="file"
                accept=".csv,.json,.txt"
                onChange={handleFileUpload}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data">Data Content</Label>
              <Textarea
                id="data"
                value={formData.data}
                onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
                placeholder="Paste your data here or upload a file above..."
                rows={8}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Uploading..." : "Upload Dataset"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Quick Input Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Quick Templates
          </CardTitle>
          <CardDescription>
            Use these templates to quickly input common data types
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-2">Location Data Template</h3>
            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
{`{
  "address": "123 Main St, City, State",
  "coordinates": { "lat": 40.7128, "lng": -74.0060 },
  "zone": "residential",
  "flood_risk": "moderate",
  "earthquake_risk": "low"
}`}
            </pre>
          </div>

          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-2">Climate Data Template</h3>
            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
{`{
  "temperature_trend": "increasing",
  "precipitation_change": "+15%",
  "extreme_events": ["heat_waves", "storms"],
  "sea_level_rise": "2mm/year"
}`}
            </pre>
          </div>

          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-2">Market Signals Template</h3>
            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
{`{
  "property_values": "stable",
  "insurance_rates": "+8%",
  "claims_frequency": "high",
  "market_volatility": "moderate"
}`}
            </pre>
          </div>

          <Alert>
            <AlertDescription>
              These templates help structure your data for better AI analysis and policy generation.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default DatasetUpload;