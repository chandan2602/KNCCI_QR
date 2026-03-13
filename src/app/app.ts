import { Component } from '@angular/core';
import { RegistrationComponent } from './components/registration/registration.component';

@Component({
  selector: 'app-root',
  imports: [RegistrationComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {
}
