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
    const { underwriter } = await req.json();

    console.log('Analyzing underwriter risk with Gemini:', underwriter.name);

    // Prepare the prompt for Gemini
    const systemPrompt = `You are an expert insurance risk analyst and underwriter performance evaluator. Analyze the underwriter's profile and provide a comprehensive risk assessment.

Guidelines:
1. Evaluate the underwriter's experience, performance, and risk patterns
2. Consider their specialization, workload, and geographic factors
3. Assess certification level and professional qualifications
4. Provide a numerical risk score (1-10, where 10 is highest risk)
5. Give performance rating and actionable recommendations
6. Consider insurance market trends and regulatory factors

Response should be in JSON format with: risk_score, performance_rating, recommendations, insights, risk_factors, strengths`;

    const userPrompt = `Analyze this underwriter's risk profile:

UNDERWRITER DETAILS:
- ID: ${underwriter.underwriter_id}
- Name: ${underwriter.name}
- Insurance Type: ${underwriter.insurance_type}
- Years of Experience: ${underwriter.years_experience}
- Risk Level They Assess: ${underwriter.risk_level_assessed}
- Monthly Policy Decisions: ${underwriter.policy_decisions_monthly}
- State: ${underwriter.state}
- Certifications: ${underwriter.certifications}

Please provide a comprehensive risk analysis focusing on:
1. Risk Score (1-10): Overall risk level based on experience, workload, and specialization
2. Performance Rating: Excellent/Good/Average/Needs Improvement
3. Key Risk Factors: Specific areas of concern
4. Strengths: Areas where the underwriter excels
5. Recommendations: Actionable advice for improvement or optimization
6. Market Insights: How this profile fits current insurance market trends

Format your response as a JSON object with the following structure:
{
  "risk_score": number,
  "performance_rating": "string",
  "risk_factors": ["array of risk factors"],
  "strengths": ["array of strengths"],
  "recommendations": "detailed recommendations",
  "insights": "market and performance insights"
}`;

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
          temperature: 0.3,
          topK: 32,
          topP: 0.95,
          maxOutputTokens: 1024,
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
    
    // Try to parse the JSON response
    let analysisResult;
    try {
      // Clean up the response to extract JSON
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback if JSON parsing fails
        analysisResult = {
          risk_score: 5,
          performance_rating: "Good",
          risk_factors: ["Analysis parsing error"],
          strengths: ["Standard profile"],
          recommendations: generatedText.substring(0, 200) + "...",
          insights: "Unable to parse detailed analysis"
        };
      }
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      // Fallback response
      analysisResult = {
        risk_score: 5,
        performance_rating: "Good",
        risk_factors: ["Analysis parsing error"],
        strengths: ["Standard profile"],
        recommendations: "Review underwriter performance and adjust workload as needed.",
        insights: "Standard risk profile for " + underwriter.insurance_type + " insurance underwriter."
      };
    }

    return new Response(JSON.stringify({ 
      analysis: analysisResult,
      metadata: {
        model: 'gemini-1.5-flash',
        underwriter_id: underwriter.underwriter_id,
        analyzed_at: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-underwriter-risk function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to analyze underwriter risk with Gemini AI'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});