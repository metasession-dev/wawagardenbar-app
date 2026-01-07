# WhatsApp PIN - Quick Reference

## 🚀 Quick Start

### 1. Environment Setup
```env
ENABLE_WHATSAPP_NOTIFICATIONS=true
WHATSAPP_PHONE_NUMBER_ID=your_id
WHATSAPP_ACCESS_TOKEN=your_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token
```

### 2. Test Locally
```bash
# Start app
npm run dev

# In another terminal, expose webhook
ngrok http 3000

# Update webhook URL in Meta dashboard
https://your-ngrok-url.ngrok.io/api/webhooks/whatsapp
```

### 3. Send Test PIN
1. Go to http://localhost:3000/login
2. Select "WhatsApp"
3. Enter test phone number
4. Check WhatsApp for PIN

## 📁 File Structure

```
lib/
  └── whatsapp.ts                    # WhatsApp service class

app/
  ├── actions/auth/
  │   ├── send-whatsapp-pin.ts       # Send PIN action
  │   └── verify-whatsapp-pin.ts     # Verify PIN action
  └── api/webhooks/whatsapp/
      └── route.ts                   # Webhook endpoint

components/shared/auth/
  └── login-form.tsx                 # Updated with WhatsApp UI

docs/
  ├── whatsapp-pin.md                # Full requirements
  ├── whatsapp-setup-guide.md        # Setup instructions
  ├── whatsapp-implementation-summary.md  # Implementation details
  └── whatsapp-quick-reference.md    # This file
```

## 🔧 Key Functions

### Send PIN
```typescript
import { sendWhatsAppPinAction } from '@/app/actions/auth';

const result = await sendWhatsAppPinAction('+2348012345678');
if (result.success) {
  // PIN sent successfully
} else {
  // Handle error: result.errorCode, result.message
  // Offer fallback: result.canRetryWithSMS, result.canRetryWithEmail
}
```

### Verify PIN
```typescript
import { verifyWhatsAppPinAction } from '@/app/actions/auth';

const result = await verifyWhatsAppPinAction('+2348012345678', '1234');
if (result.success) {
  // User authenticated, session created
} else {
  // Invalid or expired PIN
}
```

### Send Custom Message
```typescript
import { WhatsAppService } from '@/lib/whatsapp';

const result = await WhatsAppService.sendMessage(
  '+2348012345678',
  'template_name',
  ['param1', 'param2']
);
```

## 🎯 Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `NOT_ON_WHATSAPP` | Phone not registered | Offer SMS/Email |
| `TEMPLATE_NOT_FOUND` | Template not approved | Check Meta dashboard |
| `QUOTA_EXCEEDED` | Rate limit reached | Offer SMS/Email |
| `INVALID_PHONE` | Bad phone format | Validate input |
| `SERVICE_DISABLED` | WhatsApp disabled | Check env vars |
| `MISSING_CREDENTIALS` | Config incomplete | Check env vars |

## 🔍 Debugging

### Check Logs
```bash
# Server logs
tail -f logs/app.log | grep WhatsApp

# Webhook events
tail -f logs/app.log | grep webhook
```

### Test Webhook
```bash
curl -X POST http://localhost:3000/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### Verify Configuration
```typescript
// In browser console or Node REPL
console.log({
  enabled: process.env.ENABLE_WHATSAPP_NOTIFICATIONS,
  phoneId: process.env.WHATSAPP_PHONE_NUMBER_ID?.slice(0, 5) + '...',
  hasToken: !!process.env.WHATSAPP_ACCESS_TOKEN,
  hasVerifyToken: !!process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
});
```

## 📊 Monitoring

### Key Metrics
- Delivery success rate: Target 99%+
- Average delivery time: Target < 5 seconds
- Fallback rate: Target < 5%
- API quota usage: Monitor daily

### Alerts
- Delivery failures > 10%
- API quota > 80%
- Webhook errors
- Template rejection

## 🐛 Common Issues

### Issue: "Template not found"
```bash
# Check template status in Meta dashboard
# Ensure template name matches exactly
echo $WHATSAPP_PIN_TEMPLATE_NAME
```

### Issue: "Webhook verification failed"
```bash
# Verify tokens match
echo $WHATSAPP_WEBHOOK_VERIFY_TOKEN
# Check webhook URL is accessible
curl https://yourdomain.com/api/webhooks/whatsapp
```

### Issue: "Phone not on WhatsApp"
```typescript
// Ensure phone format is correct
const phone = '+2348012345678'; // Include country code
// For testing, add to test recipients in Meta dashboard
```

### Issue: "Invalid access token"
```bash
# Regenerate token in Meta dashboard
# Update .env file
# Restart application
npm run dev
```

## 🔐 Security Checklist

- [ ] Access token in environment variables (not code)
- [ ] Webhook verify token is random and secure
- [ ] HTTPS enabled for webhook endpoint
- [ ] Rate limiting implemented
- [ ] Webhook signature validation (optional)
- [ ] Two-factor auth on Meta account
- [ ] Regular token rotation

## 📱 Testing Checklist

- [ ] Send PIN (success)
- [ ] Send PIN (phone not on WhatsApp)
- [ ] Verify PIN (correct)
- [ ] Verify PIN (incorrect)
- [ ] Verify PIN (expired)
- [ ] Resend PIN
- [ ] Fallback to SMS
- [ ] Fallback to Email
- [ ] Webhook delivery status
- [ ] International phone numbers

## 🚢 Deployment Steps

1. **Meta Setup:**
   - Create Meta Business Account
   - Add WhatsApp product
   - Verify business
   - Create message template
   - Get template approved

2. **Configuration:**
   - Set production environment variables
   - Update webhook URL
   - Test in staging

3. **Monitoring:**
   - Set up alerts
   - Monitor delivery rates
   - Track API usage
   - Review costs

4. **Go Live:**
   - Enable for all users
   - Monitor closely
   - Collect feedback
   - Optimize as needed

## 📚 Resources

- [Setup Guide](./whatsapp-setup-guide.md)
- [Full Requirements](./whatsapp-pin.md)
- [Implementation Summary](./whatsapp-implementation-summary.md)
- [Meta WhatsApp Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)

## 💡 Tips

- Use ngrok for local webhook testing
- Add test numbers in Meta dashboard for sandbox testing
- Monitor webhook logs for delivery issues
- Keep access tokens secure and rotate regularly
- Test with multiple phone numbers and countries
- Set up billing alerts to avoid unexpected costs
- Use permanent System User tokens for production

## 🆘 Support

- **Technical Issues:** Development team
- **Meta API Issues:** [Meta Business Support](https://business.facebook.com/help)
- **Template Approval:** Meta Business Support
- **Billing Questions:** Meta Business Suite

---

**Last Updated:** December 8, 2024  
**Version:** 1.0  
**Status:** Production Ready (pending Meta setup)
