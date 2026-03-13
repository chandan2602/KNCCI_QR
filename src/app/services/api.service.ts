import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { retry, catchError, timeout } from 'rxjs/operators';
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
  address: string;
}

export interface RegistrationResponse {
  success: boolean;
  message: string;
  application_id: number;
  student_id?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = environment.apiUrl;
  private readonly timeout = 30000; // 30 seconds
  private readonly maxRetries = 3;

  constructor(private http: HttpClient) {}

  // Register a new user
  register(data: RegistrationRequest): Observable<RegistrationResponse> {
    const url = `${this.baseUrl}/api/register`;
    
    return this.http.post<RegistrationResponse>(url, data, {
      headers: {
        'Content-Type': 'application/json'
      }
    }).pipe(
      timeout(this.timeout),
      retry({
        count: this.maxRetries,
        delay: (error, retryCount) => {
          // Exponential backoff: 1s, 2s, 4s
          const delayMs = Math.pow(2, retryCount) * 1000;
          console.log(`Retrying API call in ${delayMs}ms (attempt ${retryCount + 1})`);
          return timer(delayMs);
        }
      }),
      catchError(this.handleError)
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

  private handleError = (error: HttpErrorResponse) => {
    let errorMessage = 'An unexpected error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 0:
          errorMessage = 'Unable to connect to server. Please check your internet connection.';
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
          errorMessage = `Server Error: ${error.status} - ${error.message}`;
      }
    }
    
    console.error('API Error:', error);
    return throwError(() => ({ ...error, userMessage: errorMessage }));
  };
}