import axios, { Axios, AxiosError } from "axios";
import { trycatch } from "../utils";
import { User } from "./user.class";
import { TimeSpan } from "./time-span.class";
import { TimeZone } from "./time-zone.class";
import { AccessRules } from "./access-rules.class";
import { Access } from "./access.class";
import { Group } from "./group.class";

export class Device {
    constructor(
        private readonly address: string,
        private readonly user: string,
        private readonly password: string,
        private readonly api?: Axios,
        public session?: string
    ) {
        this.api = axios.create({
            baseURL: this.address
        })
    }

    private async validate<T>(callback: (api: Axios) => Promise<T>): Promise<T> {
        return trycatch(async () => {
            if (this.api === undefined) throw new Error("[DEVICE] - API inválida!")
            if (this.session) {
                const { data } = await this.api.post(`/session_is_valid.fcgi?session=${this.session}`)
                const validation = data.session_is_valid as boolean
                if (validation) return await callback(this.api)
                await this.signin()
                return await callback(this.api)
            } else {
                await this.signin()
                return await callback(this.api)
            }
        })
    }

    async signin() {
        await trycatch(async () => {
            if (this.api === undefined) throw new Error("[DEVICE] - API inválida!")
            const { data } = await this.api.post(`/login.fcgi`, {
                login: this.user,
                password: this.password
            })
            this.session = data.session
        })
    }

    async signout() {
        await this.validate(async (api) => {
            if (this.session) {
                await api.post(`/logout.fcgi?session=${this.session}`)
                this.session = undefined
            }
        })
    }

    async getUsers(start: moment.Moment, end: moment.Moment): Promise<User[]> {
        return this.validate(async (api) => {
            const { data } = await api.post(`/load_objects.fcgi?session=${this.session}`, {
                object: "users",
            });

            // Mapeia e aguarda todas as Promises para criar os usuários
            const users = await Promise.all(data.users.map(async (user: any) =>
                await User.create(this, user.id, user.registration, user.name, start, end)
            ));

            return users;
        });
    }

    async getUserAccessRules(user_id: number): Promise<{ user_id: number, access_rule_id: number }[]> {
        return this.validate(async (api) => {
            const key = "user_access_rules"
            const { data } = await api.post(`/load_objects.fcgi?session=${this.session}`, {
                object: key,
                where: [
                    {
                        object: key,
                        field: "user_id",
                        operator: "=",
                        value: user_id
                    }
                ]
            })
            return data[key]
        })
    }
    
    async getGroupAccessRules(group_id: number): Promise<{ group_id: number, access_rule_id: number }[]> {
        return this.validate(async (api) => {
            const key = "group_access_rules"
            const { data } = await api.post(`/load_objects.fcgi?session=${this.session}`, {
                object: key,
                where: [
                    {
                        object: key,
                        field: "group_id",
                        operator: "=",
                        value: group_id
                    }
                ]
            })
            return data[key]
        })
    }

    async getAccessRule(id: number): Promise<AccessRules[]> {
        return this.validate(async (api) => {
            const key = "access_rules"
            const { data } = await api.post(`/load_objects.fcgi?session=${this.session}`, {
                object: key,
                where: [
                    {
                        object: key,
                        field: "id",
                        operator: "=",
                        value: id
                    }
                ]
            })
            return data[key].map((obj: any) => new AccessRules(obj.id, obj.name))
        })
    }

    async getAccessRuleTimeZone(access_rule_id: number): Promise<{ access_rule_id: number, time_zone_id: number }[]> {
        return this.validate(async (api) => {
            const key = "access_rule_time_zones"
            const { data } = await api.post(`/load_objects.fcgi?session=${this.session}`, {
                object: key,
                where: [
                    {
                        object: key,
                        field: "access_rule_id",
                        operator: "=",
                        value: access_rule_id
                    }
                ]
            })
            return data[key]
        })
    }

    async getTimeZone(time_zone_id: number): Promise<TimeZone[]> {
        return this.validate(async (api) => {
            const key = "time_zones"
            const { data } = await api.post(`/load_objects.fcgi?session=${this.session}`, {
                object: key,
                where: [
                    {
                        object: key,
                        field: "id",
                        operator: "=",
                        value: time_zone_id
                    }
                ]
            })
            // Mapeia e aguarda todas as Promises para criar os timezones
            const times_zones = await Promise.all(data[key].map(async (obj: any) =>
                await TimeZone.create(this, obj.id, obj.name)
            ));

            return times_zones;

        })
    }

    async getTimeSpans(time_zone_id: number): Promise<TimeSpan[]> {
        return this.validate(async (api) => {
            const key = "time_spans"
            const { data } = await api.post(`/load_objects.fcgi?session=${this.session}`, {
                object: key,
                where: [
                    {
                        object: key,
                        field: "time_zone_id",
                        operator: "=",
                        value: time_zone_id
                    }
                ]
            })
            return data[key].map((obj: any) => new TimeSpan(
                obj.id,
                obj.time_zone_id,
                obj.start,
                obj.end,
                obj.sun === 1,
                obj.mon === 1,
                obj.tue === 1,
                obj.wed === 1,
                obj.thu === 1,
                obj.fri === 1,
                obj.sat === 1,
                obj.hol1 === 1,
                obj.hol2 === 1,
                obj.hol3 === 1
            ));
        })
    }

    async getAcessLogs(user_id: number, start: number, end: number): Promise<Access[]> {
        return this.validate(async (api) => {
            const key = "access_logs"
            const { data } = await api.post(`/load_objects.fcgi?session=${this.session}`, {
                object: key,
                where: {
                    access_logs: {
                        user_id,
                        event: { ">=": 6, "<=": 7 },
                        time: { ">=": start, "<=": end }
                    },
                }
            })
            return data[key].map((obj: any) => new Access(obj.time, obj.event, obj.portal_id))
        })
    }

    async getUserGroups(user_id: number): Promise<{ user_id: number, group_id: number }[]> {
        return this.validate(async (api) => {
            const key = "user_groups"
            const { data } = await api.post(`/load_objects.fcgi?session=${this.session}`, {
                object: key,
                where: [
                    {
                        object: key,
                        field: "user_id",
                        operator: "=",
                        value: user_id
                    }
                ]
            })
            return data[key]
        })
    }

    async getGroup(id: number): Promise<Group> {
        return this.validate(async (api) => {
            const key = "groups"
            const { data } = await api.post(`/load_objects.fcgi?session=${this.session}`, {
                object: key,
                where: [
                    {
                        object: key,
                        field: "id",
                        operator: "=",
                        value: id
                    }
                ]
            })
            return data[key].map((obj: any) => new Group(obj.id, obj.name))[0]
        })
    }

    async getTest(id: number): Promise<Group> {
        return this.validate(async (api) => {
            const key = "identification_rules"
            const { data } = await api.post(`/load_objects.fcgi?session=${this.session}`, {
                object: key,
                where: [
                    {
                        object: key,
                        field: "id",
                        operator: "=",
                        value: id
                    }
                ]
            })
            return data[key].map((obj: any) => new Group(obj.id, obj.name))[0]
        })
    }
}