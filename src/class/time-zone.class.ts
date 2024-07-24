import { Device } from "./device.class";
import { TimeSpan } from "./time-span.class";

export class TimeZone {
    public time_spans: TimeSpan[] = []
    
    private constructor(
        private readonly device: Device,
        public readonly id: number,
        public readonly name: string,
    ) { }

    // Método estático para criar a instância e carregar os TimeSpans
    static async create(device: Device, id: number, name: string): Promise<TimeZone> {
        const timeZone = new TimeZone(device, id, name);
        await timeZone.loadTimeSpans();
        return timeZone;
    }

    // Método privado para carregar os TimeSpans
    private async loadTimeSpans() {
        try {
            this.time_spans = await this.device.getTimeSpans(this.id);
        } catch (error) {
            console.error(`Erro ao carregar TimeSpans para TimeZone ${this.id}:`, error);
            throw new Error(`Erro ao carregar TimeSpans para TimeZone ${this.id}`);
        }
    }

}