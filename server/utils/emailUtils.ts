import nodemailer from "nodemailer";
import { totp } from 'otplib';
import { IAppError } from '../../common/server.responses';
import { EMAIL, EMAIL_PW, EMAIL_SERVICE, VERIFICATION_EXP, JWT_KEY } from '../env';
import crypto from 'crypto';

export enum EmailType {
    VERIFICATION = "VERIFICATION",
    ACCOUNT_INACTIVE = "ACCOUNT_INACTIVE",
}

export class EmailUtils {

    /**
     * Send an email to the user
     * @param to The recipient's email address
     * @param emailType The type of email to send
     */
    public static async sendEmail(to: string, emailType: EmailType): Promise<void> {
        try {
            const { subject, text } = this.getEmailContent(to, emailType);

            const transporter = nodemailer.createTransport({
                service: EMAIL_SERVICE,
                auth: {
                    user: EMAIL,
                    pass: EMAIL_PW,
                },
            });

            const mailOptions = {
                from: EMAIL,
                to,
                subject,
                text,
            };

            const info = await transporter.sendMail(mailOptions);
            console.log(`🚨[Server]: Email sent to ${to}: ${info.response}`);
        } catch (error) {
            console.error(error);
            throw {
                type: "ServerError",
                name: "FailedSendEmail",
                message: `Failed to send email to ${to}`,
            } as IAppError;
        }
    }

    /**
     * Get the email content based on the email type
     */
    private static getEmailContent(to: string, emailType: EmailType) {
        switch (emailType) {
            case EmailType.VERIFICATION: {
                const token = this.generateOTP(to);
                return {
                    subject: "[ScottyBites] Email Verification Token",
                    text: `Dear customer,\n\nYour verification token is ${token}. It will expire in 10 minutes. \n\nBest,\nThe ScottyBites Team`,
                };
            }
            case EmailType.ACCOUNT_INACTIVE:
                return {
                    subject: "[ScottyBites] Account Inactivation Notice",
                    text: `Dear customer,\n\nYour account has been marked as Inactive and you have been logged out of the application. If you believe this is a mistake, please contact support.\n\nBest,\nThe ScottyBites Team`,
                };
            default:
                throw {
                    type: 'ServerError',
                    name: 'InvalidEmailType',
                    message: 'Invalid email type',
                } as IAppError;
        }
    }

    /**
     * Generate a 6-digit verification token based on the email and timestamp
     */
    public static generateOTP(key: string): string {
        try {
            // Step 300 seconds (5 minutes), window 1 (1 step back or forward), 6 digits
            totp.options = { step: 300, window: 1, digits: 6}

            // Generate a 6-digit token based on the email and SECRET_KEY (JWT_KEY)
            return totp.generate(key+JWT_KEY);
        } catch (error) {
            throw {
                type: 'ServerError',
                name: 'FailedTokenGeneration',
                message: 'Failed to generate the verification token',
            } as IAppError;
        }
    }

    /**
     * Validate the OTP
     */
    public static validateOTP(token: string, key: string): boolean {
        try {
            totp.options = { step: 300, window: 1, digits: 6 }

            // Validate the token based on the email and SECRET_KEY (JWT_KEY)
            return totp.check(token, key + JWT_KEY);
        } catch (error) {
            throw {
                type: 'ServerError',
                name: 'FailedRegistration',
                message: 'Failed to validate the token',
            } as IAppError;
        }
    }
}
