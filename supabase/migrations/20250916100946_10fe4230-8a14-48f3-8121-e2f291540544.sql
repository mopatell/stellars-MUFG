-- Create underwriters table
CREATE TABLE public.underwriters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  underwriter_id TEXT NOT NULL,
  name TEXT NOT NULL,
  insurance_type TEXT NOT NULL,
  years_experience INTEGER NOT NULL,
  risk_level_assessed TEXT NOT NULL,
  policy_decisions_monthly INTEGER NOT NULL,
  state TEXT NOT NULL,
  certifications TEXT NOT NULL,
  risk_analysis JSONB NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, underwriter_id)
);

-- Enable Row Level Security
ALTER TABLE public.underwriters ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own underwriters" 
ON public.underwriters 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own underwriters" 
ON public.underwriters 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own underwriters" 
ON public.underwriters 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own underwriters" 
ON public.underwriters 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_underwriters_updated_at
BEFORE UPDATE ON public.underwriters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();