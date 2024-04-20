import 'dotenv/config'
import config from './config';
import Dispositivo from "./models/dipositivo";
import moment from 'moment';
import utils from './utils';
import { IHorasExtras, IUsuario_Acessos } from './types/interfaces';
import pdf from "html-pdf";
import path from 'path';
import cron from "node-cron";

moment.locale("pt-br")

const caminho = path.join(process.env.CAMINHO_EXTRAS!, 'HORAS EXTRAS');

async function main() {
    try {
        //Valida se as informações de conexão estão preenchidas
        if (
            typeof config.env.dispositivo.ip !== "string" ||
            typeof config.env.dispositivo.usuario !== "string" ||
            typeof config.env.dispositivo.senha !== "string"
        ) throw Error("Todas as informações do dispositivo são de preenchimento obrigatório!")

        //Cria um dispositivo
        const dipositivo = new Dispositivo(config.env.dispositivo.ip, config.env.dispositivo.usuario, config.env.dispositivo.senha)

        //Realiza o login no dispositivo
        await dipositivo.login()

        //Obtém os usuários do sistema
        let usuarios = await dipositivo.obtemUsuarios()

        //Obtém os horários dos usuários
        for (let i = 0; i < usuarios.length; i++) await dipositivo.obtemHorarioDeTrabalho(usuarios[i]).then(user => usuarios[i] = user)

        //Mantém apenas os usuários com um horário de trabalho configurado
        usuarios = usuarios.filter(user => user.begin_time && user.end_time)

        //Inicia o array de Acessos
        let acessos: IUsuario_Acessos[] = []

        //Data inicial
        const inicio = moment().clone().subtract(7, "days").startOf("day")

        //Data final
        const fim = moment().clone().subtract(1, "days").endOf("day")

        //Obtém os acessos por usuário
        for (const user of usuarios) await dipositivo.obtemAcessos(user, inicio, fim).then(acss => acessos.push({
            usuario: user,
            acessos: acss
        }))

        //Filtra apenas os acessos extras
        for (const user of usuarios) {

            //Define o horário de entrada do usuário
            const entrada = {
                hora: user.begin_time.split(':').map(Number)[0],
                minuto: user.begin_time.split(':').map(Number)[1],
                segundo: user.begin_time.split(':').map(Number)[2]
            }

            //Define o horário de saída do usuário
            const saida = {
                hora: user.end_time.split(':').map(Number)[0],
                minuto: user.end_time.split(':').map(Number)[1],
                segundo: user.end_time.split(':').map(Number)[2]
            }

            //Obtém o índice correspondente ao do usuário
            const index_acessos = acessos.findIndex(acss => acss.usuario.id === user.id)

            //Filtra apenas os horários que não pertencem a faixa de trabalho
            const acessos_extras = acessos[index_acessos].acessos.filter(acss => {
                const moment_atual = moment(acss.time);
                const moment_entrada = moment({ year: moment_atual.year(), month: moment_atual.month(), date: moment_atual.date(), hour: entrada.hora, minute: entrada.minuto, second: entrada.segundo }).subtract(config.env.tolerancia, "minutes")
                const moment_saida = moment({ year: moment_atual.year(), month: moment_atual.month(), date: moment_atual.date(), hour: saida.hora, minute: saida.minuto, second: saida.segundo }).add(config.env.tolerancia, "minutes")
                return moment_atual.isBefore(moment_entrada) || moment_atual.isAfter(moment_saida)
            })

            //Modifica o array de acessos
            acessos[index_acessos] = {
                usuario: user,
                acessos: acessos_extras
            }
        }

        //Remove os usuários que não possuem hora extra
        acessos = acessos.filter(acss => acss.acessos.length > 0)

        //Coloca a listagem em ordem alfabética
        acessos = acessos.sort((a, b) => a.usuario.name.localeCompare(b.usuario.name))

        let horas_extras: IHorasExtras = {
            inicio,
            fim,
            tolerancia: config.env.tolerancia,
            usuarios: []
        }

        for (const acss of acessos) {
            //Obtém os dias
            const dias = Array.from(new Set(acss.acessos.map(acs => moment(acs.time).date())))

            //Inicia os minutos trabalhados
            let minutos = 0

            const acessos_temporario: {
                dia: moment.Moment,
                entrada: moment.Moment,
                saida: moment.Moment,
                duracao: number
            }[] = []

            //Percorre para cada dia do Array
            for (const dia of dias) {

                //Obtém apenas os acessos do dia correspondente
                const acessos_por_dia = acss.acessos.filter(acs => moment(acs.time).date() === dia)

                //Define o horário de entrada do usuário
                const entrada = moment({ date: dia, month: moment(acessos_por_dia[0].time).month(), year: moment(acessos_por_dia[0].time).year(), hour: acss.usuario.begin_time.split(':').map(Number)[0], minute: acss.usuario.begin_time.split(':').map(Number)[1], second: acss.usuario.begin_time.split(':').map(Number)[2] })

                //Define o horário de saída do usuário
                const saida = moment({ date: dia, month: moment(acessos_por_dia[0].time).month(), year: moment(acessos_por_dia[0].time).year(), hour: acss.usuario.end_time.split(':').map(Number)[0], minute: acss.usuario.end_time.split(':').map(Number)[1], second: acss.usuario.end_time.split(':').map(Number)[2] })

                //Separa os acessos em acessos anteriores e superiores a faixa de trabalho
                const anterior = acessos_por_dia.filter(acs => moment(acs.time).isBefore(entrada)).sort((a, b) => moment(a.time).diff(moment(b.time)))
                const superior = acessos_por_dia.filter(acs => moment(acs.time).isAfter(saida)).sort((a, b) => moment(a.time).diff(moment(b.time)))

                //Realiza o cálculo das horas extras trabalhadas antes do horário de trabalho
                for (let i = 0; i < anterior.length; i++) {
                    const acesso = anterior[i]
                    const tipo_acesso = acesso.portal_id === 1 ? "Entrada" : "Saída"

                    if (tipo_acesso === "Entrada") {
                        const acesso_entrada = moment(acesso.time)
                        const acesso_saida = anterior[i + 1] ? moment(anterior[i + 1].time) : moment({ date: dia, month: moment(anterior[0].time).month(), year: moment(anterior[0].time).year(), hour: acss.usuario.begin_time.split(':').map(Number)[0], minute: acss.usuario.begin_time.split(':').map(Number)[1], second: acss.usuario.begin_time.split(':').map(Number)[2] }).subtract(config.env.tolerancia, "minutes")
                        const minutos_trabalhados = acesso_saida.diff(acesso_entrada, "minutes")
                        minutos += minutos_trabalhados

                        if (anterior[i + 1]) i++

                        //capturar informações
                        acessos_temporario.push({
                            dia: acesso_entrada,
                            entrada: acesso_entrada,
                            saida: acesso_saida,
                            duracao: minutos_trabalhados
                        })
                    } else {
                        const acesso_saida = moment(acesso.time)
                        const acesso_entrada = anterior[i - 1] ? moment(anterior[i - 1].time) : moment({ date: dia, month: moment(anterior[0].time).month(), year: moment(anterior[0].time).year() }).startOf("day")
                        const minutos_trabalhados = acesso_saida.diff(acesso_entrada, "minutes")
                        minutos += minutos_trabalhados

                        //capturar informações
                        acessos_temporario.push({
                            dia: acesso_saida,
                            entrada: acesso_entrada,
                            saida: acesso_saida,
                            duracao: minutos_trabalhados
                        })
                    }
                }

                //Realiza o cálculo das horas extras trabalhadas depois do horário de trabalho
                for (let i = 0; i < superior.length; i++) {
                    const acesso = superior[i]
                    const tipo_acesso = acesso.portal_id === 1 ? "Entrada" : "Saída"

                    if (tipo_acesso === "Entrada") {
                        const acesso_entrada = moment(acesso.time)
                        const acesso_saida = superior[i + 1] ? moment(superior[i + 1].time) : moment({ date: dia, month: moment(superior[0].time).month(), year: moment(superior[0].time).year() }).endOf("day")
                        const minutos_trabalhados = acesso_saida.diff(acesso_entrada, "minutes")
                        minutos += minutos_trabalhados

                        if (superior[i + 1]) i++


                        //capturar informações
                        acessos_temporario.push({
                            dia: acesso_entrada,
                            entrada: acesso_entrada,
                            saida: acesso_saida,
                            duracao: minutos_trabalhados
                        })
                    } else {
                        const acesso_saida = moment(acesso.time)
                        const acesso_entrada = superior[i - 1] ? moment(superior[i - 1].time) : moment({ date: dia, month: moment(superior[0].time).month(), year: moment(superior[0].time).year(), hour: acss.usuario.end_time.split(':').map(Number)[0], minute: acss.usuario.end_time.split(':').map(Number)[1], second: acss.usuario.end_time.split(':').map(Number)[2] }).add(config.env.tolerancia, "minutes")
                        const minutos_trabalhados = acesso_saida.diff(acesso_entrada, "minutes")
                        minutos += minutos_trabalhados


                        //capturar informações
                        acessos_temporario.push({
                            dia: acesso_saida,
                            entrada: acesso_entrada,
                            saida: acesso_saida,
                            duracao: minutos_trabalhados
                        })
                    }
                }
            }
            //Obtém as respostas
            horas_extras.usuarios.push({
                nome: acss.usuario.name,
                horario: {
                    entrada_normal: acss.usuario.begin_time,
                    saida_normal: acss.usuario.end_time,
                    entrada_tolerancia: moment({ hour: acss.usuario.begin_time.split(':').map(Number)[0], minute: acss.usuario.begin_time.split(':').map(Number)[1], second: acss.usuario.begin_time.split(':').map(Number)[2] }).clone().subtract(config.env.tolerancia, "minutes").format("HH:mm:ss"),
                    saida_tolerancia: moment({ hour: acss.usuario.end_time.split(':').map(Number)[0], minute: acss.usuario.end_time.split(':').map(Number)[1], second: acss.usuario.end_time.split(':').map(Number)[2] }).clone().add(config.env.tolerancia, "minutes").format("HH:mm:ss")
                },
                dias,
                duracao_total: minutos,
                acessos: acessos_temporario.filter(acs => acs.duracao > 0)
            })

        }

        // Mantendo apenas os dias com duração de horas extras maior que zero
        horas_extras.usuarios.map(user => {
            user.dias = user.dias.filter(dia => {
                const duracao = user.acessos.reduce((acc, curr) => curr.dia.date() === dia ? acc + curr.duracao : acc, 0)
                return duracao > 0
            })
        })

        // Filtrando usuários com duração total de horas extras maior que zero
        horas_extras.usuarios = horas_extras.usuarios.filter(hrs => hrs.duracao_total > 0)

        //Formata as informações para gerar o relatório geral
        const rel_geral_data = utils.formatar.relatorio.geral(horas_extras, config.env.tolerancia, config.env.preco_por_minuto)

        //Formata as informações para gerar o relatório individual
        const rel_individual_data = utils.formatar.relatorio.individual(horas_extras, config.env.tolerancia, config.env.preco_por_minuto)

        // Define os caminhos de saída
        const caminho_geral = path.join(caminho, moment().format("YYYY"), moment().format("MMMM").toUpperCase(), `SEMANA ${moment().isoWeek() - moment().startOf('month').isoWeek() + 1}`)
        const caminho_individual = path.join(caminho_geral, "INDIVIDUAL")

        //Define as opções para os arquivos PDF
        const opcoes_pdf: pdf.CreateOptions = {
            format: "A4",
            orientation: "portrait",
            border: {
                top: "1.5cm",
                bottom: "1.5cm",
                left: "1.5cm",
                right: "1.5cm",
            },
        }

        //Gera os relatórios
        utils.gerar.relatorio.geral(rel_geral_data, caminho_geral, opcoes_pdf)
        for (const rel_data of rel_individual_data.data) utils.gerar.relatorio.individual(rel_data, caminho_individual, opcoes_pdf)

    } catch (error) {
        console.log(error)
    }
}

cron.schedule('0 7 * * 5', main);