import { Device } from "./device.class";
import { Access } from "./access.class";
import { Group } from "./group.class";
import { TimeZone } from "./time-zone.class";
import moment from "moment";
import { convertTime, isAccessBetweenDates } from "../utils"

export class User {
    public groups: Group[] = []
    public overtime_zones: TimeZone[] = [];
    public workday_zones: TimeZone[] = [];
    public overtime_access: Access[] = [];
    public workday_access: Access[] = [];

    private constructor(
        private readonly device: Device,
        public readonly id: number,
        public readonly registration: string,
        public readonly name: string
    ) { }

    // Método estático para criar a instância e carregar os TimeZones
    static async create(device: Device, id: number, registration: string, name: string, start: moment.Moment, end: moment.Moment): Promise<User> {
        const user = new User(device, id, registration, name);
        await user.loadGroups();
        await user.loadTimeZones();
        await user.loadAccess(start, end);
        return user;
    }

    // Método privado para carregar os TimeZones
    private async loadTimeZones() {
        try {
            const time_zones_all: TimeZone[] = []
            const access_rules_set: Set<number> = new Set();
            const user_access_rules = await this.device.getUserAccessRules(this.id);
            user_access_rules.forEach(uar => {
                access_rules_set.add(uar.access_rule_id);
            });

            for (const group of this.groups) {
                const group_access_rules = await this.device.getGroupAccessRules(group.id);
                group_access_rules.forEach(gar => {
                    access_rules_set.add(gar.access_rule_id);
                });
            }
            // Convertendo de Set para array
            const access_rules: number[] = Array.from(access_rules_set);

            for (const access_rule of access_rules) {
                const access_rules_time_zones = await this.device.getAccessRuleTimeZone(access_rule);
                for (const access_rules_time_zone of access_rules_time_zones) {
                    const time_zones = await this.device.getTimeZone(access_rules_time_zone.time_zone_id);
                    time_zones_all.push(...time_zones);
                }
            }
            const zones = time_zones_all.filter(tz => {
                return tz.name.includes("[JORNADA]") || tz.name.includes("[EXTRA]")
            })
            this.overtime_zones = zones.filter(tz => tz.name.includes("[EXTRA]"));
            this.workday_zones = zones.filter(tz => tz.name.includes("[JORNADA]"));
        } catch (error) {
            throw new Error(`Erro ao carregar TimeZones para o usuário ${this.name}`);
        }
    }

    private async loadAccess(start: moment.Moment, end: moment.Moment) {
        try {
            const access = await this.device.getAcessLogs(this.id, start.unix(), end.unix())
            this.overtime_access = access.filter((ot_acc) => {
                const date_ot_acc = new Date(ot_acc.time * 1000);
                date_ot_acc.setHours(date_ot_acc.getHours() + 3);
                const day = date_ot_acc.getDay();
                return this.overtime_zones.some(oz => {
                    return oz.time_spans.some(ts => {
                        const start = convertTime(ts.start);
                        const end = convertTime(ts.end);
                        const date_start = new Date(date_ot_acc);
                        date_start.setHours(start.h, start.m, start.s, 0);
                        const date_end = new Date(date_ot_acc);
                        date_end.setHours(end.h, end.m, end.s, 0);
                        if (day === 0 && ts.sun && isAccessBetweenDates(date_start, date_end, date_ot_acc)) return true;
                        if (day === 1 && ts.mon && isAccessBetweenDates(date_start, date_end, date_ot_acc)) return true;
                        if (day === 2 && ts.tue && isAccessBetweenDates(date_start, date_end, date_ot_acc)) return true;
                        if (day === 3 && ts.wed && isAccessBetweenDates(date_start, date_end, date_ot_acc)) return true;
                        if (day === 4 && ts.thu && isAccessBetweenDates(date_start, date_end, date_ot_acc)) return true;
                        if (day === 5 && ts.fri && isAccessBetweenDates(date_start, date_end, date_ot_acc)) return true;
                        if (day === 6 && ts.sat && isAccessBetweenDates(date_start, date_end, date_ot_acc)) return true;
                        return false;
                    });
                });
            });
            this.workday_access = access.filter((ot_acc) => {
                const date_ot_acc = new Date(ot_acc.time * 1000);
                date_ot_acc.setHours(date_ot_acc.getHours() + 3);
                const day = date_ot_acc.getDay();
                return this.workday_zones.some(oz => {
                    return oz.time_spans.some(ts => {
                        const start = convertTime(ts.start);
                        const end = convertTime(ts.end);
                        const date_start = new Date(date_ot_acc);
                        date_start.setHours(start.h, start.m, start.s, 0);
                        const date_end = new Date(date_ot_acc);
                        date_end.setHours(end.h, end.m, end.s, 0);
                        if (day === 0 && ts.sun && isAccessBetweenDates(date_start, date_end, date_ot_acc)) return true;
                        if (day === 1 && ts.mon && isAccessBetweenDates(date_start, date_end, date_ot_acc)) return true;
                        if (day === 2 && ts.tue && isAccessBetweenDates(date_start, date_end, date_ot_acc)) return true;
                        if (day === 3 && ts.wed && isAccessBetweenDates(date_start, date_end, date_ot_acc)) return true;
                        if (day === 4 && ts.thu && isAccessBetweenDates(date_start, date_end, date_ot_acc)) return true;
                        if (day === 5 && ts.fri && isAccessBetweenDates(date_start, date_end, date_ot_acc)) return true;
                        if (day === 6 && ts.sat && isAccessBetweenDates(date_start, date_end, date_ot_acc)) return true;
                        return false;
                    });
                });
            });
        } catch (error) {
            console.error(`Erro ao carregar os acessos para o usuário ${this.name}:`, error);
            throw new Error(`Erro ao carregar os acessos para o usuário ${this.name}`);
        }
    }

    private async loadGroups() {
        try {
            const user_groups = await this.device.getUserGroups(this.id)
            for (const user_group of user_groups) {
                const group = await this.device.getGroup(user_group.group_id)
                this.groups.push(group)
            }
        } catch (error) {
            console.error(`Erro ao carregar Grupos para o usuário ${this.name}:`, error);
            throw new Error(`Erro ao carregar Grupos para o usuário ${this.name}`);
        }
    }
}
