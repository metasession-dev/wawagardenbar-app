import nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return transporter;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const transport = getTransporter();

  await transport.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@wawacafe.com',
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}

export async function sendAccountDeletionEmail(email: string): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Account Deleted</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .container { background: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .alert { background: #fee2e2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; }
          .alert h2 { color: #b91c1c; margin: 0 0 10px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="alert">
            <h2>Account Deleted</h2>
            <p>Your account and personal data have been permanently deleted from our systems as per your request.</p>
          </div>
          
          <p>We are sorry to see you go. If you ever wish to return, you are welcome to create a new account at any time.</p>
          
          <p>Thank you for being a part of Wawa Garden Bar.</p>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Wawa Garden Bar</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
    ACCOUNT DELETED
    
    Your account and personal data have been permanently deleted from our systems as per your request.
    
    We are sorry to see you go. Thank you for being a part of Wawa Garden Bar.
    
    © ${new Date().getFullYear()} Wawa Garden Bar
  `;

  await sendEmail({
    to: email,
    subject: 'Account Deletion Confirmation',
    html,
    text,
  });
}

export async function sendVerificationPinEmail(
  email: string,
  pin: string
): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verification PIN</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .logo {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo img {
            max-width: 120px;
            height: auto;
            margin: 0 auto;
          }
          .logo h1 {
            color: #1a4d2e;
            margin: 10px 0 0 0;
            font-size: 24px;
          }
          .pin-box {
            background-color: #f3f4f6;
            border: 2px solid #1a4d2e;
            border-radius: 8px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
          }
          .pin {
            font-size: 48px;
            font-weight: bold;
            color: #1a4d2e;
            letter-spacing: 8px;
            margin: 0;
          }
          .message {
            font-size: 16px;
            color: #6b7280;
            margin-bottom: 20px;
          }
          .warning {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin-top: 30px;
            font-size: 14px;
            color: #92400e;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #9ca3af;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <img src="${process.env.NEXT_PUBLIC_APP_URL}/logo.png" alt="Wawa Garden Bar" />
            <h1>Wawa Garden Bar</h1>
          </div>
          
          <p class="message">
            Hello! You requested to sign in to your Wawa Garden Bar account.
            Please use the verification PIN below to complete your login:
          </p>
          
          <div class="pin-box">
            <p class="pin">${pin}</p>
          </div>
          
          <p class="message">
            This PIN will expire in <strong>10 minutes</strong>.
            If you didn't request this PIN, please ignore this email.
          </p>
          
          <div class="warning">
            <strong>⚠️ Security Notice:</strong> Never share this PIN with anyone.
            Wawa Garden Bar staff will never ask for your verification PIN.
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Wawa Garden Bar. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
    Wawa Garden Bar - Verification PIN
    
    Your verification PIN is: ${pin}
    
    This PIN will expire in 10 minutes.
    If you didn't request this PIN, please ignore this email.
    
    Never share this PIN with anyone.
    
    © ${new Date().getFullYear()} Wawa Garden Bar
  `;

  await sendEmail({
    to: email,
    subject: 'Your Wawa Garden Bar Verification PIN',
    html,
    text,
  });
}

export async function sendWelcomeEmail(
  email: string,
  name?: string
): Promise<void> {
  const displayName = name || 'there';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Wawa Garden Bar</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .logo {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo img {
            max-width: 120px;
            height: auto;
            margin: 0 auto;
          }
          .logo h1 {
            color: #1a4d2e;
            margin: 10px 0 0 0;
            font-size: 24px;
          }
          .welcome-message {
            font-size: 18px;
            margin-bottom: 20px;
          }
          .features {
            background-color: #f9fafb;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
          }
          .feature {
            margin-bottom: 15px;
          }
          .feature-icon {
            display: inline-block;
            margin-right: 10px;
          }
          .cta-button {
            display: inline-block;
            background-color: #1a4d2e;
            color: #ffffff;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #9ca3af;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <img src="${process.env.NEXT_PUBLIC_APP_URL}/logo.png" alt="Wawa Garden Bar" />
            <h1>Wawa Garden Bar</h1>
          </div>
          
          <p class="welcome-message">
            <strong>Welcome, ${displayName}!</strong>
          </p>
          
          <p>
            Thank you for joining Wawa Garden Bar! We're excited to have you as part of our community.
            Your account has been successfully created and you can now enjoy our services.
          </p>
          
          <div class="features">
            <h3>What you can do:</h3>
            <div class="feature">
              <span class="feature-icon">🍽️</span>
              <strong>Order Online:</strong> Browse our menu and place orders for dine-in, pickup, or delivery
            </div>
            <div class="feature">
              <span class="feature-icon">🎁</span>
              <strong>Earn Rewards:</strong> Get random rewards based on your spending
            </div>
            <div class="feature">
              <span class="feature-icon">📍</span>
              <strong>Track Orders:</strong> Real-time updates on your order status
            </div>
            <div class="feature">
              <span class="feature-icon">💳</span>
              <strong>Multiple Payments:</strong> Pay with card, transfer, USSD, or phone number
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}" class="cta-button">
              Start Ordering
            </a>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Wawa Garden Bar. All rights reserved.</p>
            <p>Need help? Contact us at ${process.env.EMAIL_FROM}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
    Welcome to Wawa Garden Bar!
    
    Hi ${displayName},
    
    Thank you for joining Wawa Garden Bar! Your account has been successfully created.
    
    What you can do:
    - Order online for dine-in, pickup, or delivery
    - Earn random rewards based on your spending
    - Track your orders in real-time
    - Pay with multiple payment methods
    
    Start ordering at: ${process.env.NEXT_PUBLIC_APP_URL}
    
    © ${new Date().getFullYear()} Wawa Garden Bar
  `;

  await sendEmail({
    to: email,
    subject: 'Welcome to Wawa Garden Bar! 🌿',
    html,
    text,
  });
}

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmationEmail(
  email: string,
  orderData: {
    orderNumber: string;
    orderType: string;
    items: { name: string; quantity: number; price: number }[];
    /** REQ-062 — itemized breakdown fields. All optional for backwards-
     * compatibility with existing callers; rendered when present. */
    subtotal?: number;
    tax?: number;
    serviceFee?: number;
    deliveryFee?: number;
    tip?: number;
    pointsEarned?: number;
    paymentMethod?: string;
    total: number;
    estimatedWaitTime: number;
  }
): Promise<void> {
  const itemsList = orderData.items
    .map(
      (item) =>
        `<li>${item.quantity}x ${item.name} - ₦${item.price.toLocaleString()}</li>`
    )
    .join('');

  // REQ-062 — itemized breakdown. Each row renders only when its value
  // is meaningful (> 0 or a defined string), so backwards-compat callers
  // that don't pass the new fields just see items + total like today.
  const fmt = (n: number) => `₦${n.toLocaleString()}`;
  const breakdownRows: string[] = [];
  if (typeof orderData.subtotal === 'number') {
    breakdownRows.push(
      `<tr><td>Subtotal</td><td style="text-align:right">${fmt(orderData.subtotal)}</td></tr>`
    );
  }
  if (typeof orderData.serviceFee === 'number' && orderData.serviceFee > 0) {
    breakdownRows.push(
      `<tr><td>Service Fee</td><td style="text-align:right">${fmt(orderData.serviceFee)}</td></tr>`
    );
  }
  if (typeof orderData.deliveryFee === 'number' && orderData.deliveryFee > 0) {
    breakdownRows.push(
      `<tr><td>Delivery Fee</td><td style="text-align:right">${fmt(orderData.deliveryFee)}</td></tr>`
    );
  }
  if (typeof orderData.tax === 'number' && orderData.tax > 0) {
    breakdownRows.push(
      `<tr><td>Tax</td><td style="text-align:right">${fmt(orderData.tax)}</td></tr>`
    );
  }
  if (typeof orderData.tip === 'number' && orderData.tip > 0) {
    breakdownRows.push(
      `<tr><td>Tip</td><td style="text-align:right">${fmt(orderData.tip)}</td></tr>`
    );
  }
  const breakdownTable =
    breakdownRows.length > 0
      ? `<table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px"><tbody>${breakdownRows.join('')}</tbody></table>`
      : '';

  const extraInfoRows: string[] = [];
  if (orderData.paymentMethod) {
    extraInfoRows.push(
      `<p><strong>Payment Method:</strong> ${orderData.paymentMethod}</p>`
    );
  }
  if (
    typeof orderData.pointsEarned === 'number' &&
    orderData.pointsEarned > 0
  ) {
    extraInfoRows.push(
      `<p><strong>Points Earned:</strong> ${orderData.pointsEarned}</p>`
    );
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Order Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .container { background: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #1a4d2e; margin: 0; }
          .order-number { background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .order-number h2 { color: #1a4d2e; margin: 0; font-size: 32px; }
          .items { margin: 20px 0; }
          .items ul { list-style: none; padding: 0; }
          .items li { padding: 10px; border-bottom: 1px solid #e5e7eb; }
          .total { background: #1a4d2e; color: #fff; padding: 15px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0; }
          .info { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmed! 🎉</h1>
            <p>Thank you for your order</p>
          </div>

          <div class="order-number">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Order Number</p>
            <h2>#${orderData.orderNumber}</h2>
          </div>

          <div class="info">
            <p><strong>Order Type:</strong> ${orderData.orderType}</p>
            <p><strong>Estimated Wait Time:</strong> ${orderData.estimatedWaitTime} minutes</p>
            ${extraInfoRows.join('\n            ')}
          </div>

          <div class="items">
            <h3>Order Items:</h3>
            <ul>${itemsList}</ul>
          </div>

          ${breakdownTable}

          <div class="total">
            Total: ₦${orderData.total.toLocaleString()}
          </div>

          <p style="text-align: center;">
            You can track your order status in real-time from your account.
          </p>

          <div class="footer">
            <p>© ${new Date().getFullYear()} Wawa Garden Bar</p>
            <p>Need help? Contact us at ${process.env.EMAIL_FROM}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: `Order Confirmed - #${orderData.orderNumber}`,
    html,
  });
}

/**
 * Send order status update email
 */
export async function sendOrderStatusUpdateEmail(
  email: string,
  orderNumber: string,
  status: string,
  message: string
): Promise<void> {
  const statusEmoji: Record<string, string> = {
    confirmed: '✅',
    preparing: '👨‍🍳',
    ready: '🎉',
    'out-for-delivery': '🚗',
    delivered: '✅',
    completed: '🎊',
    cancelled: '❌',
  };

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Order Status Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .container { background: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .status { text-align: center; padding: 30px; background: #f9fafb; border-radius: 8px; margin: 20px 0; }
          .status h2 { color: #1a4d2e; margin: 10px 0; font-size: 28px; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 style="text-align: center; color: #1a4d2e;">Order Status Update</h1>
          
          <div class="status">
            <p style="font-size: 48px; margin: 0;">${statusEmoji[status] || '📦'}</p>
            <h2>${status.replace('-', ' ').toUpperCase()}</h2>
            <p style="font-size: 14px; color: #6b7280;">Order #${orderNumber}</p>
          </div>
          
          <p style="text-align: center; font-size: 16px;">${message}</p>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Wawa Garden Bar</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: `Order #${orderNumber} - ${status.replace('-', ' ')}`,
    html,
  });
}

/**
 * Send order cancellation email
 */
export async function sendOrderCancellationEmail(
  email: string,
  orderNumber: string,
  refundAmount: number,
  reason?: string
): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Order Cancelled</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .container { background: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          .refund { background: #d1fae5; border: 2px solid #10b981; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 style="text-align: center; color: #dc2626;">Order Cancelled</h1>
          
          <div class="alert">
            <p><strong>Order #${orderNumber}</strong> has been cancelled.</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          </div>
          
          ${
            refundAmount > 0
              ? `
          <div class="refund">
            <p style="margin: 0; font-size: 14px; color: #065f46;">Refund Amount</p>
            <p style="margin: 10px 0; font-size: 32px; font-weight: bold; color: #10b981;">₦${refundAmount.toLocaleString()}</p>
            <p style="margin: 0; font-size: 14px; color: #065f46;">Refund will be processed within 5-7 business days</p>
          </div>
          `
              : ''
          }
          
          <p style="text-align: center;">
            We're sorry to see your order cancelled. If you have any questions, please contact our support team.
          </p>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Wawa Garden Bar</p>
            <p>Contact us at ${process.env.EMAIL_FROM}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: `Order Cancelled - #${orderNumber}`,
    html,
  });
}

/**
 * Send support ticket confirmation email
 */
export async function sendSupportTicketEmail(
  email: string,
  ticketData: {
    ticketNumber: string;
    category: string;
    subject: string;
    message: string;
  }
): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Support Ticket Received</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .container { background: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .ticket { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 style="text-align: center; color: #1a4d2e;">Support Ticket Received</h1>
          
          <p>Thank you for contacting us. We've received your support request and will respond as soon as possible.</p>
          
          <div class="ticket">
            <p><strong>Ticket Number:</strong> #${ticketData.ticketNumber}</p>
            <p><strong>Category:</strong> ${ticketData.category}</p>
            <p><strong>Subject:</strong> ${ticketData.subject}</p>
            <p><strong>Message:</strong></p>
            <p style="background: #fff; padding: 15px; border-radius: 4px;">${ticketData.message}</p>
          </div>
          
          <p style="text-align: center;">
            Our support team typically responds within 24 hours.
          </p>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Wawa Garden Bar</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: `Support Ticket #${ticketData.ticketNumber} - ${ticketData.subject}`,
    html,
  });
}

/**
 * Send low stock alert email to admins
 */
export async function sendLowStockAlertEmail(data: {
  itemName: string;
  currentStock: number;
  minimumStock: number;
  unit: string;
  suggestedReorder: number;
  lastRestocked?: Date;
}): Promise<void> {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL || process.env.EMAIL_FROM;

  if (!adminEmail) {
    console.warn('No admin email configured for low stock alerts');
    return;
  }

  const lastRestockedText = data.lastRestocked
    ? new Date(data.lastRestocked).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Never';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Low Stock Alert</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .container { background: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; }
          .alert h2 { color: #92400e; margin: 0 0 10px 0; }
          .stats { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .stat { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .stat:last-child { border-bottom: none; }
          .stat-label { font-weight: bold; color: #6b7280; }
          .stat-value { color: #1a4d2e; font-weight: bold; }
          .warning { color: #dc2626; }
          .cta-button { display: inline-block; background-color: #1a4d2e; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="alert">
            <h2>⚠️ Low Stock Alert</h2>
            <p><strong>${data.itemName}</strong> is running low on stock!</p>
          </div>
          
          <div class="stats">
            <div class="stat">
              <span class="stat-label">Item:</span>
              <span class="stat-value">${data.itemName}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Current Stock:</span>
              <span class="stat-value warning">${data.currentStock} ${data.unit}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Minimum Stock:</span>
              <span class="stat-value">${data.minimumStock} ${data.unit}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Suggested Reorder:</span>
              <span class="stat-value">${data.suggestedReorder} ${data.unit}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Last Restocked:</span>
              <span class="stat-value">${lastRestockedText}</span>
            </div>
          </div>
          
          <p style="text-align: center; margin: 30px 0;">
            Please restock this item as soon as possible to avoid running out of stock.
          </p>
          
          <div style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/inventory" class="cta-button">
              View Inventory Dashboard
            </a>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Wawa Garden Bar - Admin Alert</p>
            <p>This is an automated alert. Do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
    LOW STOCK ALERT
    
    Item: ${data.itemName}
    Current Stock: ${data.currentStock} ${data.unit}
    Minimum Stock: ${data.minimumStock} ${data.unit}
    Suggested Reorder: ${data.suggestedReorder} ${data.unit}
    Last Restocked: ${lastRestockedText}
    
    Please restock this item as soon as possible.
    
    View Inventory: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/inventory
    
    © ${new Date().getFullYear()} Wawa Garden Bar
  `;

  await sendEmail({
    to: adminEmail,
    subject: `⚠️ Low Stock Alert: ${data.itemName}`,
    html,
    text,
  });
}
