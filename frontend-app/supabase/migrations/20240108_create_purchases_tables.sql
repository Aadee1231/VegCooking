-- Create purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  purchase_token TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create thank_you_emails table
CREATE TABLE IF NOT EXISTS thank_you_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  product_id TEXT NOT NULL,
  tier_name TEXT NOT NULL,
  email_content TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed'))
);

-- Create user_support_status table to track supporter badges and benefits
CREATE TABLE IF NOT EXISTS user_support_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  total_amount DECIMAL(10,2) DEFAULT 0,
  highest_tier TEXT,
  supporter_badge TEXT,
  benefits_access TEXT[], -- JSON array of benefits
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at);
CREATE INDEX IF NOT EXISTS idx_thank_you_emails_user_id ON thank_you_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_user_support_status_user_id ON user_support_status(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE thank_you_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_support_status ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own purchases
CREATE POLICY "Users can view own purchases" ON purchases
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own purchases
CREATE POLICY "Users can insert own purchases" ON purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own purchases
CREATE POLICY "Users can update own purchases" ON purchases
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only see their own thank you emails
CREATE POLICY "Users can view own thank you emails" ON thank_you_emails
  FOR SELECT USING (auth.uid() = user_id);

-- Service can insert thank you emails for any user
CREATE POLICY "Service can insert thank you emails" ON thank_you_emails
  FOR INSERT WITH CHECK (true);

-- Users can only see their own support status
CREATE POLICY "Users can view own support status" ON user_support_status
  FOR SELECT USING (auth.uid() = user_id);

-- Service can manage support status
CREATE POLICY "Service can manage support status" ON user_support_status
  FOR ALL USING (true);

-- Create function to update user support status after purchase
CREATE OR REPLACE FUNCTION update_user_support_status()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_support_status (user_id, total_amount, highest_tier, supporter_badge, benefits_access)
  VALUES (
    NEW.user_id,
    NEW.amount,
    CASE 
      WHEN NEW.product_id = 'flavur_support_coffee' THEN 'Coffee'
      WHEN NEW.product_id = 'flavur_support_lunch' THEN 'Lunch'
      WHEN NEW.product_id = 'flavur_support_dinner' THEN 'Dinner'
      WHEN NEW.product_id = 'flavur_support_groceries' THEN 'Groceries'
      WHEN NEW.product_id = 'flavur_support_feast' THEN 'Feast'
      ELSE 'Supporter'
    END,
    CASE 
      WHEN NEW.product_id = 'flavur_support_coffee' THEN 'Coffee Supporter'
      WHEN NEW.product_id = 'flavur_support_lunch' THEN 'Lunch Supporter'
      WHEN NEW.product_id = 'flavur_support_dinner' THEN 'Dinner Supporter'
      WHEN NEW.product_id = 'flavur_support_groceries' THEN 'Groceries Supporter'
      WHEN NEW.product_id = 'flavur_support_feast' THEN 'Feast Supporter'
      ELSE 'Supporter'
    END,
    CASE 
      WHEN NEW.product_id = 'flavur_support_coffee' THEN ARRAY['thank_you_note', 'good_vibes']
      WHEN NEW.product_id = 'flavur_support_lunch' THEN ARRAY['thank_you_email', 'supporter_recognition']
      WHEN NEW.product_id = 'flavur_support_dinner' THEN ARRAY['thank_you_email', 'supporter_recognition']
      WHEN NEW.product_id = 'flavur_support_groceries' THEN ARRAY['thank_you_email', 'supporter_recognition']
      WHEN NEW.product_id = 'flavur_support_feast' THEN ARRAY['thank_you_email', 'supporter_recognition', 'personal_thank_you']
      ELSE ARRAY['thank_you_note']
    END
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    total_amount = user_support_status.total_amount + NEW.amount,
    highest_tier = GREATEST(
      user_support_status.highest_tier,
      CASE 
        WHEN NEW.product_id = 'flavur_support_coffee' THEN 'Coffee'
        WHEN NEW.product_id = 'flavur_support_lunch' THEN 'Lunch'
        WHEN NEW.product_id = 'flavur_support_dinner' THEN 'Dinner'
        WHEN NEW.product_id = 'flavur_support_groceries' THEN 'Groceries'
        WHEN NEW.product_id = 'flavur_support_feast' THEN 'Feast'
        ELSE 'Supporter'
      END
    ),
    supporter_badge = CASE 
      WHEN NEW.product_id = 'flavur_support_feast' THEN 'Feast Supporter'
      WHEN NEW.product_id = 'flavur_support_groceries' THEN 'Groceries Supporter'
      WHEN NEW.product_id = 'flavur_support_dinner' THEN 'Dinner Supporter'
      WHEN NEW.product_id = 'flavur_support_lunch' THEN 'Lunch Supporter'
      WHEN NEW.product_id = 'flavur_support_coffee' THEN 'Coffee Supporter'
      ELSE 'Supporter'
    END,
    benefits_access = CASE 
      WHEN NEW.product_id = 'flavur_support_feast' THEN ARRAY['thank_you_email', 'supporter_recognition', 'personal_thank_you']
      WHEN NEW.product_id = 'flavur_support_groceries' THEN ARRAY['thank_you_email', 'supporter_recognition']
      WHEN NEW.product_id = 'flavur_support_dinner' THEN ARRAY['thank_you_email', 'supporter_recognition']
      WHEN NEW.product_id = 'flavur_support_lunch' THEN ARRAY['thank_you_email', 'supporter_recognition']
      ELSE ARRAY['thank_you_note', 'good_vibes']
    END,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update support status after purchase
CREATE TRIGGER update_support_status_trigger
  AFTER INSERT ON purchases
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION update_user_support_status();
