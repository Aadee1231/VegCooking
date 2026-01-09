# Support the Developer Feature

## Overview
This feature allows users to support the development of Flavur through in-app purchases with a beautiful, animated UI and multiple donation tiers.

## Features Implemented

### 🎨 UI Components
- **Support Button**: Animated button with gradient effects, pulse animations, and easter eggs
- **Donation Modal**: Beautiful modal with 5 donation tiers, smooth animations, and confetti effects
- **Responsive Design**: Works across all screen sizes and orientations

### 💳 In-App Purchases
- **5 Donation Tiers**:
  - ☕ Coffee - $0.99
  - 🍔 Lunch - $4.99  
  - 🍕 Dinner - $9.99 (Most Popular)
  - 🛒 Groceries - $19.99
  - 🎉 Feast - $49.99

### 🎭 Animations & Easter Eggs
- **Support Button**:
  - Continuous pulse animation
  - Glow effect
  - Sparkle animations on click
  - Special effects after 3+ clicks
  - Premium sparkle effects after 5+ clicks
  
- **Donation Modal**:
  - Smooth slide-up animation
  - Tier selection animations
  - Confetti effect for highest tier (Feast)
  - Popular badge for Dinner tier

### 📧 Thank You System
- **Automated Emails**: Personalized thank you emails sent via Supabase Edge Functions
- **Database Tracking**: All purchases and emails tracked in Supabase
- **Supporter Badges**: Users earn badges based on their support level

### 🏆 Supporter Benefits
- **Coffee**: Thank you note, good vibes
- **Lunch**: Thank you email, supporter badge, early features
- **Dinner**: Thank you email, premium badge, exclusive content, early features
- **Groceries**: All above + VIP badge, beta access
- **Feast**: All above + lifetime supporter, special recognition, personal thank you

## File Structure

```
components/
├── support-button.tsx          # Animated support button component
└── donation-modal.tsx          # Donation modal with tiers

src/services/
└── in-app-purchases.ts         # In-app purchase service

supabase/
├── functions/
│   └── send-thank-you-email/
│       └── index.ts           # Email sending edge function
└── migrations/
    └── 20240108_create_purchases_tables.sql  # Database schema

app/tabs/
└── _layout.tsx                # Updated to include support button
```

## Technical Implementation

### Dependencies Added
- `expo-in-app-purchases`: For handling in-app purchases
- Uses existing: `expo-linear-gradient`, `expo-haptics`, `react-native-reanimated`

### Database Schema
- **purchases**: Tracks all user purchases
- **thank_you_emails**: Logs sent thank you emails
- **user_support_status**: Tracks supporter badges and benefits

### Product IDs
- `flavur_support_coffee`
- `flavur_support_lunch`
- `flavur_support_dinner`
- `flavur_support_groceries`
- `flavur_support_feast`

## Setup Instructions

### 1. Store Configuration
Configure these product IDs in your app stores:
- Google Play Console
- Apple App Store Connect

### 2. Supabase Setup
Run the migration file to create the necessary tables:
```sql
-- Run the migration in supabase/migrations/20240108_create_purchases_tables.sql
```

### 3. Edge Function Deployment
Deploy the email function:
```bash
supabase functions deploy send-thank-you-email
```

### 4. Environment Variables
Ensure these are set in your `.env` file:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Usage

### For Users
1. Tap the animated "Support" button (top-left corner)
2. Browse the 5 donation tiers
3. Select a tier and complete purchase
4. Receive personalized thank you email
5. Enjoy supporter benefits and badges

### For Developers
The system automatically:
- Processes purchases via expo-in-app-purchases
- Stores purchase data in Supabase
- Sends personalized thank you emails
- Updates supporter status and badges
- Tracks user benefits and access levels

## Easter Eggs & Special Features

### Support Button Easter Eggs
- **3+ clicks**: Floating particles appear
- **5+ clicks**: Golden sparkles and premium effects
- **Special haptics**: Different feedback levels based on interaction

### Donation Modal Special Effects
- **Feast tier**: Triggers confetti animation
- **Popular badge**: Highlights the Dinner tier
- **Smooth transitions**: All interactions have polished animations

### Email Personalization
- Dynamic content based on tier level
- Personalized benefits list
- Beautiful HTML email design
- Emoji-rich content for visual appeal

## Testing

### Development Testing
The app includes fallback behavior for testing without real store connectivity:
- Simulated purchase flow
- Mock purchase responses
- Email logging instead of sending

### Production Testing
- Test with actual store sandbox environments
- Verify email delivery
- Confirm badge and benefit assignment
- Test purchase restoration flow

## Future Enhancements

### Planned Features
- [ ] Supporter-only content sections
- [ ] Leaderboard for top supporters
- [ ] Anniversary emails for long-term supporters
- [ ] Referral system for supporter growth
- [ ] Custom supporter profiles

### Technical Improvements
- [ ] Purchase analytics dashboard
- [ ] A/B testing for tier pricing
- [ ] Multi-currency support
- [ ] Subscription-based support options

## Support & Maintenance

### Monitoring
- Monitor purchase success rates
- Track email delivery metrics
- Watch for failed transactions
- Monitor supporter engagement

### Updates
- Regularly update tier pricing
- Refresh email content
- Add new benefits and features
- Maintain store product listings

---

## Contributing

When contributing to the support feature:
1. Test animations on multiple devices
2. Verify purchase flows end-to-end
3. Test email content and delivery
4. Ensure database integrity
5. Maintain visual consistency

## License

This feature is part of the Flavur app and follows the same licensing terms.
