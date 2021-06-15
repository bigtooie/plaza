import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ClipboardModule } from 'ngx-clipboard';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { NavbarComponent } from './navbar/navbar.component';

import { UuidtagComponent } from './widgets/uuidtag/uuidtag.component';
import { UserbuttonsComponent } from './widgets/userbuttons/userbuttons.component';
import { SessionstatusComponent } from './widgets/sessionstatus/sessionstatus.component';
import { User_playerislandnameComponent } from './widgets/user_playerislandname/user_playerislandname.component';

import { HomeComponent } from './views/home/home.component';
import { PlayerlistComponent } from './views/playerlist/playerlist.component';
import { PlayerviewComponent } from './views/playerview/playerview.component';
import { SessionlistComponent } from './views/sessionlist/sessionlist.component';
import { SessionviewComponent } from './views/sessionview/sessionview.component';
import { LoginComponent } from './views/login/login.component';
import { LogoutComponent } from './views/logout/logout.component';

import { AboutComponent } from './views/about/about.component';
import { NotfoundComponent } from './views/notfound/notfound.component';
import { NewsessionComponent } from './views/newsession/newsession.component';
import { AlertComponent } from './alert/alert.component';
import { AdminPanelComponent } from './views/admin-panel/admin-panel.component';
import { AdminSettingsComponent } from './views/admin/admin-settings/admin-settings.component';
import { AdvancedAccountCreatorComponent } from './views/admin/advanced-account-creator/advanced-account-creator.component';
import { PrivacyComponent } from './views/privacy/privacy.component';
import { TermsComponent } from './views/terms/terms.component';

@NgModule({
  declarations: [
    AppComponent,
    UuidtagComponent,
    NavbarComponent,
    PlayerlistComponent,
    SessionlistComponent,
    PlayerviewComponent,
    SessionviewComponent,
    AboutComponent,
    NotfoundComponent,
    HomeComponent,
    UserbuttonsComponent,
    LoginComponent,
    LogoutComponent,
    NewsessionComponent,
    AlertComponent,
    SessionstatusComponent,
    User_playerislandnameComponent,
    AdminPanelComponent,
    AdminSettingsComponent,
    AdvancedAccountCreatorComponent,
    PrivacyComponent,
    TermsComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    ReactiveFormsModule,
    NgbModule,
    ClipboardModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
