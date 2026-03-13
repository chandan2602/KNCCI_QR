import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CalendarEvent {
  id?: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  attendees: string[];
  location?: string;
  meeting_link?: string;
}

export interface CalendarSlot {
  time: string;
  available: boolean;
  consultant_name?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Get available time slots for a specific date
  getAvailableSlots(date: string): Observable<CalendarSlot[]> {
    const url = `${this.baseUrl}/api/calendar/available-slots`;
    return this.http.get<CalendarSlot[]>(url, {
      params: { date }
    });
  }

  // Create a calendar event for the appointment
  createAppointmentEvent(data: {
    attendee_name: string;
    attendee_email: string;
    appointment_date: string;
    slot: string;
    application_id: number;
    user_type: string;
  }): Observable<CalendarEvent> {
    const url = `${this.baseUrl}/api/calendar/create-appointment`;
    
    const eventData = {
      title: `KNCCI Academy Consultation - ${data.attendee_name}`,
      description: this.generateEventDescription(data),
      attendee_name: data.attendee_name,
      attendee_email: data.attendee_email,
      appointment_date: data.appointment_date,
      slot: data.slot,
      application_id: data.application_id,
      user_type: data.user_type
    };

    return this.http.post<CalendarEvent>(url, eventData);
  }

  // Generate Google Calendar link for manual addition
  generateGoogleCalendarLink(data: {
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    location?: string;
  }): string {
    const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
    const params = new URLSearchParams({
      text: data.title,
      details: data.description,
      dates: `${this.formatDateForGoogle(data.start_time)}/${this.formatDateForGoogle(data.end_time)}`,
      location: data.location || 'KNCCI Academy'
    });

    return `${baseUrl}&${params.toString()}`;
  }

  // Generate Outlook calendar link
  generateOutlookCalendarLink(data: {
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    location?: string;
  }): string {
    const baseUrl = 'https://outlook.live.com/calendar/0/deeplink/compose';
    const params = new URLSearchParams({
      subject: data.title,
      body: data.description,
      startdt: data.start_time,
      enddt: data.end_time,
      location: data.location || 'KNCCI Academy'
    });

    return `${baseUrl}?${params.toString()}`;
  }

  // Get consultant's calendar integration status
  getConsultantCalendarStatus(): Observable<{
    integrated: boolean;
    calendar_type: string;
    consultant_name: string;
    consultant_email: string;
  }> {
    const url = `${this.baseUrl}/api/calendar/consultant-status`;
    return this.http.get<any>(url);
  }

  // Sync with consultant's calendar (Google Calendar, Outlook, etc.)
  syncWithConsultantCalendar(eventData: any): Observable<any> {
    const url = `${this.baseUrl}/api/calendar/sync-consultant`;
    return this.http.post(url, eventData);
  }

  private generateEventDescription(data: any): string {
    return `
KNCCI Academy Consultation Appointment

Student Details:
- Name: ${data.attendee_name}
- Email: ${data.attendee_email}
- Application ID: ${data.application_id}
- User Type: ${data.user_type}

Appointment Details:
- Type: Initial Consultation
- Duration: 45 minutes
- Purpose: Career guidance and program information

Agenda:
1. Introduction and background discussion
2. Career goals assessment
3. Program recommendations
4. Next steps and enrollment process

Please prepare:
- Career objectives
- Educational background
- Preferred learning schedule
- Any specific questions

Contact: kncci@example.com
    `.trim();
  }

  private formatDateForGoogle(dateTime: string): string {
    // Convert to Google Calendar format: YYYYMMDDTHHMMSSZ
    const date = new Date(dateTime);
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  // Parse time slot and create full datetime
  parseSlotToDateTime(date: string, slot: string): { start: string; end: string } {
    const [startTime, endTime] = slot.split(' - ');
    
    const startDateTime = new Date(`${date} ${this.convertTo24Hour(startTime)}`);
    const endDateTime = new Date(`${date} ${this.convertTo24Hour(endTime)}`);
    
    return {
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString()
    };
  }

  private convertTo24Hour(time12h: string): string {
    const [time, modifier] = time12h.split(/([ap]m)/i);
    let [hours, minutes] = time.split(':');
    
    if (hours === '12') {
      hours = '00';
    }
    
    if (modifier.toLowerCase() === 'pm') {
      hours = (parseInt(hours, 10) + 12).toString();
    }
    
    return `${hours.padStart(2, '0')}:${minutes || '00'}:00`;
  }
}