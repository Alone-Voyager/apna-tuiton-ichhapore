-- RLS Policies for inquiries table
-- These policies ensure users can only access inquiries from their organization

-- Enable RLS
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view inquiries from their organization
CREATE POLICY "Users can view inquiries from their organization"
ON public.inquiries
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.admin_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can insert inquiries for their organization
CREATE POLICY "Users can insert inquiries for their organization"
ON public.inquiries
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM public.admin_profiles 
    WHERE user_id = auth.uid()
  )
  OR organization_id IS NULL -- Allow NULL for initial creation
);

-- Policy: Users can update inquiries from their organization
CREATE POLICY "Users can update inquiries from their organization"
ON public.inquiries
FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.admin_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can delete inquiries from their organization
CREATE POLICY "Users can delete inquiries from their organization"
ON public.inquiries
FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.admin_profiles 
    WHERE user_id = auth.uid()
  )
);
