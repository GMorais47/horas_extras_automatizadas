import config from "../../config.json";
import { User } from "./user.class";

export class OvertimeCalculation {
    public readonly total: number;

    constructor(
        public readonly type: "entry" | "exit",
        public readonly entry: Date | null,
        public readonly exit: Date | null,
        public readonly duration: number,
        public readonly observation?: string
    ) {
        this.total = duration * (config.PRICE_PER_HOUR / 3600);
    }
}

export class Calculation {
    public readonly price_per_hour: number;
    public readonly total: number;
    public readonly company: {
        company_name: string,
        cnpj: string,
        address: string,
        phone: string
    };

    constructor(
        public readonly user: User,
        public readonly duration: number,
        public readonly overtime: OvertimeCalculation[],
        public readonly start: Date,
        public readonly end: Date
    ) {
        this.price_per_hour = config.PRICE_PER_HOUR;
        this.total = duration * (this.price_per_hour / 3600);
        this.company = {
            company_name: config.COMPANY.COMPANY_NAME,
            cnpj: config.COMPANY.CNPJ,
            address: config.COMPANY.ADDRESS,
            phone: config.COMPANY.PHONE
        };
    }
}

export class CalculationGeneral {
    public readonly data: {
        name: string,
        duration: number,
        total: number,
        observation: string
    }[];

    public readonly duration: number;
    public readonly total: number;
    public readonly price_per_hour: number;
    public readonly company: {
        company_name: string,
        cnpj: string,
        address: string,
        phone: string
    };

    constructor(
        public readonly start: Date,
        public readonly end: Date,
        private readonly calculations: Calculation[],
        private readonly users_removed_by_number_of_overtime_accesses: User[],
        private readonly users_removed_due_to_lack_of_schedule: User[],
        private readonly users_removed_due_to_lack_of_time_spans: User[]
    ) {
        this.price_per_hour = config.PRICE_PER_HOUR;

        this.data = [
            ...this.calculations.map(cal => ({
                name: cal.user.name,
                duration: cal.duration,
                total: cal.total,
                observation: " - "
            })),
            ...this.users_removed_by_number_of_overtime_accesses.map(user => ({
                name: user.name,
                duration: 0,
                total: 0,
                observation: "Nenhum acesso extra encontrado"
            })),
            ...this.users_removed_due_to_lack_of_schedule.map(user => ({
                name: user.name,
                duration: 0,
                total: 0,
                observation: "Nenhum horário encontrado"
            })),
            ...this.users_removed_due_to_lack_of_time_spans.map(user => ({
                name: user.name,
                duration: 0,
                total: 0,
                observation: "Nenhuma faixa de tempo encontrada"
            }))
        ].sort((a, b) => a.name.localeCompare(b.name))

        this.duration = this.data.reduce((prv, curr) => prv + curr.duration, 0);
        this.total = this.data.reduce((prv, curr) => prv + curr.total, 0);

        this.company = {
            company_name: config.COMPANY.COMPANY_NAME,
            cnpj: config.COMPANY.CNPJ,
            address: config.COMPANY.ADDRESS,
            phone: config.COMPANY.PHONE
        };
    }
}
