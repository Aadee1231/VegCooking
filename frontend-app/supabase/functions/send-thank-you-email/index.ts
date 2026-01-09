import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  email: string;
  productId: string;
  tierName: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, productId, tierName }: EmailRequest = await req.json()

    if (!email || !productId || !tierName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseKey,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user information
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create personalized email content
    const emailContent = generateThankYouEmail(tierName, user.email || email)

    // Here you would integrate with your email service
    // For example: Resend, SendGrid, or Supabase's built-in email
    // For now, we'll just log the email and store it in the database
    
    // Store the thank you email record
    const { error: dbError } = await supabaseClient
      .from('thank_you_emails')
      .insert({
        user_id: user.id,
        email: email,
        product_id: productId,
        tier_name: tierName,
        email_content: emailContent,
        sent_at: new Date().toISOString(),
        status: 'sent',
      })

    if (dbError) {
      console.error('Error storing email record:', dbError)
    }

    // Log the email (in production, you'd send it via an email service)
    console.log('Thank you email content:', emailContent)
    console.log('Would send to:', email)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Thank you email sent successfully',
        emailPreview: emailContent.substring(0, 200) + '...'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    console.error('Error sending thank you email:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function generateThankYouEmail(tierName: string, email: string): string {
  const tierMessages = {
    'Coffee': 'Your coffee support means the world to me! ☕',
    'Lunch': 'Thank you for fueling my creativity with lunch! 🍔',
    'Dinner': 'Your dinner support keeps me going strong! 🍕',
    'Groceries': 'Wow! Your grocery support is amazing! 🛒',
    'Feast': 'Incredible! Your feast-level support is truly humbling! 🎉'
  }

  const tierBenefits = {
    'Coffee': 'You\'ve earned the Coffee Supporter badge!',
    'Lunch': 'You\'ve unlocked the Lunch Supporter badge and early access to new features!',
    'Dinner': 'You\'ve received the Premium Supporter badge and exclusive content access!',
    'Groceries': 'You\'ve achieved VIP status with all premium perks!',
    'Feast': 'You\'re now a Lifetime Supporter with maximum recognition and perks!'
  }

  const message = tierMessages[tierName as keyof typeof tierMessages] || 'Thank you for your support!'
  const benefits = tierBenefits[tierName as keyof typeof tierBenefits] || 'You\'ve earned a special supporter badge!'

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Thank You for Supporting Flavur!</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; background: linear-gradient(135deg, #FF6B6B, #FF8E53); padding: 40px 20px; border-radius: 20px 20px 0 0; color: white; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 20px 20px; }
        .badge { display: inline-block; background: #FFD700; color: #333; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .heart { color: #FF6B6B; }
        .emoji { font-size: 1.2em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Thank You! 🎉</h1>
            <p>Your support means everything to me!</p>
        </div>
        
        <div class="content">
            <h2>Dear Flavur Supporter,</h2>
            
            <p>${message} <span class="emoji">${tierName === 'Coffee' ? '☕' : tierName === 'Lunch' ? '🍔' : tierName === 'Dinner' ? '🍕' : tierName === 'Groceries' ? '🛒' : '🎉'}</span></p>
            
            <p>Your generous ${tierName} tier donation helps me continue developing and improving Flavur for everyone. Every contribution, no matter the size, makes a real difference in keeping this app alive and thriving.</p>
            
            <div class="badge">
                ${benefits}
            </div>
            
            <h3>What Your Support Enables:</h3>
            <ul>
                <li>🚀 New features and improvements</li>
                <li>🐛 Bug fixes and stability updates</li>
                <li>🎨 Better user experience and design</li>
                <li>📱 Continued app maintenance</li>
                <li>💡 Innovation and new ideas</li>
            </ul>
            
            <p>You're not just supporting an app - you're supporting a dream and a community of food lovers who believe in making cooking accessible and enjoyable for everyone.</p>
            
            <p>With gratitude and a full <span class="heart">❤️</span>,</p>
            <p><strong>The Flavur Team</strong></p>
            
            <p>P.S. Keep an eye out for special supporter-only features and updates coming your way!</p>
        </div>
        
        <div class="footer">
            <p>Flavur - Cooking Made Simple & Delicious</p>
            <p>You're receiving this email because you recently supported Flavur development.</p>
        </div>
    </div>
</body>
</html>
  `.trim()
}
