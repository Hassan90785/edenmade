import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import {readFileSync} from 'fs';
import {config} from "../config/config.mjs";

const baseTemplateSource = readFileSync('handlebars/baseTemplate.hbs', 'utf8');

const baseTemplate = handlebars.compile(baseTemplateSource);
const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: config.user,
        pass: config.pass
    }
});

// Define the sendEmail function
export const sendEmail = async (template, subject, data) => {
    try {
        console.log('==========sendEmail==============')
        // Read the specific template file
        const templateSource = readFileSync(template, 'utf8');
        // Compile the specific template
        const compiledTemplate = handlebars.compile(templateSource);
        // Generate the HTML for the email body
        const body = compiledTemplate(data);

        // Setup email data
        const mailOptions = {
            from: config.user,
            to: 'hassan90785@gmail.com',
            subject: subject,
            html: baseTemplate({subject: subject, body: body})
        };

        // Send mail with the existing transport object
        const info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

