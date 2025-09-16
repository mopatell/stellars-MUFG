import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, dataset, clauses, instructions } = await req.json();

    console.log('Generating policy draft with Gemini:', { title, dataset: dataset?.name, clauseCount: clauses?.length });

    // Prepare the prompt for Gemini
    const systemPrompt = `You are an expert insurance underwriter and policy writer. Generate a comprehensive insurance policy draft based on the provided information.

Guidelines:
1. Create a professional, legally sound insurance policy
2. Incorporate all selected clauses appropriately
3. Consider the dataset information for risk assessment
4. Follow standard insurance policy structure
5. Use clear, precise language
6. Include appropriate disclaimers and conditions`;

    const userPrompt = `Generate an insurance policy draft with the following specifications:

POLICY TITLE: ${title}

DATASET INFORMATION:
${dataset ? `
Name: ${dataset.name}
Type: ${dataset.type}
Data: ${JSON.stringify(dataset.data, null, 2)}
` : 'No specific dataset provided'}

SELECTED CLAUSES:
${clauses && clauses.length > 0 ? 
  clauses.map((clause: any) => `
- ${clause.title} (${clause.category}, Risk: ${clause.risk_level})
  Content: ${clause.content}
`).join('\n') : 'No specific clauses selected'}

ADDITIONAL INSTRUCTIONS:
${instructions || 'None provided'}

Please generate a complete insurance policy draft that:
1. Has a professional structure with clear sections
2. Incorporates the relevant clauses
3. Addresses risks identified in the dataset
4. Follows industry best practices
5. Is between 800-1500 words

Format the policy with clear headers and sections.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt + '\n\n' + userPrompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', errorData);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Gemini response received');

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response format from Gemini API');
    }

    const generatedText = data.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ 
      content: generatedText,
      metadata: {
        model: 'gemini-1.5-flash',
        title,
        clauseCount: clauses?.length || 0,
        hasDataset: !!dataset
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-policy-draft function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to generate policy draft with Gemini AI'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});