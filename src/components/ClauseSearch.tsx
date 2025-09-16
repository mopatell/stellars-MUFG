import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Clause {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  risk_level: string;
  is_required: boolean;
}

const ClauseSearch = () => {
  const { toast } = useToast();
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [filteredClauses, setFilteredClauses] = useState<Clause[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [selectedClauses, setSelectedClauses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClauses();
  }, []);

  useEffect(() => {
    filterClauses();
  }, [clauses, searchQuery, categoryFilter, riskFilter]);

  const fetchClauses = async () => {
    try {
      const { data, error } = await supabase
        .from('clauses')
        .select('*')
        .order('title');

      if (error) throw error;
      setClauses(data || []);
    } catch (error: any) {
      toast({
        title: "Failed to fetch clauses",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterClauses = () => {
    let filtered = clauses;

    // Text search
    if (searchQuery) {
      filtered = filtered.filter(clause =>
        clause.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        clause.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        clause.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(clause => clause.category === categoryFilter);
    }

    // Risk level filter
    if (riskFilter !== 'all') {
      filtered = filtered.filter(clause => clause.risk_level === riskFilter);
    }

    setFilteredClauses(filtered);
  };

  const toggleClauseSelection = (clauseId: string) => {
    setSelectedClauses(prev =>
      prev.includes(clauseId)
        ? prev.filter(id => id !== clauseId)
        : [...prev, clauseId]
    );
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUniqueCategories = () => {
    const categories = clauses.map(clause => clause.category);
    return [...new Set(categories)];
  };

  if (loading) {
    return <div className="text-center py-8">Loading clauses...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Clause Library Search
          </CardTitle>
          <CardDescription>
            Search and filter insurance clauses for your policy drafts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Search clauses by title, content, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {getUniqueCategories().map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="low">Low Risk</SelectItem>
                <SelectItem value="medium">Medium Risk</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedClauses.length > 0 && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {selectedClauses.length} clause(s) selected
                </span>
                <div className="space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedClauses([])}>
                    Clear Selection
                  </Button>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add to Draft
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Results */}
      <div className="grid grid-cols-1 gap-4">
        {filteredClauses.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No clauses found matching your criteria.</p>
            </CardContent>
          </Card>
        ) : (
          filteredClauses.map((clause) => (
            <Card 
              key={clause.id} 
              className={`cursor-pointer transition-colors ${
                selectedClauses.includes(clause.id) ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => toggleClauseSelection(clause.id)}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-medium text-lg">{clause.title}</h3>
                  <div className="flex gap-2">
                    {clause.is_required && (
                      <Badge variant="secondary">Required</Badge>
                    )}
                    <Badge className={getRiskColor(clause.risk_level)}>
                      {clause.risk_level} risk
                    </Badge>
                    <Badge variant="outline">{clause.category}</Badge>
                  </div>
                </div>
                
                <p className="text-muted-foreground mb-3 line-clamp-3">
                  {clause.content}
                </p>
                
                <div className="flex flex-wrap gap-1">
                  {clause.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* AI-Powered Search Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            AI Search Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              "flood coverage",
              "cyber security",
              "climate change",
              "business interruption",
              "liability protection",
              "natural disasters",
              "property damage",
              "risk assessment"
            ].map((suggestion) => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery(suggestion)}
                className="justify-start"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClauseSearch;