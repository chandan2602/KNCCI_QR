import { Injectable } from '@angular/core';

export interface EmailTemplate {
  subject: string;
  body: string;
}

export interface WhatsAppTemplate {
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  // Email templates
  getEmailTemplate(type: 'registration_confirmation' | 'appointment_reminder', data: any): EmailTemplate {
    switch (type) {
      case 'registration_confirmation':
        return {
          subject: 'KNCCI Academy - Registration Confirmation',
          body: this.getRegistrationConfirmationEmail(data)
        };
      case 'appointment_reminder':
        return {
          subject: 'KNCCI Academy - Appointment Reminder',
          body: this.getAppointmentReminderEmail(data)
        };
      default:
        return {
          subject: 'KNCCI Academy - Notification',
          body: 'Thank you for your registration.'
        };
    }
  }

  // WhatsApp templates
  getWhatsAppTemplate(type: 'registration_confirmation' | 'appointment_reminder', data: any): WhatsAppTemplate {
    switch (type) {
      case 'registration_confirmation':
        return {
          message: this.getRegistrationConfirmationWhatsApp(data)
        };
      case 'appointment_reminder':
        return {
          message: this.getAppointmentReminderWhatsApp(data)
        };
      default:
        return {
          message: 'Thank you for registering with KNCCI Academy!'
        };
    }
  }

  private getRegistrationConfirmationEmail(data: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #4285f4 0%, #34a853 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .appointment-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4285f4; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .button { display: inline-block; background: #4285f4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Registration Confirmed!</h1>
            <p>Welcome to KNCCI Academy</p>
        </div>
        
        <div class="content">
            <h2>Dear ${data.name},</h2>
            
            <p>Thank you for registering with KNCCI Academy! We're excited to have you join our community.</p>
            
            <div class="appointment-details">
                <h3>📅 Your Appointment Details</h3>
                <p><strong>Application ID:</strong> ${data.application_id}</p>
                ${data.student_id ? `<p><strong>Student ID:</strong> ${data.student_id}</p>` : ''}
                <p><strong>Date:</strong> ${this.formatDate(data.appointment_date)}</p>
                <p><strong>Time:</strong> ${data.slot}</p>
                <p><strong>Type:</strong> Initial Consultation</p>
            </div>
            
            <h3>📋 What to Expect</h3>
            <ul>
                <li>Our consultant will discuss your career goals and interests</li>
                <li>We'll provide information about our programs and courses</li>
                <li>You'll receive personalized recommendations</li>
                <li>Duration: Approximately 30-45 minutes</li>
            </ul>
            
            <h3>📱 What's Next?</h3>
            <ul>
                <li>You'll receive a calendar invitation shortly</li>
                <li>A WhatsApp confirmation has been sent to your mobile</li>
                <li>We'll send a reminder 24 hours before your appointment</li>
            </ul>
            
            <p><strong>Need to reschedule?</strong> Please contact us at least 24 hours in advance.</p>
            
            <div style="text-align: center;">
                <a href="mailto:kncci@example.com" class="button">Contact Us</a>
            </div>
        </div>
        
        <div class="footer">
            <p>KNCCI Academy | Email: kncci@example.com | Phone: +1-234-567-8900</p>
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>`;
  }

  private getRegistrationConfirmationWhatsApp(data: any): string {
    return `🎉 *KNCCI Academy - Registration Confirmed!*

Hello ${data.name}! 👋

Thank you for registering with KNCCI Academy. Your appointment has been confirmed:

📅 *Appointment Details:*
• Application ID: ${data.application_id}
${data.student_id ? `• Student ID: ${data.student_id}\n` : ''}• Date: ${this.formatDate(data.appointment_date)}
• Time: ${data.slot}
• Type: Initial Consultation

📋 *What to Expect:*
✅ Career goals discussion
✅ Program information
✅ Personalized recommendations
✅ Duration: 30-45 minutes

📱 *Next Steps:*
• Calendar invitation will be sent
• Reminder 24 hours before appointment
• Contact us for any changes

Need help? Reply to this message or call us.

*KNCCI Academy Team* 🎓`;
  }

  private getAppointmentReminderEmail(data: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .reminder-box { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⏰ Appointment Reminder</h1>
            <p>Your consultation is tomorrow!</p>
        </div>
        
        <div class="content">
            <h2>Dear ${data.name},</h2>
            
            <div class="reminder-box">
                <h3>🗓️ Tomorrow's Appointment</h3>
                <p><strong>Date:</strong> ${this.formatDate(data.appointment_date)}</p>
                <p><strong>Time:</strong> ${data.slot}</p>
                <p><strong>Application ID:</strong> ${data.application_id}</p>
            </div>
            
            <h3>📝 Please Prepare:</h3>
            <ul>
                <li>Your career goals and interests</li>
                <li>Any questions about our programs</li>
                <li>Your educational background details</li>
                <li>Preferred learning schedule</li>
            </ul>
            
            <p>We look forward to meeting with you!</p>
        </div>
        
        <div class="footer">
            <p>KNCCI Academy | Email: kncci@example.com</p>
        </div>
    </div>
</body>
</html>`;
  }

  private getAppointmentReminderWhatsApp(data: any): string {
    return `⏰ *KNCCI Academy - Appointment Reminder*

Hello ${data.name}! 👋

This is a friendly reminder about your consultation *tomorrow*:

🗓️ *Appointment Details:*
• Date: ${this.formatDate(data.appointment_date)}
• Time: ${data.slot}
• Application ID: ${data.application_id}

📝 *Please prepare:*
✅ Career goals & interests
✅ Questions about programs
✅ Educational background
✅ Preferred schedule

We're excited to meet with you! 🎓

*KNCCI Academy Team*`;
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}