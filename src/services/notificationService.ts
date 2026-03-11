
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy, limit, doc, updateDoc, deleteDoc } from 'firebase/firestore';

export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'in-app';
export type NotificationType = 'order' | 'rental' | 'security' | 'reward' | 'system' | 'kyc';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export interface AppNotification {
  id?: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: any;
  read: boolean;
  actionPath?: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  subject?: string;
  content: string;
  channels: NotificationChannel[];
  enabled: boolean;
}

export const DEFAULT_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'order_confirmation',
    name: 'Order Confirmation',
    subject: 'Your Order #{{orderId}} is Confirmed!',
    content: 'Hi {{customerName}}, thank you for your purchase of {{productName}}. Your order is being processed.',
    channels: ['email', 'sms', 'whatsapp'],
    enabled: true
  },
  {
    id: 'rental_confirmation',
    name: 'Rental Confirmation',
    subject: 'Rental Confirmed: {{consoleName}}',
    content: 'Hi {{customerName}}, your rental for {{consoleName}} from {{startDate}} to {{endDate}} is confirmed. Enjoy your gaming!',
    channels: ['email', 'sms', 'whatsapp'],
    enabled: true
  },
  {
    id: 'rental_reminder',
    name: 'Rental Return Reminder',
    subject: 'Reminder: Your rental ends tomorrow',
    content: 'Hi {{customerName}}, just a reminder that your rental for {{consoleName}} ends tomorrow. Please ensure it is ready for return.',
    channels: ['email', 'sms', 'whatsapp'],
    enabled: true
  },
  {
    id: 'repair_update',
    name: 'Repair Status Update',
    subject: 'Update on your Repair #{{ticketId}}',
    content: 'Hi {{customerName}}, your {{deviceType}} repair status has been updated to: {{status}}.',
    channels: ['email', 'sms', 'whatsapp'],
    enabled: true
  },
  {
    id: 'sell_offer',
    name: 'Purchase Offer for Your Device',
    subject: 'We have an offer for your {{consoleModel}}!',
    content: 'Hi {{customerName}}, we have reviewed your sell request. Our offer for your {{consoleModel}} is {{offerAmount}}.',
    channels: ['email', 'sms', 'whatsapp'],
    enabled: true
  }
];

class NotificationService {
  private templates: NotificationTemplate[] = [...DEFAULT_TEMPLATES];

  // In-App Notification Methods
  async createInApp(notification: Omit<AppNotification, 'timestamp' | 'read'>) {
    try {
      await addDoc(collection(db, 'notifications'), {
        ...notification,
        read: false,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("[NOTIFICATION_SERVICE] Error creating in-app notification:", error);
    }
  }

  subscribe(userId: string, callback: (notifications: AppNotification[]) => void) {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AppNotification[];
      callback(notifications);
    });
  }

  async markAsRead(notificationId: string) {
    const docRef = doc(db, 'notifications', notificationId);
    await updateDoc(docRef, { read: true });
  }

  async broadcastToAdmins(title: string, message: string, type: NotificationType = 'system', priority: NotificationPriority = 'normal') {
    await this.createInApp({
      userId: 'admin',
      title,
      message,
      type,
      priority
    });
  }

  async send(templateId: string, data: Record<string, string>, customerContact: { email?: string, phone?: string }) {
    const template = this.templates.find(t => t.id === templateId);
    if (!template || !template.enabled) return;

    let content = template.content;
    let subject = template.subject || '';

    // Replace placeholders
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      content = content.replaceAll(placeholder, value);
      subject = subject.replaceAll(placeholder, value);
    });

    // Keys
    const resendKey = import.meta.env.VITE_RESEND_API_KEY;
    const twilioSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
    const twilioAuth = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
    const twilioPhone = import.meta.env.VITE_TWILIO_PHONE_NUMBER;

    // Delivery logic
    for (const channel of template.channels) {
      try {
        if (channel === 'email' && customerContact.email) {
          if (resendKey) {
            console.log(`[NOTIFICATION][EMAIL] Sending via Resend to ${customerContact.email}...`);
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                from: 'ConsoleZone <noreply@yourdomain.com>', // User needs to configure their sending domain in Resend
                to: [customerContact.email],
                subject: subject,
                html: `<p>${content.replace(/\n/g, '<br/>')}</p>`
              })
            });
          } else {
            console.log(`[SIMULATED NOTIFICATION][EMAIL] To: ${customerContact.email} | Subj: ${subject} | Body: ${content}`);
          }
        }
        else if ((channel === 'sms' || channel === 'whatsapp') && customerContact.phone) {
          if (twilioSid && twilioAuth && twilioPhone) {
            const toPhone = channel === 'whatsapp' ? `whatsapp:${customerContact.phone}` : customerContact.phone;
            const fromPhone = channel === 'whatsapp' ? `whatsapp:${twilioPhone}` : twilioPhone;

            console.log(`[NOTIFICATION][${channel.toUpperCase()}] Sending via Twilio to ${toPhone}...`);

            const params = new URLSearchParams();
            params.append('To', toPhone);
            params.append('From', fromPhone);
            params.append('Body', content);

            await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
              method: 'POST',
              headers: {
                'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioAuth}`),
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: params
            });
          } else {
            console.log(`[SIMULATED NOTIFICATION][${channel.toUpperCase()}] To: ${customerContact.phone} | Body: ${content}`);
          }
        }
      } catch (error) {
        console.error(`[NOTIFICATION ERROR] Failed to send ${channel}:`, error);
      }
    }

    return { success: true, timestamp: new Date().toISOString() };
  }

  async sendNotification(templateId: string, email: string, data: any) {
    return this.send(templateId, data, { email });
  }

  getTemplates() {
    return this.templates;
  }

  updateTemplate(id: string, updates: Partial<NotificationTemplate>) {
    this.templates = this.templates.map(t => t.id === id ? { ...t, ...updates } : t);
  }
}

export const notificationService = new NotificationService();
