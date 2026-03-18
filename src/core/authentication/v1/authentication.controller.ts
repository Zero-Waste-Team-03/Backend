import { Controller, Get, UseGuards,Logger, Res } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { USER } from '../decorators/user.decorartor';
import { GoogleGuard } from '../guards/oauth/google.guard';
import { Profile } from 'passport-google-oauth20';
import { Response } from 'express';

@ApiTags('Authentication - OAuth')
@Controller('authentication')
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthenticationService) { }
  logger = new Logger(AuthenticationController.name)
  @ApiOperation({
    summary: 'Google OAuth2 login',
    description: 'Initiates the Google OAuth2 login flow.',
  })
  @UseGuards(GoogleGuard)
  @Get('oauth/google')
  googleAuth() {
    return;
  }

  @ApiOkResponse({
    description: 'Redirects the user back to the app with tokens in the URL.',
  })
  @UseGuards(GoogleGuard)
  @Get('oauth/google/callback')
async googleAuthRedirect(@USER() profile: Profile, @Res() res: Response) {
  try {
    const user = await this.authenticationService.logOauthUser(profile);
    const tokens = await this.authenticationService.issueTokens(user);
    const redirectTarget = process.env.OAUTH_REDIRECT_URL || 'http://localhost:5173/auth/callback';
    res.redirect(`${redirectTarget}?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`);
  } catch (e) {
    this.logger.log(e);
    throw e;
  }
}
}
