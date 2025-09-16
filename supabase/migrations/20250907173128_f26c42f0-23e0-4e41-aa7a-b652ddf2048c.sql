-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT DEFAULT 'underwriter',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create datasets table
CREATE TABLE public.datasets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('location', 'climate', 'disaster', 'market')),
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on datasets
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;

-- Create policies for datasets
CREATE POLICY "Users can manage their own datasets" 
ON public.datasets 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create clauses table
CREATE TABLE public.clauses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on clauses (public read access for now)
ALTER TABLE public.clauses ENABLE ROW LEVEL SECURITY;

-- Create policy for clauses (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view clauses" 
ON public.clauses 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Create policy drafts table
CREATE TABLE public.policy_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  selected_clauses UUID[] DEFAULT '{}',
  compliance_status TEXT DEFAULT 'pending' CHECK (compliance_status IN ('pending', 'compliant', 'non_compliant')),
  risk_alerts JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on policy drafts
ALTER TABLE public.policy_drafts ENABLE ROW LEVEL SECURITY;

-- Create policies for policy drafts
CREATE POLICY "Users can manage their own policy drafts" 
ON public.policy_drafts 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create audit logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_draft_id UUID REFERENCES public.policy_drafts(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  changes JSONB,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for audit logs
CREATE POLICY "Users can view their own audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_datasets_updated_at
  BEFORE UPDATE ON public.datasets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clauses_updated_at
  BEFORE UPDATE ON public.clauses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_policy_drafts_updated_at
  BEFORE UPDATE ON public.policy_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample clauses
INSERT INTO public.clauses (title, content, category, tags, risk_level, is_required) VALUES
('Property Damage Coverage', 'This policy covers damage to the insured property caused by covered perils including fire, wind, hail, and lightning.', 'Property', '{"property", "damage", "fire", "wind"}', 'medium', true),
('Liability Protection', 'The insurer agrees to defend and indemnify the insured against claims for bodily injury or property damage arising from the insured premises.', 'Liability', '{"liability", "bodily injury", "property damage"}', 'high', true),
('Natural Disaster Exclusion', 'This policy excludes coverage for damage caused by earthquakes, floods, and other acts of nature unless specifically endorsed.', 'Exclusions', '{"natural disaster", "earthquake", "flood"}', 'high', false),
('Climate Change Rider', 'Additional coverage for losses directly attributable to climate change events including extreme weather patterns.', 'Climate', '{"climate change", "extreme weather"}', 'high', false),
('Business Interruption', 'Coverage for loss of income resulting from covered damage that prevents normal business operations.', 'Business', '{"business interruption", "income", "operations"}', 'medium', false),
('Cyber Security Coverage', 'Protection against losses from cyber attacks, data breaches, and network security failures.', 'Cyber', '{"cyber", "data breach", "security"}', 'high', false);