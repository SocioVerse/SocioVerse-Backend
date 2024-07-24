class EmailTemplates {
    static registerTemplate = function (otp) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification OTP</title>
    <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; color: #333333; margin: 0; padding: 0; }
        .container { width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); }
        .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eeeeee; }
        .header h1 { font-size: 24px; margin: 0; }
        .content { padding: 20px 0; }
        .content p { font-size: 18px; line-height: 1.6; }
        .otp { font-size: 24px; color: #007BFF; font-weight: bold; text-align: center; margin: 20px 0; }
        .footer { text-align: center; padding-top: 20px; border-top: 1px solid #eeeeee; font-size: 12px; color: #777777; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Email Verification</h1>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>Thank you for registering. To complete your email verification, please use the following One Time Password (OTP):</p>
            <div class="otp">${otp}</div>
            <p>This OTP is valid for the next 10 minutes. Please do not share it with anyone.</p>
            <p>If you did not request this verification, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 SocioVerse. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`
    };

    static forgotPasswordTemplate = function (otp) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Forgot Password OTP</title>
    <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; color: #333333; margin: 0; padding: 0; }
        .container { width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); }
        .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eeeeee; }
        .header h1 { font-size: 24px; margin: 0; }
        .content { padding: 20px 0; }
        .content p { font-size: 18px; line-height: 1.6; }
        .otp { font-size: 24px; color: #007BFF; font-weight: bold; text-align: center; margin: 20px 0; }
        .footer { text-align: center; padding-top: 20px; border-top: 1px solid #eeeeee; font-size: 12px; color: #777777; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Forgot Password</h1>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>You recently requested to reset your password. To complete the process, please use the following One Time Password (OTP):</p>
            <div class="otp">${otp}</div>
            <p>This OTP is valid for the next 10 minutes. Please do not share it with anyone.</p>
            <p>If you did not request this password reset, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 SocioVerse. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`
    };
}
module.exports = EmailTemplates;