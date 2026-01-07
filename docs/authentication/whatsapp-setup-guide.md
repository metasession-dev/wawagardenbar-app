# WhatsApp PIN Delivery - Setup Guide

This guide will walk you through setting up WhatsApp as a PIN delivery method for the Wawa Garden Bar authentication system.

## Prerequisites

- A Meta Business Account
- A verified Facebook Business Manager account
- A phone number to use for WhatsApp Business
- Access to the server to configure webhooks

## Step 1: Create a Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Select "Business" as the app type
4. Fill in the app details:
   - **App Name:** Wawa Garden Bar
   - **App Contact Email:** Your business email
   - **Business Account:** Select your business account
5. Click "Create App"

## Step 2: Add WhatsApp Product

1. In your app dashboard, find "WhatsApp" in the products list
2. Click "Set up" on the WhatsApp card
3. Select your Business Portfolio
4. Click "Continue"

## Step 3: Configure WhatsApp Business Account

1. In the WhatsApp setup page, you'll see:
   - **Phone Number ID:** Copy this value
   - **WhatsApp Business Account ID:** Copy this value
2. Add these to your `.env` file:
   ```env
   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
   WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id_here
   ```

## Step 4: Generate Access Token

### Temporary Token (for testing):
1. In the WhatsApp setup page, find "Temporary access token"
2. Click "Generate Token"
3. Copy the token and add to `.env`:
   ```env
   WHATSAPP_ACCESS_TOKEN=your_temporary_token_here
   ```
   **Note:** Temporary tokens expire after 24 hours

### Permanent Token (for production):
1. Go to "Settings" → "Basic" in your app dashboard
2. Find "App Secret" and note it down
3. Go to "Settings" → "Advanced"
4. Generate a System User Token:
   - Create a System User in Business Settings
   - Assign the WhatsApp Business Management permission
   - Generate a permanent token
5. Add to `.env`:
   ```env
   WHATSAPP_ACCESS_TOKEN=your_permanent_token_here
   ```

## Step 5: Add Phone Number

### Option A: Use Test Number (Sandbox)
1. In WhatsApp setup, you'll see a test phone number
2. Add recipient phone numbers for testing (max 5 numbers)
3. Send the verification message from your phone to the test number

### Option B: Add Your Own Number (Production)
1. Click "Add phone number"
2. Follow the verification process:
   - Enter your business phone number
   - Verify via SMS or voice call
   - Complete the verification
3. Wait for approval (usually 1-2 business days)

## Step 6: Create Message Template

1. Go to "WhatsApp" → "Message Templates" in your app dashboard
2. Click "Create Template"
3. Fill in the template details:
   - **Template Name:** `verification_pin`
   - **Category:** AUTHENTICATION
   - **Language:** English (en)
   - **Header:** None
   - **Body:**
     ```
     Your Wawa Garden Bar verification PIN is: {{1}}
     
     This PIN will expire in 10 minutes. Do not share this code with anyone.
     
     Security Notice: Wawa Garden Bar staff will never ask for your PIN.
     ```
   - **Footer:** None
   - **Buttons:** None
4. Click "Submit"
5. Wait for approval (usually 1-24 hours)
6. Once approved, add the template name to `.env`:
   ```env
   WHATSAPP_PIN_TEMPLATE_NAME=verification_pin
   ```

## Step 7: Configure Webhook

1. In your app dashboard, go to "WhatsApp" → "Configuration"
2. Find "Webhook" section
3. Click "Edit"
4. Enter your webhook URL:
   ```
   https://yourdomain.com/api/webhooks/whatsapp
   ```
5. Generate a secure verify token:
   ```bash
   openssl rand -hex 32
   ```
6. Add the verify token to `.env`:
   ```env
   WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_generated_token_here
   ```
7. Enter the same token in the "Verify Token" field
8. Click "Verify and Save"
9. Subscribe to webhook fields:
   - ✅ messages
   - ✅ message_status

## Step 8: Update Environment Variables

Your complete WhatsApp configuration in `.env` should look like:

```env
# WhatsApp Configuration (Meta Cloud API)
ENABLE_WHATSAPP_NOTIFICATIONS=true
WHATSAPP_PROVIDER=cloud
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_BUSINESS_ACCOUNT_ID=987654321098765
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_secure_random_token_here
WHATSAPP_API_VERSION=v18.0
WHATSAPP_API_URL=https://graph.facebook.com
WHATSAPP_PIN_TEMPLATE_NAME=verification_pin
```

