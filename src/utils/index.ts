import ejs from "ejs"
import pdf from "html-pdf";
import path from "path";
import { AxiosError } from "axios";
import { TimeZone } from "../class/time-zone.class";
import { TimeSpan } from "../class/time-span.class";
import { Calculation, CalculationGeneral } from "../class/calculation.class";

export function trycatch<T>(callback: () => Promise<T>) {
    try {
        return callback()
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.code === "ECONNREFUSED") throw Error(`[DEVICE] - Dispositivo não encontrado!`)
            if (error.response?.data) throw Error(`[DEVICE] - ${error.response.data.error}`)
        }
        throw error
    }
}

export function convertTime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return { h, m, s };
}

export function findNearestTimeSpan(timeZones: TimeZone[], date: Date): TimeSpan | null {
    let nearestTimeSpan: null | TimeSpan = null;
    let minDiff = Infinity;
    const dayOfWeek = date.getDay(); // 0 = domingo, 1 = segunda-feira, etc.

    for (const tz of timeZones) {
        for (const ts of tz.time_spans) {
            if ((dayOfWeek === 0 && ts.sun) ||
                (dayOfWeek === 1 && ts.mon) ||
                (dayOfWeek === 2 && ts.tue) ||
                (dayOfWeek === 3 && ts.wed) ||
                (dayOfWeek === 4 && ts.thu) ||
                (dayOfWeek === 5 && ts.fri) ||
                (dayOfWeek === 6 && ts.sat)) {

                const start = convertTime(ts.start);
                const end = convertTime(ts.end);
                const date_start = new Date(date);
                date_start.setHours(start.h, start.m, start.s, 0);
                const date_end = new Date(date);
                date_end.setHours(end.h, end.m, end.s, 0);
                const diff = Math.abs(date.getTime() - date_start.getTime());

                if (date.getTime() < date_end.getTime() && diff < minDiff) {
                    minDiff = diff;
                    nearestTimeSpan = ts;
                }
            }
        }
    }
    return nearestTimeSpan;
}

export function findNearestPreviousTimeSpan(timeZones: TimeZone[], date: Date): TimeSpan | null {
    let nearestTimeSpan: null | TimeSpan = null;
    let minDiff = Infinity;
    const dayOfWeek = date.getDay(); // 0 = domingo, 1 = segunda-feira, etc.

    for (const tz of timeZones) {
        for (const ts of tz.time_spans) {
            if ((dayOfWeek === 0 && ts.sun) ||
                (dayOfWeek === 1 && ts.mon) ||
                (dayOfWeek === 2 && ts.tue) ||
                (dayOfWeek === 3 && ts.wed) ||
                (dayOfWeek === 4 && ts.thu) ||
                (dayOfWeek === 5 && ts.fri) ||
                (dayOfWeek === 6 && ts.sat)) {

                const start = convertTime(ts.start);
                const end = convertTime(ts.end);
                const date_start = new Date(date);
                date_start.setHours(start.h, start.m, start.s, 0);
                const date_end = new Date(date);
                date_end.setHours(end.h, end.m, end.s, 0);

                if (date.getTime() > date_end.getTime()) {
                    const diff = date.getTime() - date_end.getTime();
                    if (diff < minDiff) {
                        minDiff = diff;
                        nearestTimeSpan = ts;
                    }
                }
            }
        }
    }
    return nearestTimeSpan;
}

export function isAccessBetweenDates(start: Date, end: Date, access: Date) {
    const startTime = start.getTime();
    const endTime = end.getTime();
    const accessTime = access.getTime();

    return accessTime >= startTime && accessTime <= endTime;
}

export function doTheDatesBelongToTheSamePeriod(date1: Date, date2: Date, time_span: TimeSpan): boolean {
    // Converte o horário de início e término do time_span para objetos Date ajustados para a data de date1
    const start = convertTime(time_span.start);
    const end = convertTime(time_span.end);

    const date1_start = new Date(date1);
    date1_start.setHours(start.h, start.m, start.s, 0);

    const date1_end = new Date(date1);
    date1_end.setHours(end.h, end.m, end.s, 0);

    const date2_start = new Date(date2);
    date2_start.setHours(start.h, start.m, start.s, 0);

    const date2_end = new Date(date2);
    date2_end.setHours(end.h, end.m, end.s, 0);

    // Verifica se date1 e date2 estão dentro do intervalo time_span
    const isDate1InPeriod = date1 >= date1_start && date1 <= date1_end;
    const isDate2InPeriod = date2 >= date2_start && date2 <= date2_end;

    // Verifica se ambas as datas pertencem ao mesmo período time_span
    return isDate1InPeriod && isDate2InPeriod;
}

export async function generateIndividualPDF(output_path: string, fileName: string, calculation: Calculation, options?: pdf.CreateOptions): Promise<pdf.FileInfo> {
    return new Promise<pdf.FileInfo>((resolve, reject) => {
        const templatePath = path.join(process.cwd(), 'src', 'templates', 'calculation.ejs');

        ejs.renderFile(templatePath, { calculation }, { async: false }, (err, html) => {
            if (err) {
                console.error('Erro ao renderizar o template EJS:', err);
                return reject(err);
            }

            if (!html) {
                console.error('HTML renderizado é vazio ou indefinido.');
                return reject(new Error('HTML renderizado é vazio ou indefinido.'));
            }

            const outputFilePath = path.join(output_path, fileName);

            pdf.create(html, options).toFile(outputFilePath, (err, res) => {
                if (err) {
                    console.error('Erro ao criar o PDF:', err);
                    return reject(err);
                }

                resolve(res);
            });
        });
    });
}

export async function generateGeneralPDF(output_path: string, fileName: string, calculationGeneral: CalculationGeneral, options?: pdf.CreateOptions): Promise<pdf.FileInfo> {
    return new Promise<pdf.FileInfo>((resolve, reject) => {
        const templatePath = path.join(process.cwd(), 'src', 'templates', 'general.ejs');

        ejs.renderFile(templatePath, { calculationGeneral }, { async: false }, (err, html) => {
            if (err) {
                console.error('Erro ao renderizar o template EJS:', err);
                return reject(err);
            }

            if (!html) {
                console.error('HTML renderizado é vazio ou indefinido.');
                return reject(new Error('HTML renderizado é vazio ou indefinido.'));
            }

            const outputFilePath = path.join(output_path, fileName);

            pdf.create(html, options).toFile(outputFilePath, (err, res) => {
                if (err) {
                    console.error('Erro ao criar o PDF:', err);
                    return reject(err);
                }

                resolve(res);
            });
        });
    });
}