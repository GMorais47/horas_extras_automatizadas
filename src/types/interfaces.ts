import moment from "moment";

export interface IUsuario {
    id: number;
    registration: string;
    name: string;
    begin_time: string
    end_time: string
}

export interface IAcesso {
    id: number,
    time: Date,
    event: number,
    portal_id: number,
}

export interface IUsuario_Acessos {
    usuario: IUsuario,
    acessos: IAcesso[]
}

export interface IHorasExtras {
    inicio: moment.Moment,
    fim: moment.Moment,
    tolerancia: number,
    usuarios: {
        nome: string,
        horario: {
            entrada_normal: string,
            saida_normal: string,
            entrada_tolerancia: string,
            saida_tolerancia: string,
        },
        duracao_total: number,
        dias: number[],
        acessos: {
            dia: moment.Moment,
            entrada: moment.Moment,
            saida: moment.Moment,
            duracao: number
        }[]
    }[]
}

interface IData {
    inicio: string,
    fim: string,
    tolerancia: string,
    preco: string,
}

export interface IDataIndividual extends IData {
    data: IDataRelIndividual[]
}

export interface IDataGeral extends IData {
    duracao_total: number,
    valor_total: number
    data: IDataRelGeral[]
}

export interface IDataRelGeral {
    usuario: {
        nome: string,
        horario: {
            entrada: string,
            saida: string
        }
    },
    dias: number[],
    duracao_total: number,
    valor_total: number
}

export interface IDataRelIndividual {
    usuario: {
        nome: string,
        horario: {
            entrada: string,
            saida: string
        }
    },
    consulta: {
        inicio: string,
        fim: string,
        tolerancia: string,
        preco: string,
        horario: {
            entrada: string,
            saida: string
        }
        duracao_total: string,
        valor_total: string,
        registros: {
            data: string,
            entrada: string,
            saida: string,
            duracao: number,
            total: number
        }[][]
    }
}