## Step 9: Test the Integration

### Test Sending a PIN:

1. Start your application:
   ```bash
   npm run dev
   ```

2. Go to the login page
3. Select "WhatsApp" as the delivery method
4. Enter a test phone number (must be added to your test recipients)
5. Click "Continue"
6. Check your WhatsApp for the PIN message

### Test Webhook:

1. Send a message to your WhatsApp Business number
2. Check your server logs for webhook events:
   ```bash
   tail -f logs/app.log | grep WhatsApp
   ```

## Step 10: Production Deployment

### Before going live:

1. **Replace temporary token with permanent token**
2. **Verify your business:**
   - Complete Business Verification in Meta Business Suite
   - This is required for production use
3. **Request higher rate limits:**
   - Default: 1,000 conversations/month (free)
   - Request increase in Meta Business Suite
4. **Set up billing:**
   - Add payment method in Meta Business Suite
   - Review pricing: ~$0.01 per authentication conversation
5. **Update webhook URL:**
   - Use production domain with HTTPS
   - Ensure webhook endpoint is publicly accessible
6. **Monitor usage:**
   - Set up CloudWatch/Datadog alerts
   - Monitor API quota and costs

## Troubleshooting

### Issue: "Template not found"
**Solution:** Ensure your template is approved and the name matches exactly in `.env`

### Issue: "Phone number not on WhatsApp"
**Solution:** 
- Verify the phone number is registered on WhatsApp
- Check phone number format (must include country code)
- For testing, ensure number is added to test recipients

### Issue: "Webhook verification failed"
**Solution:**
- Verify the webhook verify token matches in both `.env` and Meta dashboard
- Ensure webhook URL is publicly accessible (use ngrok for local testing)
- Check server logs for webhook requests

### Issue: "Invalid access token"
**Solution:**
- Regenerate access token in Meta dashboard
- For temporary tokens, they expire after 24 hours
- Use permanent System User token for production

### Issue: "Message delivery failed"
**Solution:**
- Check webhook logs for delivery status
- Verify phone number format
- Ensure you haven't exceeded rate limits
- Check Meta Business Suite for any account issues

## Local Development with ngrok

For local testing, you need a publicly accessible webhook URL:

1. Install ngrok:
   ```bash
   npm install -g ngrok
   ```

2. Start your app:
   ```bash
   npm run dev
   ```

3. In another terminal, start ngrok:
   ```bash
   ngrok http 3000
   ```

4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

5. Update webhook URL in Meta dashboard:
   ```
   https://abc123.ngrok.io/api/webhooks/whatsapp
   ```

6. Test the integration

**Note:** ngrok URLs change on restart. For persistent testing, consider ngrok paid plan or use a staging server.

## Rate Limits & Costs

### Free Tier:
- 1,000 conversations per month
- Includes all message types
- No credit card required

### Paid Tier:
- Authentication conversations: $0.005 - $0.01 per conversation
- Varies by country
- Billed monthly

### Rate Limits:
- Default: 80 messages per second
- Can request increase based on business needs
- Monitor usage in Meta Business Suite

## Security Best Practices

1. **Never commit access tokens to git**
2. **Use environment variables for all credentials**
3. **Rotate access tokens regularly**
4. **Use System User tokens (not personal tokens) for production**
5. **Enable two-factor authentication on Meta account**
6. **Monitor webhook logs for suspicious activity**
7. **Implement rate limiting on your webhook endpoint**
8. **Validate webhook signatures (if implemented)**

## Support & Resources

- [WhatsApp Cloud API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Message Templates Guide](https://developers.facebook.com/docs/whatsapp/message-templates)
- [Webhook Setup Guide](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
- [Rate Limits & Pricing](https://developers.facebook.com/docs/whatsapp/pricing)
- [Meta Business Help Center](https://www.facebook.com/business/help)

## Next Steps

After successful setup:

1. ✅ Test with multiple phone numbers
2. ✅ Monitor delivery success rates
3. ✅ Set up production monitoring and alerts
4. ✅ Configure backup delivery methods (SMS/Email)
5. ✅ Train staff on the new authentication flow
6. ✅ Update user documentation
7. ✅ Plan gradual rollout to customers

---

**Setup Complete!** 🎉

Your WhatsApp PIN delivery system is now configured. Users can now choose WhatsApp as their preferred authentication method for a faster, more reliable experience.
