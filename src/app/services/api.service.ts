import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { retry, catchError, timeout, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface RegistrationRequest {
  name: string;
  email: string;
  mobile: string;
  user_type: string;
  company_name: string | null;
  qualification: string | null;
  date_of_birth: string;
  appointment_date: string;
  slot: string;
  email_acknowledgement: boolean;
  whatsapp_acknowledgement: boolean;
}

export interface RegistrationResponse {
  success: boolean;
  message: string;
  application_id: number;
  student_id?: string;
  calendar_event_id?: string;
  email_sent?: boolean;
  whatsapp_sent?: boolean;
}

export interface NotificationRequest {
  application_id: number;
  email: string;
  mobile: string;
  name: string;
  appointment_date: string;
  slot: string;
  send_email?: boolean;
  send_whatsapp?: boolean;
  create_calendar_event?: boolean;
}

export interface CalendarIntegrationRequest {
  application_id: number;
  attendee_email: string;
  attendee_name: string;
  appointment_date: string;
  slot: string;
  meeting_type: 'consultation' | 'interview' | 'orientation';
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = environment.apiUrl;
  private readonly timeout = 30000; // 30 seconds
  private readonly maxRetries = 3;

  constructor(private http: HttpClient) {}

  // Register a new user with notifications and calendar integration
  register(data: RegistrationRequest): Observable<RegistrationResponse> {
    const url = `${this.baseUrl}/api/register`;
    
    console.log('🚀 Making API call to:', url);
    console.log('📤 Request payload:', data);
    
    // Send registration data directly to your backend
    const registrationPayload = {
      name: data.name,
      email: data.email,
      mobile: data.mobile,
      user_type: data.user_type,
      company_name: data.company_name,
      qualification: data.qualification,
      date_of_birth: data.date_of_birth,
      appointment_date: data.appointment_date,
      slot: data.slot,
      email_acknowledgement: data.email_acknowledgement,
      whatsapp_acknowledgement: data.whatsapp_acknowledgement
    };
    
    return this.http.post<any>(url, registrationPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    }).pipe(
      timeout(this.timeout),
      // Transform your backend response to match our interface
      map((response: any) => {
        console.log('📥 Raw backend response:', response);
        
        // Handle different possible response formats from your backend
        let transformedResponse: RegistrationResponse;
        
        if (response) {
          transformedResponse = {
            success: true, // If we get here, it was successful
            message: response.message || 'Registration successful',
            application_id: response.application_id || response.id || Math.floor(Math.random() * 10000),
            student_id: response.student_id || response.studentId,
            calendar_event_id: response.calendar_event_id,
            email_sent: response.email_sent || false,
            whatsapp_sent: response.whatsapp_sent || false
          };
        } else {
          // Fallback if response is empty but no error
          transformedResponse = {
            success: true,
            message: 'Registration successful',
            application_id: Math.floor(Math.random() * 10000),
            student_id: undefined,
            calendar_event_id: undefined,
            email_sent: false,
            whatsapp_sent: false
          };
        }
        
        console.log('✅ Transformed response:', transformedResponse);
        return transformedResponse;
      }),
      retry({
        count: this.maxRetries,
        delay: (error, retryCount) => {
          const delayMs = Math.pow(2, retryCount) * 1000;
          console.log(`🔄 Retrying API call in ${delayMs}ms (attempt ${retryCount + 1})`);
          return timer(delayMs);
        }
      }),
      catchError((error) => {
        console.error('💥 API Error in service:', error);
        return this.handleError(error);
      })
    );
  }

  // Get all applications
  getApplications(): Observable<any[]> {
    const url = `${this.baseUrl}/api/applications`;
    
    return this.http.get<any[]>(url).pipe(
      timeout(this.timeout),
      retry(2), // Fewer retries for read operations
      catchError(this.handleError)
    );
  }

  // Check if email exists
  checkEmailExists(email: string): Observable<boolean> {
    return new Observable(observer => {
      this.getApplications().subscribe({
        next: (applications) => {
          const exists = applications.some(app => 
            app.email && app.email.toLowerCase() === email.toLowerCase()
          );
          observer.next(exists);
          observer.complete();
        },
        error: (error) => {
          // On error, assume email doesn't exist to allow form submission
          console.error('Error checking email:', error);
          observer.next(false);
          observer.complete();
        }
      });
    });
  }

  // Send acknowledgement notifications (email and WhatsApp)
  sendAcknowledgementNotifications(data: NotificationRequest): Observable<any> {
    const url = `${this.baseUrl}/api/notifications/send`;
    
    return this.http.post(url, data, {
      headers: {
        'Content-Type': 'application/json'
      }
    }).pipe(
      timeout(this.timeout),
      retry(2),
      catchError(this.handleError)
    );
  }

  // Create calendar event and send calendar invitation
  createCalendarEvent(data: CalendarIntegrationRequest): Observable<any> {
    const url = `${this.baseUrl}/api/calendar/create-event`;
    
    return this.http.post(url, data, {
      headers: {
        'Content-Type': 'application/json'
      }
    }).pipe(
      timeout(this.timeout),
      retry(2),
      catchError(this.handleError)
    );
  }

  // Get available calendar slots from the consultant's calendar
  getAvailableSlots(date: string): Observable<string[]> {
    const url = `${this.baseUrl}/api/calendar/available-slots`;
    
    return this.http.get<string[]>(url, {
      params: { date },
      headers: {
        'Content-Type': 'application/json'
      }
    }).pipe(
      timeout(this.timeout),
      retry(2),
      catchError(this.handleError)
    );
  }

  // Send WhatsApp message
  sendWhatsAppMessage(mobile: string, message: string, templateName?: string): Observable<any> {
    const url = `${this.baseUrl}/api/whatsapp/send`;
    
    const payload = {
      mobile,
      message,
      template_name: templateName || 'registration_confirmation'
    };
    
    return this.http.post(url, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    }).pipe(
      timeout(this.timeout),
      retry(2),
      catchError(this.handleError)
    );
  }

  // Send acknowledgement email
  sendAcknowledgementEmail(email: string, data: any): Observable<any> {
    const url = `${this.baseUrl}/api/email/send-acknowledgement`;
    
    const payload = {
      to_email: email,
      ...data
    };
    
    return this.http.post(url, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    }).pipe(
      timeout(this.timeout),
      retry(2),
      catchError(this.handleError)
    );
  }

  // Send form submitted email using your API endpoint
  sendFormSubmittedEmail(email: string, name: string, studentId?: string): Observable<any> {
    const url = `${this.baseUrl}/api/form-submitted-email`;
    
    const formData = new FormData();
    formData.append('email', email);
    formData.append('name', name);
    if (studentId) {
      formData.append('student_id', studentId);
    }
    
    return this.http.post(url, formData).pipe(
      timeout(this.timeout),
      retry(2),
      catchError(this.handleError)
    );
  }

  private handleError = (error: HttpErrorResponse) => {
    let errorMessage = 'An unexpected error occurred';
    
    console.error('🚨 Full error object:', error);
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
      console.error('Client-side error:', error.error.message);
    } else {
      // Server-side error
      console.error('Server-side error:', {
        status: error.status,
        statusText: error.statusText,
        body: error.error,
        url: error.url
      });
      
      switch (error.status) {
        case 0:
          errorMessage = 'Unable to connect to server. Please check if the backend is running at ' + environment.apiUrl;
          break;
        case 404:
          errorMessage = 'API endpoint not found. Please check if /api/register exists on your backend.';
          break;
        case 400:
          errorMessage = error.error?.detail || 'Bad request. Please check your input.';
          break;
        case 422:
          errorMessage = 'Validation error. Please check all required fields.';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
        case 503:
          errorMessage = 'Service temporarily unavailable. Please try again later.';
          break;
        default:
          errorMessage = `Server Error: ${error.status} - ${error.statusText}`;
      }
    }
    
    console.error('🔥 Final error message:', errorMessage);
    return throwError(() => ({ ...error, userMessage: errorMessage }));
  };
}