import { Component, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, RegistrationRequest, RegistrationResponse } from '../../services/api.service';

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registration.component.html',
  styleUrl: './registration.component.css'
})
export class RegistrationComponent {
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
  
  // Check if user already submitted
  alreadySubmitted = false;
  isCheckingExisting = false;
  existingApplication: any = null;
  
  // Email check timeout
  private emailCheckTimeout: any;
  
  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Only check localStorage if we're in the browser
    if (isPlatformBrowser(this.platformId)) {
      this.checkIfAlreadySubmitted();
    }
  }

  // Check on page load if user has already submitted (localStorage + API)
  private checkIfAlreadySubmitted(): void {
    // Only check localStorage in browser environment
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // First check localStorage for quick response
    const submittedData = localStorage.getItem('knnci_registration_submitted');
    if (submittedData) {
      const submission = JSON.parse(submittedData);
      console.log('Found localStorage submission:', submission);
      
      // Verify with API that this submission still exists
      this.verifySubmissionWithAPI(submission.email);
    }
  }

  // Verify localStorage submission with API
  private verifySubmissionWithAPI(email: string): void {
    this.apiService.getApplications().subscribe({
      next: (applications: any[]) => {
        const existingApp = applications.find((app: any) => 
          app.email && app.email.toLowerCase() === email.toLowerCase()
        );

        if (existingApp) {
          // Confirmed: submission exists in API
          this.alreadySubmitted = true;
          this.showSuccessScreen = true;
          this.submitMessage = `Registration already exists! Application ID: ${existingApp.id}`;
          console.log('Confirmed existing submission via API');
        } else {
          // Submission not found in API, clear localStorage
          if (isPlatformBrowser(this.platformId)) {
            localStorage.removeItem('knnci_registration_submitted');
          }
          console.log('Submission not found in API, cleared localStorage');
        }
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error verifying submission:', error);
        // On API error, trust localStorage for now
        if (isPlatformBrowser(this.platformId)) {
          const submittedData = localStorage.getItem('knnci_registration_submitted');
          if (submittedData) {
            const submission = JSON.parse(submittedData);
            this.alreadySubmitted = true;
            this.showSuccessScreen = true;
            this.submitMessage = `Registration already submitted! Application ID: ${submission.applicationId}`;
          }
        }
        this.cdr.detectChanges();
      }
    });
  }
  
  async onSubmit() {
    if (this.isSubmitting) return;
    
    // Check if email already exists before submitting
    if (this.alreadySubmitted) {
      this.submitMessage = 'This email is already registered. Please use a different email address.';
      this.submitSuccess = false;
      return;
    }
    
    this.isSubmitting = true;
    this.submitMessage = '';
    this.submitSuccess = false;
    
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

      // Map form data to API format
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

      console.log('Sending registration data:', registrationData);

      // Make API call using the service
      this.apiService.register(registrationData).subscribe({
        next: (response: RegistrationResponse) => {
          console.log('API Response received:', response);
          this.handleSuccessfulSubmission(response);
        },
        error: (error: any) => {
          console.error('Registration error:', error);
          this.handleSubmissionError(error);
        },
        complete: () => {
          this.isSubmitting = false;
          this.cdr.detectChanges();
        }
      });
      
    } catch (error: any) {
      console.error('Registration error:', error);
      this.handleSubmissionError(error);
      this.isSubmitting = false;
      this.cdr.detectChanges();
    }
  }

  // Handle successful submission
  private handleSuccessfulSubmission(response: RegistrationResponse): void {
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

    // Save to localStorage to prevent future submissions
    this.saveSubmissionToLocalStorage(response.application_id, response.student_id);
    
    // Reset form data
    this.resetForm();
    
    console.log('Success screen should now be visible');
  }

  // Handle submission errors
  private handleSubmissionError(error: any): void {
    this.submitSuccess = false;
    
    if (error.userMessage) {
      // Error from our API service
      this.submitMessage = error.userMessage;
    } else if (error.message && !error.status) {
      // Validation error from our code
      this.submitMessage = error.message;
    } else if (error.status === 400 && error.error?.detail === 'Email already registered') {
      this.submitMessage = 'This email is already registered. Please use a different email address.';
      this.alreadySubmitted = true;
    } else {
      this.submitMessage = 'Registration failed. Please try again.';
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

  // Close success screen and reset to form
  closeSuccessScreen(): void {
    this.showSuccessScreen = false;
    this.submitSuccess = false;
    this.submitMessage = '';
    this.alreadySubmitted = false;
    this.cdr.detectChanges();
  }

  // Start new registration (clear everything)
  startNewRegistration(): void {
    this.closeSuccessScreen();
    this.resetForm();
    // Clear localStorage if needed
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('knnci_registration_submitted');
    }
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

  // Called when email field changes
  onEmailChange(): void {
    // Debounce the API call to avoid too many requests
    clearTimeout(this.emailCheckTimeout);
    this.emailCheckTimeout = setTimeout(() => {
      this.checkExistingApplication(this.formData.email);
    }, 1000); // Wait 1 second after user stops typing
  }

  // Check if email already exists in applications via API
  private checkExistingApplication(email: string): void {
    if (!email || !email.includes('@')) {
      this.alreadySubmitted = false;
      this.isCheckingExisting = false;
      return;
    }

    this.isCheckingExisting = true;

    this.apiService.checkEmailExists(email).subscribe({
      next: (exists: boolean) => {
        this.alreadySubmitted = exists;
        this.isCheckingExisting = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error checking email:', error);
        // On error, allow form submission (don't block user)
        this.alreadySubmitted = false;
        this.isCheckingExisting = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Go back to form from error screen
  goBackToForm(): void {
    this.showSuccessScreen = false;
    this.alreadySubmitted = false;
    this.submitSuccess = false;
    this.submitMessage = '';
    this.isSubmitting = false;
    this.cdr.detectChanges();
  }

  // Save successful submission to localStorage
  private saveSubmissionToLocalStorage(applicationId: number, studentId?: string): void {
    // Only save to localStorage in browser environment
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const submissionData = {
      applicationId: applicationId,
      studentId: studentId,
      email: this.formData.email,
      submittedAt: new Date().toISOString()
    };
    localStorage.setItem('knnci_registration_submitted', JSON.stringify(submissionData));
    console.log('Submission saved to localStorage:', submissionData);
  }
}