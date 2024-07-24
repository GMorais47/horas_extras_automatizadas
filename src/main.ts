import { calculateOvertime } from "./calculate-overtime"
import { generateGeneralPDF, generateIndividualPDF } from "./utils"
import path from 'path';
import config from "../config.json";
import moment from "moment";
import { CalculationGeneral } from "./class/calculation.class";
import sendMail from "./services/mail";
import cron from "node-cron"

const project_path = path.join(config.OVERTIME_PATH, 'HORAS EXTRAS');

const months = [
    "JANEIRO",
    "FEVEREIRO",
    "MARCO",
    "ABRIL",
    "MAIO",
    "JUNHO",
    "JULHO",
    "AGOSTO",
    "SETEMBRO",
    "OUTUBRO",
    "NOVEMBRO",
    "DEZEMBRO"
]

console.log("[ ATENÇÃO ] SISTEMA EM OPERAÇÃO!")
console.log("[ ATENÇÃO ] ATIVIDADES AGENDADAS PARA: TODA SEXTA-FEIRA AS 05:00!")

async function main() {
    try {
        // Define as datas da consuta
        const start: moment.Moment = moment().clone().subtract(7, "days").startOf("day")
        const end: moment.Moment = moment().clone().subtract(1, "days").endOf("day")

        const {
            calculations,
            users_removed_by_number_of_overtime_accesses,
            users_removed_due_to_lack_of_schedule,
            users_removed_due_to_lack_of_time_spans
        } = await calculateOvertime(start, end)
        const now = moment().clone()
        const exit_path = path.join(project_path, now.year().toString(), months[now.month()], `SEMANA ${now.weeksInYear()}`)
        const exit_individual_path = path.join(exit_path, "INDIVIDUAL")

        const attachments: {
            filename: string,
            path: string
        }[] = []

        for (const cal of calculations.sort((a, b) => a.user.name.localeCompare(b.user.name))) {
            const filename = `${cal.user.name}.pdf`
            const info = await generateIndividualPDF(exit_individual_path, filename, cal, {
                format: "A4",
                orientation: "portrait",
                border: {
                    top: "1.5cm",
                    bottom: "1.5cm",
                    left: "1.5cm",
                    right: "1.5cm",
                },
            })
            attachments.push({
                filename: filename,
                path: info.filename
            })
            console.log(`[ SUCESSO ] ${cal.user.name} - ${moment().format("DD/MM/YYYY HH:mm:ss")}`)
        }

        const calculationsGeneral = new CalculationGeneral(start.toDate(), end.toDate(), calculations, users_removed_by_number_of_overtime_accesses, users_removed_due_to_lack_of_schedule, users_removed_due_to_lack_of_time_spans)
        const filename = `GERAL.pdf`
        const info = await generateGeneralPDF(exit_path, filename, calculationsGeneral, {
            format: "A4",
            orientation: "portrait",
            border: {
                top: "1.5cm",
                bottom: "1.5cm",
                left: "1.5cm",
                right: "1.5cm",
            },
        })
        attachments.push({
            filename: filename,
            path: info.filename
        })
        console.log(`[ SUCESSO ] RELATÓRIO GERAL - ${moment().format("DD/MM/YYYY HH:mm:ss")}`)

        console.log(`\n[ SUCESSO ] Relatórios exportados para: ${exit_path} - ${moment().format("DD/MM/YYYY HH:mm:ss")}`)
        await sendMail({
            to: config.MAIL.TO,
            subject: `RELATÓRIOS DE HORAS EXTRAS DE ${start.format("DD/MM/YYYY HH:mm:ss")} A ${end.format("DD/MM/YYYY HH:mm:ss")}`,
            text: `Olá,\nEspero que este e-mail lhe encontre bem,\nEstou mandando em anexo os relatórios das horas extras do período ${start.format("DD/MM/YYYY HH:mm:ss")} as ${end.format("DD/MM/YYYY HH:mm:ss")}, os mesmos arquivos estão disponíveis no seguinte diretório de pastas na rede da empresa: ${exit_path}.\n\nAtenciosamente,\n${config.MAIL.FROM}`,
            attachments
        })
    } catch (error) {
        console.log(error)
    }
}

cron.schedule('0 5 * * 5', main);