import type { UUID, ISODateString } from './common';

export interface Employee {
    id: UUID;
    full_name: string;
    email: string;
    phone: string;
    position: string;
    branch_id: UUID;
    hire_date: ISODateString;
    salary_type: string; // 'monthly' | 'biweekly' | 'daily' | 'hourly'
    base_salary: number;
    active: boolean;

    // Relations
    branches?: { name: string };

    created_at?: ISODateString;
    updated_at?: ISODateString;
}
