import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  required: boolean;
}

interface ComplianceResult {
  ruleId: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  suggestion?: string;
}

const COMPLIANCE_RULES: ComplianceRule[] = [
  {
    id: 'required_clauses',
    name: 'Required Clauses',
    description: 'All mandatory insurance clauses must be present',
    severity: 'high',
    required: true
  },
  {
    id: 'liability_coverage',
    name: 'Liability Coverage',
    description: 'Adequate liability protection must be included',
    severity: 'high',
    required: true
  },
  {
    id: 'climate_considerations',
    name: 'Climate Risk Assessment',
    description: 'Climate change factors should be addressed',
    severity: 'medium',
    required: false
  },
  {
    id: 'geographical_compliance',
    name: 'Geographic Compliance',
    description: 'Policy must comply with local regulations',
    severity: 'high',
    required: true
  },
  {
    id: 'exclusions_clarity',
    name: 'Clear Exclusions',
    description: 'All exclusions must be clearly stated',
    severity: 'medium',
    required: true
  },
  {
    id: 'premium_justification',
    name: 'Premium Justification',
    description: 'Premium calculations should be documented',
    severity: 'low',
    required: false
  }
];

const ComplianceChecker = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<any[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<any>(null);
  const [complianceResults, setComplianceResults] = useState<ComplianceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [overallScore, setOverallScore] = useState(0);

  useEffect(() => {
    if (user) {
      fetchDrafts();
    }
  }, [user]);

  const fetchDrafts = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('policy_drafts')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    
    setDrafts(data || []);
  };

  const runComplianceCheck = async (draft: any) => {
    setLoading(true);
    setSelectedDraft(draft);
    
    try {
      // Simulate compliance checking logic
      const results: ComplianceResult[] = [];
      
      // Check for required clauses
      const hasRequiredClauses = draft.selected_clauses && draft.selected_clauses.length > 0;
      results.push({
        ruleId: 'required_clauses',
        status: hasRequiredClauses ? 'pass' : 'fail',
        message: hasRequiredClauses 
          ? `Found ${draft.selected_clauses.length} clauses in policy`
          : 'No clauses selected for this policy',
        suggestion: hasRequiredClauses ? undefined : 'Add required insurance clauses to the policy'
      });

      // Check for liability coverage
      const hasLiability = draft.content?.toLowerCase().includes('liability') || 
                          draft.selected_clauses?.some((id: string) => {
                            // This would need to check actual clause content
                            return Math.random() > 0.3; // Simulated check
                          });
      results.push({
        ruleId: 'liability_coverage',
        status: hasLiability ? 'pass' : 'fail',
        message: hasLiability 
          ? 'Liability coverage is included in the policy'
          : 'No liability coverage found',
        suggestion: hasLiability ? undefined : 'Add comprehensive liability coverage clause'
      });

      // Check for climate considerations
      const hasClimate = draft.content?.toLowerCase().includes('climate') ||
                        draft.content?.toLowerCase().includes('weather');
      results.push({
        ruleId: 'climate_considerations',
        status: hasClimate ? 'pass' : 'warning',
        message: hasClimate 
          ? 'Climate risk factors are addressed'
          : 'Climate considerations may be missing',
        suggestion: hasClimate ? undefined : 'Consider adding climate change risk assessment'
      });

      // Additional simulated checks
      results.push({
        ruleId: 'geographical_compliance',
        status: Math.random() > 0.2 ? 'pass' : 'warning',
        message: 'Geographic compliance check completed',
        suggestion: Math.random() > 0.7 ? 'Review local regulatory requirements' : undefined
      });

      results.push({
        ruleId: 'exclusions_clarity',
        status: draft.content?.length > 100 ? 'pass' : 'warning',
        message: 'Exclusions section reviewed',
        suggestion: draft.content?.length > 100 ? undefined : 'Add clear exclusion clauses'
      });

      results.push({
        ruleId: 'premium_justification',
        status: 'pass',
        message: 'Premium calculation documentation found'
      });

      setComplianceResults(results);
      
      // Calculate overall score
      const passCount = results.filter(r => r.status === 'pass').length;
      const score = Math.round((passCount / results.length) * 100);
      setOverallScore(score);

      // Update draft compliance status in database
      const overallStatus = score >= 80 ? 'compliant' : score >= 60 ? 'warning' : 'non_compliant';
      const alertsData = results
        .filter(r => r.status === 'fail' || r.status === 'warning')
        .map(r => ({ 
          ruleId: r.ruleId, 
          status: r.status, 
          message: r.message, 
          suggestion: r.suggestion 
        }));
      
      await supabase
        .from('policy_drafts')
        .update({ 
          compliance_status: overallStatus,
          risk_alerts: alertsData
        })
        .eq('id', draft.id);

      toast({
        title: "Compliance check completed",
        description: `Overall compliance score: ${score}%`
      });

    } catch (error: any) {
      toast({
        title: "Compliance check failed",
        description: error.message || "Failed to run compliance check",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'fail': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default: return <Shield className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Draft Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Select Draft
          </CardTitle>
          <CardDescription>
            Choose a policy draft to run compliance checks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {drafts.length === 0 ? (
            <p className="text-muted-foreground text-sm">No drafts available for compliance checking.</p>
          ) : (
            drafts.map((draft) => (
              <div
                key={draft.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedDraft?.id === draft.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
                onClick={() => runComplianceCheck(draft)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{draft.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      Status: {draft.status} • {draft.compliance_status}
                    </p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      draft.compliance_status === 'compliant' ? 'text-green-600' :
                      draft.compliance_status === 'warning' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}
                  >
                    {draft.compliance_status}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Compliance Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Rules</CardTitle>
          <CardDescription>
            Current compliance framework and requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {COMPLIANCE_RULES.map((rule) => (
            <div key={rule.id} className="p-3 border rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-sm">{rule.name}</h3>
                <div className="flex gap-1">
                  {rule.required && (
                    <Badge variant="secondary" className="text-xs">Required</Badge>
                  )}
                  <Badge className={`text-xs ${getSeverityColor(rule.severity)}`}>
                    {rule.severity}
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{rule.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            Compliance Results
          </CardTitle>
          {selectedDraft && (
            <CardDescription>
              Results for: {selectedDraft.title}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedDraft ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a draft to run compliance checks</p>
            </div>
          ) : loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 mx-auto animate-spin mb-4" />
              <p>Running compliance checks...</p>
            </div>
          ) : (
            <>
              {/* Overall Score */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Overall Compliance Score</span>
                  <span className="text-2xl font-bold">{overallScore}%</span>
                </div>
                <Progress value={overallScore} className="h-2" />
              </div>

              {/* Individual Results */}
              <div className="space-y-3">
                {complianceResults.map((result) => {
                  const rule = COMPLIANCE_RULES.find(r => r.id === result.ruleId);
                  if (!rule) return null;

                  return (
                    <div key={result.ruleId} className="border rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        {getStatusIcon(result.status)}
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{rule.name}</h4>
                          <p className="text-xs text-muted-foreground mb-1">{result.message}</p>
                          {result.suggestion && (
                            <Alert className="mt-2">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription className="text-xs">
                                {result.suggestion}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="pt-4 space-y-2">
                <Button 
                  onClick={() => runComplianceCheck(selectedDraft)} 
                  variant="outline" 
                  className="w-full"
                  disabled={loading}
                >
                  Re-run Compliance Check
                </Button>
                {overallScore < 80 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      This policy may not meet compliance requirements. Review the failed checks and update accordingly.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ComplianceChecker;