import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-landing-page',
  imports: [FormsModule, CommonModule],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.css'
})
export class LandingPageComponent {
  formData = {
    name: '',
    email: '',
    mobile: '',
    userType: '',
    companyName: '',
    qualification: '',
    dateOfBirth: '',
    appointmentDate: '',
    slot: ''
  };

  submitted = false;
  minDate: string;
  
  // Slot picker properties
  showSlotPicker: boolean = false;
  appointmentDisplayText: string = '';
  showCalendar: boolean = true; // New property to control calendar visibility
  
  // Calendar properties
  currentDate: Date = new Date();
  selectedDate: string = '';
  currentMonthYear: string = '';
  calendarDays: Array<{day: number, date: string, isPast: boolean}> = [];
  
  timeSlots = [
    { value: '9-10', label: '9:00am - 10:00am', booked: false },
    { value: '10-11', label: '10:00am - 11:00am', booked: true },
    { value: '11-12', label: '11:00am - 12:00pm', booked: false },
    { value: '1-2', label: '1:00pm - 2:00pm', booked: false },
    { value: '2-3', label: '2:00pm - 3:00pm', booked: false },
    { value: '3-4', label: '3:00pm - 4:00pm', booked: true },
    { value: '4-5', label: '4:00pm - 5:00pm', booked: false }
  ];

  constructor() {
    // Set minimum date to today
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];
    this.generateCalendar();
  }

  generateCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    // Set month/year display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    this.currentMonthYear = `${monthNames[month]} ${year}`;
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Get today for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    this.calendarDays = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      this.calendarDays.push({ day: 0, date: '', isPast: false });
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isPast = date < today;
      
      this.calendarDays.push({ 
        day, 
        date: dateString, 
        isPast 
      });
    }
  }

  previousMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.generateCalendar();
  }

  nextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.generateCalendar();
  }

  selectDate(date: string) {
    if (date) {
      this.selectedDate = date;
      this.formData.appointmentDate = date;
      // Reset slot when date changes and clear display
      this.formData.slot = '';
      this.appointmentDisplayText = '';
      // Hide calendar and show slots after date selection
      this.showCalendar = false;
    }
  }

  selectSlotAndClose(slot: string) {
    this.formData.slot = slot;
    this.updateAppointmentDisplay();
    // Close dropdown after slot selection
    this.showSlotPicker = false;
  }

  toggleSlotPicker() {
    this.showSlotPicker = !this.showSlotPicker;
    // Reset to show calendar when opening picker
    if (this.showSlotPicker) {
      this.showCalendar = true;
    }
  }

  goBackToCalendar() {
    this.showCalendar = true;
  }

  updateAppointmentDisplay() {
    // Only show text when BOTH date and slot are selected
    if (this.selectedDate && this.formData.slot) {
      const date = new Date(this.selectedDate + 'T00:00:00');
      const dateStr = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      const slot = this.timeSlots.find(s => s.value === this.formData.slot);
      this.appointmentDisplayText = `${dateStr} - ${slot?.label || ''}`;
    } else {
      // Keep input empty if either date or slot is missing
      this.appointmentDisplayText = '';
    }
  }

  getAvailableSlots() {
    // Return slots with different availability based on selected date
    // This simulates real-world scenario where different dates have different slot availability
    const dayOfWeek = new Date(this.selectedDate + 'T00:00:00').getDay();
    
    return this.timeSlots.map(slot => ({
      ...slot,
      // Simulate some slots being booked on different days
      booked: (dayOfWeek === 1 && (slot.value === '10-11' || slot.value === '3-4')) || // Monday
              (dayOfWeek === 2 && slot.value === '1-2') || // Tuesday
              (dayOfWeek === 3 && slot.value === '11-12') || // Wednesday
              (dayOfWeek === 4 && slot.value === '2-3') || // Thursday
              (dayOfWeek === 5 && slot.value === '4-5') // Friday
    }));
  }

  formatSelectedDate(): string {
    if (!this.selectedDate) return '';
    const date = new Date(this.selectedDate + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  formatSelectedDateTime(): string {
    if (!this.selectedDate || !this.formData.slot) return '';
    const date = new Date(this.selectedDate + 'T00:00:00');
    const dateStr = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    const slot = this.timeSlots.find(s => s.value === this.formData.slot);
    return `${dateStr} - ${slot?.label || ''}`;
  }

  formatDateTooltip(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  onUserTypeChange() {
    // Clear conditional fields when user type changes
    this.formData.companyName = '';
    this.formData.qualification = '';
  }

  onSubmit() {
    if (this.isFormValid()) {
      console.log('Form submitted:', this.formData);
      this.submitted = true;
      
      // Reset form after 3 seconds
      setTimeout(() => {
        this.resetForm();
      }, 3000);
    }
  }

  isFormValid(): boolean {
    const baseValid = !!(this.formData.name && 
                     this.formData.email && 
                     this.formData.mobile &&
                     this.formData.userType && 
                     this.formData.dateOfBirth &&
                     this.formData.appointmentDate &&
                     this.formData.slot);
    
    if (this.formData.userType === 'employee') {
      return baseValid && !!this.formData.companyName;
    } else if (this.formData.userType === 'student') {
      return baseValid && !!this.formData.qualification;
    }
    
    return baseValid;
  }

  resetForm() {
    this.formData = {
      name: '',
      email: '',
      mobile: '',
      userType: '',
      companyName: '',
      qualification: '',
      dateOfBirth: '',
      appointmentDate: '',
      slot: ''
    };
    this.submitted = false;
    this.selectedDate = '';
    this.showSlotPicker = false;
    this.showCalendar = true;
    this.appointmentDisplayText = '';
  }
}