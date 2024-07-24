export class TimeSpan {
    constructor(
        private readonly id: number,
        private readonly time_zone_id: number,
        public readonly start: number,
        public readonly end: number,
        public readonly sun: boolean,
        public readonly mon: boolean,
        public readonly tue: boolean,
        public readonly wed: boolean,
        public readonly thu: boolean,
        public readonly fri: boolean,
        public readonly sat: boolean,
        public readonly hol1: boolean,
        public readonly hol2: boolean,
        public readonly hol3: boolean
    ) { }
}