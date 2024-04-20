import axios from "axios";
import { IAcesso, IUsuario } from "../types/interfaces";
import moment from "moment";

export default class Dispositivo {
    constructor(
        private ip: string,
        private user: string,
        private pass: string,
        private sessao?: string
    ) { }

    private api = axios.create({
        baseURL: `http://${this.ip}`
    })

    public async login() {
        try {
            const { data } = await this.api.post(`/login.fcgi`, {
                login: this.user,
                password: this.pass
            })
            this.sessao = data.session
        } catch (error) {
            const err = error as any
            if (err.response.data) throw err.response.data.error
            throw err
        }
    }

    private async validaSessao() {
        try {
            if (this.sessao) {
                const { data } = await this.api.post(`/session_is_valid.fcgi?session=${this.sessao}`)
                const validacao = data.session_is_valid as boolean
                !validacao && await this.login()
            } else {
                await this.login()
            }
        } catch (error) {
            throw error
        }
    }

    public async logout() {
        try {
            if (this.sessao) {
                await this.api.post(`/logout.fcgi?session=${this.sessao}`)
                this.sessao = undefined
            }
        } catch (error) {
            throw error
        }
    }

    public async obtemUsuarios() {
        try {
            await this.validaSessao()
            return await this.api.post(`/load_objects.fcgi?session=${this.sessao}`, {
                object: "users",
            }).then(({ data }) => data.users.map((user: any) => ({
                id: user.id,
                registration: user.registration,
                name: user.name,
                begin_time: "",
                end_time: ""
            }))) as IUsuario[]
        } catch (error) {
            throw error
        } finally {
            await this.logout()
        }
    }

    public async obtemHorarioDeTrabalho(usuario: IUsuario): Promise<IUsuario> {
        try {
            await this.validaSessao()
            const { data } = await axios.post(`http://${this.ip}/load_objects.fcgi?session=${this.sessao}`, {
                object: "c_users",
                where: {
                    c_users: { user_id: usuario.id }
                }
            })
            return {
                id: usuario.id,
                registration: usuario.registration,
                name: usuario.name,
                begin_time: data.c_users.length ? data.c_users[0]._Entrada54513 : "",
                end_time: data.c_users.length ? data.c_users[0]._Saida81449 : "",
            }
        } catch (error) {
            throw error
        } finally {
            await this.logout()
        }
    }

    public async obtemAcessos(usuario: IUsuario, inicio: moment.Moment, fim: moment.Moment): Promise<IAcesso[]> {
        try {
            await this.validaSessao()

            const { data } = await axios.post(`http://${this.ip}/load_objects.fcgi?session=${this.sessao}`, {
                object: "access_logs",
                where: {
                    access_logs: { user_id: usuario.id, event: 7, time: { ">=": inicio.unix(), "<=": fim.unix() } }
                }
            })

            return data.access_logs.map((dt: any) => ({
                id: dt.id,
                time: moment.unix(dt.time).add(3, "hour").toDate(),
                event: dt.event,
                portal_id: dt.portal_id,
            }))
        } catch (error) {
            throw error
        } finally {
            await this.logout()
        }
    }

}