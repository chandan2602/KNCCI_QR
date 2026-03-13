import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface RegistrationRequest {
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

interface RegistrationResponse {
  success: boolean;
  message: string;
  application_id: number;
  student_id?: string;
}

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './registration.component.html',
  styleUrl: './registration.component.css'
})
export class RegistrationComponent {
  // API endpoint - update this to your actual API URL
  private apiUrl = 'http://localhost:8000/api/register'; // Change this to your API URL

  formData = {
    name: '',
    email: '',
    mobile: '',
    role: '',
    qualification: '',
    company: '',
    dateOfBirth: '',
    appointmentDate: '',
    appointmentSlot: '',
    address: ''
  };

  roleOptions = ['Student', 'Employee', 'Unemployed', 'Exploring my options'];
  
  qualificationOptions = [
    '10th Grade',
    '12th Grade', 
    'Diploma',
    'Bachelor\'s Degree',
    'Master\'s Degree',
    'PhD',
    'Other'
  ];

  // Time slots available for any day
  timeSlots = [
    '9:00am - 10:00am',
    '10:00am - 11:00am',
    '11:00am - 12:00pm',
    '1:00pm - 2:00pm',
    '2:00pm - 3:00pm',
    '3:00pm - 4:00pm',
    '4:00pm - 5:00pm'
  ];

  // Modal state
  showTimeSlotModal = false;
  selectedDateFormatted = '';
  
  // Form submission state
  isSubmitting = false;
  submitMessage = '';
  submitSuccess = false;
  showSuccessScreen = false;
  
  constructor(private http: HttpClient) {}
  
  async onSubmit() {
    if (this.isSubmitting) return;
    
    this.isSubmitting = true;
    this.submitMessage = '';
    
    try {
      // Validate required fields
      if (!this.formData.name || !this.formData.email || !this.formData.mobile || 
          !this.formData.role || !this.formData.dateOfBirth || 
          !this.formData.appointmentDate || !this.formData.appointmentSlot) {
        throw new Error('Please fill in all required fields');
      }

      // Additional validation for conditional fields
      if (this.formData.role === 'Student' && !this.formData.qualification) {
        throw new Error('Please select your qualification');
      }
      
      if (this.formData.role === 'Employee' && !this.formData.company) {
        throw new Error('Please enter your company name');
      }
      
      // Note: Unemployed and Exploring options don't need additional fields

      // Map form data to API format - match backend UserRegistration model exactly
      const registrationData: RegistrationRequest = {
        name: this.formData.name.trim(),
        email: this.formData.email.trim().toLowerCase(),
        mobile: this.formData.mobile.trim(),
        user_type: this.mapRoleToUserType(this.formData.role),
        date_of_birth: this.formData.dateOfBirth,
        appointment_date: this.formData.appointmentDate,
        slot: this.extractTimeSlot(this.formData.appointmentSlot),
        address: this.formData.address?.trim() || "",
        company_name: this.formData.role === 'Employee' ? (this.formData.company?.trim() || "") : "",
        qualification: this.formData.role === 'Student' ? (this.formData.qualification || "") : ""
      };

      // Log the data being sent for debugging
      console.log('Sending registration data:');
      console.log(JSON.stringify(registrationData, null, 2));

      // Make API call
      const response = await this.http.post<RegistrationResponse>(this.apiUrl, registrationData).toPromise();
      
      if (response?.success) {
        console.log('Registration successful, showing success screen');
        this.submitSuccess = true;
        this.showSuccessScreen = true;
        let message = 'Registration successful!';
        if (response.application_id) {
          message += ` Application ID: ${response.application_id}`;
        }
        if (response.student_id) {
          message += ` Student ID: ${response.student_id}`;
        }
        this.submitMessage = message;
        console.log('Success screen should now be visible:', this.showSuccessScreen);
        // Don't reset form here - show success screen instead
      } else {
        this.submitSuccess = false;
        this.submitMessage = response?.message || 'Registration failed. Please try again.';
      }
      
    } catch (error: any) {
      this.submitSuccess = false;
      console.log('Registration failed with error:', error);
      
      // Handle client-side validation errors
      if (error.message && typeof error.message === 'string') {
        this.submitMessage = error.message;
        this.isSubmitting = false;
        return;
      }
      
      // Log the full error for debugging
      console.error('Full registration error:');
      console.error('Status:', error.status);
      console.error('Error body:', error.error);
      console.error('Complete error object:', error);
      
      if (error.status === 422) {
        // Validation error - show detailed error message
        console.log('422 Error details:');
        console.log('Response body:', error.error);
        console.log('Response headers:', error.headers);
        
        if (error.error?.detail) {
          if (Array.isArray(error.error.detail)) {
            // Pydantic validation errors
            console.log('Validation errors:', error.error.detail);
            const errorMessages = error.error.detail.map((err: any) => {
              const field = err.loc ? err.loc.join('.') : 'unknown field';
              return `${field}: ${err.msg}`;
            }).join('\n');
            this.submitMessage = `Validation errors:\n${errorMessages}`;
          } else {
            this.submitMessage = `Validation error: ${error.error.detail}`;
          }
        } else {
          this.submitMessage = 'Invalid data format. Please check all fields.';
        }
      } else if (error.status === 400 && error.error?.detail) {
        this.submitMessage = error.error.detail;
      } else if (error.status === 500) {
        this.submitMessage = 'Server error. Please try again later.';
      } else {
        this.submitMessage = 'Registration failed. Please check your connection and try again.';
      }
      
    } finally {
      console.log('Finally block - setting isSubmitting to false');
      this.isSubmitting = false;
    }
  }
  
  // Helper method to map frontend role to backend user_type
  private mapRoleToUserType(role: string): string {
    switch (role) {
      case 'Student': return 'student';
      case 'Employee': return 'employee';
      case 'Unemployed': return 'unemployed';
      case 'Exploring my options': return 'exploring';
      default: return 'student';
    }
  }
  
  // Extract just the time slot from the full appointment string
  private extractTimeSlot(appointmentSlot: string): string {
    if (!appointmentSlot) return '';
    // Extract time part from "Friday, March 27, 2026 - 9:00am - 10:00am"
    const parts = appointmentSlot.split(' - ');
    if (parts.length >= 3) {
      return `${parts[parts.length - 2]} - ${parts[parts.length - 1]}`;
    }
    return appointmentSlot;
  }
  
  // Reset form after successful submission
  private resetForm(): void {
    this.formData = {
      name: '',
      email: '',
      mobile: '',
      role: '',
      qualification: '',
      company: '',
      dateOfBirth: '',
      appointmentDate: '',
      appointmentSlot: '',
      address: ''
    };
  }
  
  // Helper method to check if qualification field should be shown
  shouldShowQualification(): boolean {
    return this.formData.role === 'Student';
  }
  
  // Helper method to check if company field should be shown
  shouldShowCompany(): boolean {
    return this.formData.role === 'Employee';
  }

  // Get minimum date (today)
  getMinDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  // When date is selected, show time slot modal
  onDateSelected(): void {
    if (this.formData.appointmentDate) {
      const date = new Date(this.formData.appointmentDate);
      this.selectedDateFormatted = date.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
      this.showTimeSlotModal = true;
    }
  }

  // Select a time slot
  selectTimeSlot(slot: string): void {
    this.formData.appointmentSlot = `${this.selectedDateFormatted} - ${slot}`;
    this.closeTimeSlotModal();
  }

  // Close the time slot modal
  closeTimeSlotModal(): void {
    this.showTimeSlotModal = false;
  }
}