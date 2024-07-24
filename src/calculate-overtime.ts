import { Device } from './class/device.class';
import { User } from './class/user.class';
import { convertTime, findNearestPreviousTimeSpan, findNearestTimeSpan } from './utils';
import { Access } from './class/access.class';
import { Calculation, OvertimeCalculation } from './class/calculation.class';
import moment from 'moment';
import config from "../config.json"

interface IRes {
    users_removed_by_number_of_overtime_accesses: User[],
    users_removed_due_to_lack_of_schedule: User[],
    users_removed_due_to_lack_of_time_spans: User[],
    calculations: Calculation[]
}

export async function calculateOvertime(start: moment.Moment, end: moment.Moment): Promise<IRes> {
    return new Promise<IRes>(async (res, rej) => {
        try {
            // Inicia o dispositivo
            const device = new Device(config.ADDRESS_DEVICE, config.USER_DEVICE, config.PASSWORD_DEVICE);

            // Realiza a autenticação
            await device.signin();

            // Obtém os usuários
            const users_devices = await device.getUsers(start, end);

            // Usuários que não possuem acessos extras
            const users_removed_by_number_of_overtime_accesses: User[] = [];

            // Usuários que não possuem fusos horários
            const users_removed_due_to_lack_of_schedule: User[] = [];

            // Usuários que não possuem intervalos de tempo configurados nos fusos horários
            const users_removed_due_to_lack_of_time_spans: User[] = [];

            const users = users_devices.filter((user) => {
                if (user.overtime_access.length === 0) {
                    users_removed_by_number_of_overtime_accesses.push(user);
                    return false;
                }
                if (user.workday_zones.length === 0 || user.overtime_zones.length === 0) {
                    users_removed_due_to_lack_of_schedule.push(user);
                    return false;
                }
                if (!user.overtime_zones.every((tz) => tz.time_spans.length > 0) || !user.overtime_zones.every((tz) => tz.time_spans.length > 0)) {
                    users_removed_due_to_lack_of_time_spans.push(user);
                    return false;
                }
                return true;
            });

            const calculations: Calculation[] = []
            // Calcula as horas extras dos usuários
            for (const user of users) {
                let duration = 0; // total de segundos
                const overtime_calculations: OvertimeCalculation[] = []
                for (let i = 0; i < user.overtime_access.length; i++) {
                    const { overtime_access } = user;
                    const access = overtime_access[i];
                    const date_access = new Date(access.time * 1000);
                    date_access.setHours(date_access.getHours() + 3);
                    let diff = 0;
                    const type = access.portal_id === 1 ? "entry" : "exit";
                    const nearest_time_span = findNearestTimeSpan(user.workday_zones, date_access)
                    const nearest_previous_time_span = findNearestPreviousTimeSpan(user.workday_zones, date_access)
                    if (type === "entry") {
                        let exit_observation: { exit: Date | null, observation?: string }
                        //Acesso do tipo entrada
                        let next_access: Access | null = overtime_access[i + 1];
                        if (next_access && next_access.portal_id === 2) {
                            // Existe acesso de saída
                            const date_next_access = new Date(next_access.time * 1000);
                            date_next_access.setHours(date_next_access.getHours() + 3);
                            if (nearest_time_span) {
                                const convert_nearest = convertTime(nearest_time_span.start)
                                if (date_next_access.getHours() > convert_nearest.h) {
                                    const date_nearest_access = new Date(date_access)
                                    date_nearest_access.setHours(convert_nearest.h, convert_nearest.m, convert_nearest.s)
                                    diff = (date_nearest_access.getTime() - date_access.getTime()) / 1000;
                                    exit_observation = { exit: date_nearest_access, observation: "Considerado o horário de início da jornada!" }
                                } else {
                                    diff = (date_next_access.getTime() - date_access.getTime()) / 1000;
                                    exit_observation = { exit: date_next_access, observation: next_access.event === 6 ? "O Acesso de saída foi bloqueado!" : undefined }
                                }
                            } else {
                                diff = (date_next_access.getTime() - date_access.getTime()) / 1000;
                                exit_observation = { exit: date_next_access, observation: next_access.event === 6 ? "O Acesso de saída foi bloqueado!" : undefined }
                            }
                            ++i
                        } else {
                            if (nearest_time_span) {
                                const convert_nearest = convertTime(nearest_time_span.start)
                                const date_nearest = new Date(date_access)
                                date_nearest.setHours(convert_nearest.h, convert_nearest.m, convert_nearest.s, 0)
                                diff = (date_nearest.getTime() - date_access.getTime()) / 1000;
                                exit_observation = { exit: date_nearest, observation: "Considerado o horário de início da jornada!" }
                            } else {
                                exit_observation = { exit: null }
                            }
                        }
                        overtime_calculations.push(new OvertimeCalculation(type, date_access, exit_observation.exit, diff, [access.event === 6 ? "O Acesso de entrada foi bloqueado!" : undefined, exit_observation.observation].filter(obs => obs !== undefined).join(", ")))
                    } else {
                        let entry_observation: { entry: Date | null, observation?: string }
                        let last_access: Access | null = overtime_access[i - 1];
                        if (last_access && last_access.portal_id === 1) {
                            // Existe acesso de saída
                            const date_last_access = new Date(last_access.time * 1000);
                            date_last_access.setHours(date_last_access.getHours() + 3);
                            if (nearest_previous_time_span) {
                                const convert_nearest = convertTime(nearest_previous_time_span.start)
                                if (date_last_access.getHours() > convert_nearest.h) {
                                    entry_observation = { entry: null, observation: "REGRA DE CÁLCULO EM DESENVOLVIMENTO!" }
                                } else {
                                    entry_observation = { entry: null, observation: "REGRA DE CÁLCULO EM DESENVOLVIMENTO!" }
                                }
                            } else {
                                diff = (date_access.getTime() - date_last_access.getTime()) / 1000;
                                entry_observation = { entry: date_last_access, observation: last_access.event === 6 ? "O Acesso de entrada foi bloqueado!" : "" }
                            }
                            ++i
                        } else {
                            if (nearest_previous_time_span) {
                                const convert_nearest = convertTime(nearest_previous_time_span.end)
                                const date_nearest_previous = new Date(date_access)
                                date_nearest_previous.setHours(convert_nearest.h, convert_nearest.m, convert_nearest.s, 0)
                                diff = (date_access.getTime() - date_nearest_previous.getTime()) / 1000;
                                entry_observation = { entry: date_nearest_previous, observation: "Considerado o horário de fim da jornada!" }
                            } else {
                                entry_observation = { entry: null, observation: "Não exite ponto de entrada e nem horário anterior!" }
                            }
                        }
                        overtime_calculations.push(new OvertimeCalculation(type, entry_observation.entry, date_access, diff, [access.event === 6 ? "O Acesso de saída foi bloqueado!" : undefined, entry_observation.observation].filter(obs => obs !== undefined).join(", ")))
                    }
                    duration += diff;
                }
                const calculation: Calculation = new Calculation(user, duration, overtime_calculations, start.toDate(), end.toDate())
                calculations.push(calculation)
            }

            await device.signout()
            res({
                users_removed_by_number_of_overtime_accesses,
                users_removed_due_to_lack_of_schedule,
                users_removed_due_to_lack_of_time_spans,
                calculations
            })
        } catch (error) {
            rej(error)
        }
    })
}
