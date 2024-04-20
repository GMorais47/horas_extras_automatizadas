import ejs from "ejs"
import { IHorasExtras, IDataRelIndividual, IDataRelGeral, IDataIndividual, IDataGeral } from "../types/interfaces";
import pdf from "html-pdf";
import path from "path";

const formatar = {
    tempo(minutos: number): string {
        const horas = Math.floor(minutos / 60);
        const minutosRestantes = minutos % 60;
        const segundos = Math.floor((minutosRestantes % 1) * 60);
        const horasFormatadas = horas.toString().padStart(2, '0');
        const minutosFormatados = minutosRestantes.toString().padStart(2, '0');
        const segundosFormatados = segundos.toString().padStart(2, '0');
        return `${horasFormatadas}:${minutosFormatados}:${segundosFormatados}`;
    },
    relatorio: {
        geral(horas_extras: IHorasExtras, tolerancia: number, preco: number): IDataGeral {
            const data: IDataRelGeral[] = []

            for (const user of horas_extras.usuarios) {

                const registros: {
                    data: string,
                    entrada: string,
                    saida: string,
                    duracao: number,
                    total: number
                }[][] = []

                for (let i = 0; i < user.dias.length; i++) {
                    const registros_dia = user.acessos.filter(acc => acc.dia.date() === user.dias[i])
                    registros.push(registros_dia.map(acc => ({
                        data: acc.dia.format("DD/MM/YYYY"),
                        entrada: acc.entrada.format("HH:mm:ss"),
                        saida: acc.saida.format("HH:mm:ss"),
                        duracao: acc.duracao,
                        total: (acc.duracao * preco)
                    })))
                }

                data.push({
                    usuario: {
                        nome: user.nome,
                        horario: {
                            entrada: user.horario.entrada_normal,
                            saida: user.horario.saida_normal
                        }
                    },
                    dias: user.dias,
                    duracao_total: user.duracao_total,
                    valor_total: (user.duracao_total * preco),
                })
            }

            return {
                inicio: horas_extras.inicio.format("DD/MM/YYYY HH:mm:ss"),
                fim: horas_extras.fim.format("DD/MM/YYYY HH:mm:ss"),
                tolerancia: tolerancia.toString(),
                preco: preco.toLocaleString("pt-br", { style: "currency", currency: "BRL" }),
                duracao_total: horas_extras.usuarios.reduce((acc, curr) => acc + curr.duracao_total, 0),
                valor_total: horas_extras.usuarios.reduce((acc, curr) => acc + curr.duracao_total, 0) * preco,
                data
            }
        },
        individual(horas_extras: IHorasExtras, tolerancia: number, preco: number): IDataIndividual {
            const data: IDataRelIndividual[] = []

            for (const user of horas_extras.usuarios) {

                const registros: {
                    data: string,
                    entrada: string,
                    saida: string,
                    duracao: number,
                    total: number
                }[][] = []

                for (let i = 0; i < user.dias.length; i++) {
                    const registros_dia = user.acessos.filter(acc => acc.dia.date() === user.dias[i])
                    registros.push(registros_dia.map(acc => ({
                        data: acc.dia.format("DD/MM/YYYY"),
                        entrada: acc.entrada.format("HH:mm:ss"),
                        saida: acc.saida.format("HH:mm:ss"),
                        duracao: acc.duracao,
                        total: (acc.duracao * preco)
                    })))
                }

                data.push({
                    usuario: {
                        nome: user.nome,
                        horario: {
                            entrada: user.horario.entrada_normal,
                            saida: user.horario.saida_normal
                        }
                    },
                    consulta: {
                        inicio: horas_extras.inicio.format("DD/MM/YYYY HH:mm:ss"),
                        fim: horas_extras.fim.format("DD/MM/YYYY HH:mm:ss"),
                        preco: preco.toLocaleString("pt-br", { style: "currency", currency: "BRL" }),
                        tolerancia: formatar.tempo(horas_extras.tolerancia),
                        duracao_total: formatar.tempo(user.duracao_total),
                        horario: {
                            entrada: user.horario.entrada_tolerancia,
                            saida: user.horario.saida_tolerancia,
                        },
                        valor_total: (user.duracao_total * preco).toLocaleString("pt-br", { style: "currency", currency: "BRL" }),
                        registros
                    }
                })
            }

            return {
                inicio: horas_extras.inicio.format("DD/MM/YYYY HH:mm:ss"),
                fim: horas_extras.fim.format("DD/MM/YYYY HH:mm:ss"),
                tolerancia: tolerancia.toString(),
                preco: preco.toLocaleString("pt-br", { style: "currency", currency: "BRL" }),
                data
            }
        }
    }
}

const gerar = {
    relatorio: {
        geral(data: IDataGeral, caminho: string, opcoes?: pdf.CreateOptions) {
            ejs.renderFile(process.cwd() + "\\src\\templates\\rel-geral.ejs", data, (err, html) => {
                if (err) return console.error('Erro ao renderizar o template EJS:', err);
                pdf.create(html, opcoes).toFile(path.join(caminho, `GERAL.pdf`), (err, res) => {
                    if (err) return console.error('Erro ao gerar o PDF:', err);
                })
            })
        },
        individual(data: IDataRelIndividual, caminho: string, opcoes?: pdf.CreateOptions) {
            ejs.renderFile(process.cwd() + "\\src\\templates\\rel-individual.ejs", data, (err, html) => {
                if (err) return console.error('Erro ao renderizar o template EJS:', err);
                pdf.create(html, opcoes).toFile(path.join(caminho, `${data.usuario.nome}.pdf`), (err, res) => {
                    if (err) return console.error('Erro ao gerar o PDF:', err);
                })
            })
        }
    }
}

export default {
    formatar,
    gerar
}