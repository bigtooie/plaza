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
import { ControlPanelComponent } from './views/control-panel/control-panel.component';
import { AdminSettingsComponent } from './views/admin/admin-settings/admin-settings.component';
import { AdvancedAccountCreatorComponent } from './views/admin/advanced-account-creator/advanced-account-creator.component';
import { PrivacyComponent } from './views/privacy/privacy.component';
import { TermsComponent } from './views/terms/terms.component';
import { HelpComponent } from './views/help/help.component';
import { LogsComponent } from './views/admin/logs/logs.component';
import { JoinGuideComponent } from './views/guides/join-guide/join-guide.component';
import { HostGuideComponent } from './views/guides/host-guide/host-guide.component';
import { ProfileGuideComponent } from './views/guides/profile-guide/profile-guide.component';
import { GuideOverviewComponent } from './views/guides/guide-overview/guide-overview.component';
import { VerifierGuideComponent } from './views/guides/verifier-guide/verifier-guide.component';
import { ModeratorGuideComponent } from './views/guides/moderator-guide/moderator-guide.component';
import { AdminGuideComponent } from './views/guides/admin-guide/admin-guide.component';

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
    ControlPanelComponent,
    AdminSettingsComponent,
    AdvancedAccountCreatorComponent,
    PrivacyComponent,
    TermsComponent,
    HelpComponent,
    LogsComponent,
    JoinGuideComponent,
    HostGuideComponent,
    ProfileGuideComponent,
    GuideOverviewComponent,
    VerifierGuideComponent,
    ModeratorGuideComponent,
    AdminGuideComponent
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
