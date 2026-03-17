import { Component, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, RegistrationRequest, RegistrationResponse, TimeSlotResponse, AvailableSlot } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { timeout } from 'rxjs/operators';

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
    address: '',
    appointmentDate: '',
    appointmentSlot: ''
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

  // Time slots - will be populated dynamically from API
  timeSlots: string[] = [];
  availableSlots: AvailableSlot[] = [];

  // Modal state
  showTimeSlotModal = false;
  selectedDateFormatted = '';
  
  // Form submission state
  isSubmitting = false;
  submitMessage = '';
  submitSuccess = false;
  
  // Check if user already submitted
  alreadySubmitted = false;
  isCheckingExisting = false;
  existingApplication: any = null;
  
  // Email check timeout
  private emailCheckTimeout: any;

  // Loading states
  isLoadingSlots = false;
  
  // Selected slot data from API
  selectedSlotData: any = null;
  
  constructor(
    private apiService: ApiService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Initialize with clean state
    this.alreadySubmitted = false;
    this.isCheckingExisting = false;
    
    // Only check localStorage if we're in the browser
    if (isPlatformBrowser(this.platformId)) {
      this.checkIfAlreadySubmitted();
    }
  }

  // Check on page load if user has already submitted (localStorage + API)
  private checkIfAlreadySubmitted(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const submittedData = localStorage.getItem('knnci_registration_submitted');
    if (submittedData) {
      const submission = JSON.parse(submittedData);
      // Only verify if we have a valid email
      if (submission.email && submission.email.includes('@')) {
        this.verifySubmissionWithAPI(submission.email);
      }
    }
  }

  // Verify localStorage submission with API
  private verifySubmissionWithAPI(email: string): void {
    // Don't check if email is empty or invalid
    if (!email || !email.includes('@')) {
      return;
    }

    this.apiService.getApplications().subscribe({
      next: (applications: any[]) => {
        const existingApp = applications.find((app: any) => 
          app.email && app.email.toLowerCase() === email.toLowerCase()
        );

        if (existingApp) {
          // Only set the flag if the current form email matches the existing one
          if (this.formData.email && this.formData.email.toLowerCase() === email.toLowerCase()) {
            this.alreadySubmitted = true;
            console.log('Email already registered:', existingApp.id);
          }
        } else {
          if (isPlatformBrowser(this.platformId)) {
            localStorage.removeItem('knnci_registration_submitted');
          }
          this.alreadySubmitted = false;
        }
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error verifying submission:', error);
        // On error, don't show success screen, just check localStorage
        if (isPlatformBrowser(this.platformId)) {
          const submittedData = localStorage.getItem('knnci_registration_submitted');
          if (submittedData) {
            const submission = JSON.parse(submittedData);
            // Only set flag if current email matches stored email
            if (this.formData.email && submission.email && 
                this.formData.email.toLowerCase() === submission.email.toLowerCase()) {
              this.alreadySubmitted = true;
            }
          }
        }
        this.cdr.detectChanges();
      }
    });
  }
  
  async onSubmit() {
    if (this.isSubmitting) return;
    
    // Check if email already exists - show inline message only
    if (this.alreadySubmitted) {
      // Don't submit, user should change email
      return;
    }
    
    this.isSubmitting = true;
    this.submitMessage = '';
    this.submitSuccess = false;
    
    // Add timeout fallback to reset form state if API doesn't respond
    const timeoutId = setTimeout(() => {
      if (this.isSubmitting) {
        console.warn('⚠️ API timeout - resetting form state');
        this.isSubmitting = false;
        this.submitMessage = 'Request timed out. Please try again.';
        this.cdr.detectChanges();
      }
    }, 15000); // 15 second fallback timeout
    
    try {
      // Validate required fields
      if (!this.formData.name || !this.formData.email || !this.formData.mobile || 
          !this.formData.role || !this.formData.dateOfBirth || !this.formData.address ||
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
        address: this.formData.address.trim(),
        appointment_date: this.formData.appointmentDate,
        slot: this.extractTimeSlot(this.formData.appointmentSlot),
        company_name: this.formData.role === 'Employee' ? (this.formData.company?.trim() || null) : null,
        qualification: this.formData.role === 'Student' ? (this.formData.qualification || null) : null
      };

      // DETAILED DEBUG LOGGING
      console.log('🔍 FORM SUBMISSION DEBUG:');
      console.log('Raw Form Data:', this.formData);
      console.log('Mapped Registration Data:', registrationData);
      console.log('API URL:', `${this.apiService['baseUrl']}/api/register`);
      console.log('Slot Extraction:', {
        original: this.formData.appointmentSlot,
        extracted: this.extractTimeSlot(this.formData.appointmentSlot)
      });
      console.log('Field Validation:');
      console.log('- name:', registrationData.name ? '✅' : '❌', `"${registrationData.name}"`);
      console.log('- email:', registrationData.email ? '✅' : '❌', `"${registrationData.email}"`);
      console.log('- mobile:', registrationData.mobile ? '✅' : '❌', `"${registrationData.mobile}"`);
      console.log('- user_type:', registrationData.user_type ? '✅' : '❌', `"${registrationData.user_type}"`);
      console.log('- address:', registrationData.address ? '✅' : '❌', `"${registrationData.address}"`);
      console.log('- date_of_birth:', registrationData.date_of_birth ? '✅' : '❌', `"${registrationData.date_of_birth}"`);
      console.log('- appointment_date:', registrationData.appointment_date ? '✅' : '❌', `"${registrationData.appointment_date}"`);
      console.log('- slot:', registrationData.slot ? '✅' : '❌', `"${registrationData.slot}"`);
      console.log('- company_name:', registrationData.company_name !== undefined ? '✅' : '❌', `"${registrationData.company_name}"`);
      console.log('- qualification:', registrationData.qualification !== undefined ? '✅' : '❌', `"${registrationData.qualification}"`);

      // Make API call using the service
      this.apiService.register(registrationData).subscribe({
        next: (response: RegistrationResponse) => {
          clearTimeout(timeoutId); // Clear the timeout since we got a response
          this.handleSuccessfulRegistration(response);
        },
        error: (error: any) => {
          clearTimeout(timeoutId); // Clear the timeout since we got a response
          console.error('❌ REGISTRATION API ERROR:');
          console.error('Status:', error.status);
          console.error('Status Text:', error.statusText);
          console.error('URL:', error.url);
          console.error('Error Body:', error.error);
          console.error('Full Error Object:', error);
          
          // Log the exact request that was sent
          console.error('🚨 REQUEST DETAILS:');
          console.error('Method: POST');
          console.error('URL:', `${this.apiService['baseUrl']}/api/register`);
          console.error('Headers: Content-Type: application/json');
          console.error('Body sent:', JSON.stringify(registrationData, null, 2));
          
          // Check for specific error messages
          if (error.error && typeof error.error === 'object') {
            console.error('Backend Error Details:', error.error);
            if (error.error.detail) {
              console.error('Backend Detail:', error.error.detail);
            }
            if (error.error.message) {
              console.error('Backend Message:', error.error.message);
            }
          }
          
          // CRITICAL: Always reset isSubmitting flag on error
          this.isSubmitting = false;
          this.handleSubmissionError(error);
          this.cdr.detectChanges();
        },
        complete: () => {
          clearTimeout(timeoutId); // Clear the timeout on completion
          console.log('Registration API call completed');
          // CRITICAL: Ensure isSubmitting is reset on completion
          this.isSubmitting = false;
          this.cdr.detectChanges();
        }
      });
      
    } catch (error: any) {
      clearTimeout(timeoutId); // Clear the timeout on catch
      console.error('Registration error:', error);
      this.handleSubmissionError(error);
      this.isSubmitting = false;
      this.cdr.detectChanges();
    }
  }

  // Handle successful registration with inline notification only
  private handleSuccessfulRegistration(response: RegistrationResponse): void {
  console.log('✅ SUCCESS RESPONSE RECEIVED');

  this.isSubmitting = false;

  // IMPORTANT ORDER
  this.submitSuccess = true;
  this.submitMessage = 'Your registration has been recorded successfully.';

  // 🔥 FORCE CHANGE DETECTION AFTER STATE CHANGE
  setTimeout(() => {
    this.cdr.detectChanges();
  });

  this.sendConfirmationEmailAsync(response);
  this.saveSubmissionToLocalStorage(response.application_id, response.student_id);
}

  // Send confirmation email asynchronously without blocking UI
  private sendConfirmationEmailAsync(response: RegistrationResponse): void {
    setTimeout(() => {
      const email = this.formData.email;
      const name = this.formData.name;
      const studentId = response.student_id;
      
      console.log(`📧 Sending confirmation email to: ${email}`);
      
      this.apiService.sendFormSubmittedEmail(email, name, studentId).subscribe({
        next: (emailResponse: any) => {
          if (emailResponse.success) {
            console.log('✅ Confirmation email sent successfully');
            this.updateEmailStatus('📧 Confirmation email sent successfully');
          } else {
            console.warn('⚠️ Email sending failed');
            this.updateEmailStatus('📧 Email will be sent shortly');
          }
        },
        error: (error: any) => {
          console.error('❌ Email API error:', error);
          this.updateEmailStatus('📧 Email will be sent shortly');
        }
      });
    }, 100);
  }

  // Update email status in the success message
  private updateEmailStatus(newStatus: string): void {
    if (this.submitMessage) {
      this.submitMessage = this.submitMessage.replace(
        '📧 Confirmation email will be sent shortly',
        newStatus
      );
      this.cdr.detectChanges();
    }
  }

  // Handle submission errors
  private handleSubmissionError(error: any): void {
    this.submitSuccess = false;
    
    if (error.userMessage) {
      this.submitMessage = error.userMessage;
    } else if (error.message && !error.status) {
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
  
  // Extract and convert time slot to backend format (24-hour with hyphen: "09:00-10:00")
  private extractTimeSlot(appointmentSlot: string): string {
    if (!appointmentSlot) return '';
    
    const parts = appointmentSlot.split(' - ');
    if (parts.length >= 3) {
      let startTime = parts[parts.length - 2];
      let endTime = parts[parts.length - 1];
      
      endTime = endTime.replace(/\s*\([^)]*\)$/, '');
      
      const convertTo24Hour = (time12: string): string => {
        const time = time12.trim().toLowerCase();
        const [timePart, period] = [time.slice(0, -2), time.slice(-2)];
        let [hours, minutes] = timePart.split(':');
        
        let hour = parseInt(hours);
        if (period === 'pm' && hour !== 12) {
          hour += 12;
        } else if (period === 'am' && hour === 12) {
          hour = 0;
        }
        
        const hourStr = hour.toString().padStart(2, '0');
        return `${hourStr}:${minutes}`;
      };
      
      const start24 = convertTo24Hour(startTime);
      const end24 = convertTo24Hour(endTime);
      
      return `${start24}-${end24}`;
    }
    
    const timeMatch = appointmentSlot.match(/(\d{1,2}:\d{2}[ap]m)\s*-\s*(\d{1,2}:\d{2}[ap]m)/i);
    if (timeMatch) {
      const convertTo24Hour = (time12: string): string => {
        const time = time12.trim().toLowerCase();
        const [timePart, period] = [time.slice(0, -2), time.slice(-2)];
        let [hours, minutes] = timePart.split(':');
        
        let hour = parseInt(hours);
        if (period === 'pm' && hour !== 12) {
          hour += 12;
        } else if (period === 'am' && hour === 12) {
          hour = 0;
        }
        
        const hourStr = hour.toString().padStart(2, '0');
        return `${hourStr}:${minutes}`;
      };
      
      const start24 = convertTo24Hour(timeMatch[1]);
      const end24 = convertTo24Hour(timeMatch[2]);
      
      return `${start24}-${end24}`;
    }
    
    return appointmentSlot;
  }
  
  // Reset form after successful submission
   resetForm(): void {
    this.formData = {
      name: '',
      email: '',
      mobile: '',
      role: '',
      qualification: '',
      company: '',
      dateOfBirth: '',
      address: '',
      appointmentDate: '',
      appointmentSlot: ''
    };
    
    // Reset all form states
    this.timeSlots = [];
    this.availableSlots = [];
    this.selectedSlotData = null;
    this.isSubmitting = false;
    this.submitMessage = '';
    this.submitSuccess = false;
    this.alreadySubmitted = false;
    this.isCheckingExisting = false;
    this.existingApplication = null;
    
    // Clear any pending email check timeout
    if (this.emailCheckTimeout) {
      clearTimeout(this.emailCheckTimeout);
      this.emailCheckTimeout = null;
    }
    
    console.log('✅ Form completely reset');
  }

  // Close success screen and reset to form
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

  // When date is selected, show time slot modal with available slots from API
  onDateSelected(): void {
    if (this.formData.appointmentDate) {
      const date = new Date(this.formData.appointmentDate);
      this.selectedDateFormatted = date.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
      
      const apiDateFormat = this.formData.appointmentDate;
      console.log(`🗓️ Date selected: ${this.selectedDateFormatted} (API format: ${apiDateFormat})`);
      console.log(`🔗 API URL will be: ${this.apiService['baseUrl']}/api/counselors/available-slots?appointment_date=${apiDateFormat}`);
      
      this.loadAvailableSlots(apiDateFormat);
      this.showTimeSlotModal = true;
    }
  }

  // Load available time slots from API only (no fallback)
  private loadAvailableSlots(date: string): void {
    this.isLoadingSlots = true;
    this.timeSlots = []; // Clear any existing slots
    this.availableSlots = [];
    
    console.log(`Loading dynamic slots for date: ${date}`);
    
    // Only use API response - no fallback
    this.apiService.getAvailableSlots(date)
  .pipe(timeout(8000)) // ⏱️ max 8 sec
  .subscribe({
      next: (response: TimeSlotResponse) => {
        console.log('API response received:', response);
        
        if (response && response.available_slots && response.available_slots.length > 0) {
          // Store the full slot data from API
          this.availableSlots = response.available_slots;
          
          // Convert API time slots to display format
          this.timeSlots = response.available_slots.map(slot => {
            return this.formatTimeSlot(slot.time_slot, slot.counselors[0]?.counselor_name);
          });
          
          console.log(`Found ${this.timeSlots.length} dynamic slots:`, this.timeSlots);
        } else {
          // No slots available for this date - show empty
          this.timeSlots = [];
          this.availableSlots = [];
          console.log('No available slots for this date from API');
        }
        
        this.isLoadingSlots = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error loading available slots:', error);
        
        // On error, show empty slots (no fallback)
        this.timeSlots = [];
        this.availableSlots = [];
        this.isLoadingSlots = false;
        this.cdr.detectChanges();
        
        console.warn('Failed to load slots from API - no fallback used');
      }
    });
  }

  // Convert API time format to display format
  private formatTimeSlot(timeSlot: string, counselorName?: string): string {
    const [startTime, endTime] = timeSlot.split('-');
    
    const formatTime = (time: string): string => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'pm' : 'am';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes}${ampm}`;
    };
    
    const formattedStart = formatTime(startTime);
    const formattedEnd = formatTime(endTime);
    
    const slotText = `${formattedStart} - ${formattedEnd}`;
    return counselorName ? `${slotText} (${counselorName})` : slotText;
  }

  // Select a time slot
  selectTimeSlot(slot: string): void {
    const selectedSlotIndex = this.timeSlots.indexOf(slot);
    const originalSlot = this.availableSlots[selectedSlotIndex];
    
    if (originalSlot) {
      this.formData.appointmentSlot = `${this.selectedDateFormatted} - ${slot}`;
      
      this.selectedSlotData = {
        slot_id: originalSlot.counselors[0]?.slot_id,
        counselor_id: originalSlot.counselors[0]?.counselor_id,
        counselor_name: originalSlot.counselors[0]?.counselor_name,
        time_slot: originalSlot.time_slot
      };
    } else {
      this.formData.appointmentSlot = `${this.selectedDateFormatted} - ${slot}`;
    }
    
    this.closeTimeSlotModal();
  }

  // Close the time slot modal
  closeTimeSlotModal(): void {
    this.showTimeSlotModal = false;
  }

  // Called when email field changes
  onEmailChange(): void {
    // Reset the already submitted flag when user changes email
    this.alreadySubmitted = false;
    
    // Clear any pending email check timeout
    clearTimeout(this.emailCheckTimeout);
    
    // Only check if email is not empty and contains @
    if (this.formData.email && this.formData.email.includes('@')) {
      // Debounce the API call to avoid too many requests
      this.emailCheckTimeout = setTimeout(() => {
        this.checkExistingApplication(this.formData.email);
      }, 1000);
    } else {
      // If email is empty or invalid, ensure flags are reset
      this.alreadySubmitted = false;
      this.isCheckingExisting = false;
      this.cdr.detectChanges();
    }
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
        this.alreadySubmitted = false;
        this.isCheckingExisting = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Save successful submission to localStorage
  private saveSubmissionToLocalStorage(applicationId: number, studentId?: string): void {
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

  // Test API with current form data
  testApiWithCurrentData(): void {
    console.log('🧪 TESTING API WITH CURRENT FORM DATA:');
    
    // Create test data using current form values
    const testData: RegistrationRequest = {
      name: this.formData.name || 'Test User',
      email: this.formData.email || 'test@example.com',
      mobile: this.formData.mobile || '1234567890',
      user_type: this.mapRoleToUserType(this.formData.role) || 'student',
      date_of_birth: this.formData.dateOfBirth || '1990-01-01',
      address: this.formData.address || 'Test Address',
      appointment_date: this.formData.appointmentDate || '2026-03-20',
      slot: this.extractTimeSlot(this.formData.appointmentSlot) || '09:00-10:00',
      company_name: this.formData.role === 'Employee' ? (this.formData.company || null) : null,
      qualification: this.formData.role === 'Student' ? (this.formData.qualification || null) : null
    };
    
    console.log('Test Data:', testData);
    console.log('API URL:', `${this.apiService['baseUrl']}/api/register`);
    
    this.apiService.register(testData).subscribe({
      next: (response) => {
        console.log('✅ API Test Success:', response);
        alert('API test successful! Check console for details.');
      },
      error: (error) => {
        console.error('❌ API Test Failed:', error);
        alert(`API test failed! Status: ${error.status}. Check console for detailed error info.`);
      }
    });
  }
}