export interface Employee {
  name: string;
  startDate: string;
  position: string;
  visaStatus: string;
  payFrequency: string;
  hourlyRate: number;
  annualSalary: number;
  monthlySalary: number;
  department: string;
  level: number; // 0=Director, 1=Manager, 2=Staff, 1.5=between
  vacant?: boolean;
  independent?: boolean;
  reportsTo?: string;
  subordinates?: string[];
}

export interface DepartmentGroup {
  name: string;
  color: string;
  manager?: Employee;
  staff: Employee[];
}

export interface OrgData {
  companyName: string;
  asAtDate: string;
  director: Employee | null;
  managers: Employee[];
  departments: DepartmentGroup[];
  totalEmployees: number;
  totalAnnualPayroll: number;
}

export const DEPT_COLORS: Record<string, string> = {
  AKL: "#DC2626",
  CHC: "#D97706",
  Forwarding: "#059669",
  Management: "#2563EB",
};

export const DIRECTOR_COLOR = "#1E3A5F";
export const MANAGER_COLOR = "#2563EB";
