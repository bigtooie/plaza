import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomeComponent } from './views/home/home.component';
import { AboutComponent } from './views/about/about.component';
import { LoginComponent } from './views/login/login.component';
import { LogoutComponent } from './views/logout/logout.component';
import { SessionlistComponent } from './views/sessionlist/sessionlist.component';
import { SessionviewComponent } from './views/sessionview/sessionview.component';
import { PlayerlistComponent } from './views/playerlist/playerlist.component';
import { PlayerviewComponent } from './views/playerview/playerview.component';
import { NewsessionComponent } from './views/newsession/newsession.component';
import { NotfoundComponent } from './views/notfound/notfound.component';
import { AdminPanelComponent } from './views/admin-panel/admin-panel.component';

import { LoggedInGuard } from './guards/logged-in.guard';
import { LoggedOutGuard } from './guards/logged-out.guard';
import { IsAdminGuard } from './guards/is-admin.guard';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'about', component: AboutComponent },
  { path: 'login', component: LoginComponent, canActivate: [LoggedOutGuard] },
  { path: 'logout', component: LogoutComponent, canActivate: [LoggedInGuard] },
  { path: 'sessions', component: SessionlistComponent, canActivate: [LoggedInGuard] },
  { path: 's/:id', component: SessionviewComponent },
  { path: 'players', component: PlayerlistComponent, canActivate: [LoggedInGuard] },
  { path: 'p/:id', component: PlayerviewComponent, canActivate: [LoggedInGuard] },
  { path: 'host', component: NewsessionComponent, canActivate: [LoggedInGuard] },

  { path: 'admin', component: AdminPanelComponent, canActivate: [IsAdminGuard] },
  { path: '**', component: NotfoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
