import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  logger = new Logger(EmailService.name);
  constructor(private readonly mailerService: MailerService) {}
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: to,
        subject: subject,
        text: body,
      });
      console.log('Email sent successfully');
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }

  async sendVerificationEmail(to: string, code: string): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Email Verification',
        template: './verification',
        context: {
          code,
        },
      });
      this.logger.log(`Verification email sent to ${to}`);
    } catch (error) {
      this.logger.error('Error sending verification email:', error);
    }
  }

  async sendPasswordResetEmail(to: string, token: string, frontUrl: string): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Password Reset',
        template: './password-reset',
        context: {
          token,
          frontUrl,
        },
      });
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (error) {
      this.logger.error('Error sending password reset email:', error);
    }
  }

  async sendPasswordChangedAlertEmail(to: string): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Security Alert: Password Changed',
        template: './password-changed-alert',
        context: {},
      });
      this.logger.log(`Password changed alert email sent to ${to}`);
    } catch (error) {
      this.logger.error('Error sending password changed alert email:', error);
    }
  }

  async sendAccountCreatedEmail(
    to: string,
    displayName: string,
    role: string,
    plainPassword: string,
    loginUrl: string,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Your Zero Waste Account Has Been Created',
        template: './account-created',
        context: {
          displayName,
          email: to,
          role,
          plainPassword,
          loginUrl,
          year: new Date().getFullYear(),
        },
      });
      this.logger.log(`Account creation email sent to ${to}`);
    } catch (error) {
      this.logger.error('Error sending account creation email:', error);
    }
  }
}
