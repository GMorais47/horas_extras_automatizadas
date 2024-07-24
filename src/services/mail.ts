import nodemailer from "nodemailer"
import config from "../../config.json";

const transporter = nodemailer.createTransport({
    host: config.MAIL.HOST,
    port: config.MAIL.PORT,
    secure: config.MAIL.SECURE, // Use `true` for port 465, `false` for all other ports
    auth: {
        user: config.MAIL.AUTH.USER,
        pass: config.MAIL.AUTH.PASS,
    },
});

interface IProps {
    to: string[],
    subject: string,
    text: string,
    attachments: {
        filename: string,
        path: string
    }[]
}

export default async function sendMail({ to, subject, text, attachments }: IProps): Promise<boolean> {
    try {
        await transporter.sendMail({
            from: `${config.MAIL.FROM} <${config.MAIL.AUTH.USER}>`,
            to,
            subject,
            text,
            attachments,
        })
        return true
    } catch (error) {
        console.log(error)
        return false
    }
}