import { OrgData, Employee, DepartmentGroup } from "./types";

/** Find every employee in the org data */
export function allEmployees(data: OrgData): Employee[] {
  const list: Employee[] = [];
  if (data.director) list.push(data.director);
  list.push(...data.managers);
  for (const d of data.departments) list.push(...d.staff);
  return list;
}

/** Recompute totals */
function recompute(data: OrgData): OrgData {
  const emps = allEmployees(data).filter((e) => !e.vacant);
  return {
    ...data,
    totalEmployees: emps.length,
    totalAnnualPayroll: emps.reduce((s, e) => s + (e.annualSalary || 0), 0),
  };
}

/** Update an employee in-place (matched by old name) and return new OrgData */
export function updateEmployee(
  data: OrgData,
  oldName: string,
  updated: Employee
): OrgData {
  const next = structuredClone(data);
  if (next.director && next.director.name === oldName) {
    next.director = updated;
  }
  next.managers = next.managers.map((m) =>
    m.name === oldName ? updated : m
  );
  for (const dept of next.departments) {
    dept.staff = dept.staff.map((s) =>
      s.name === oldName ? updated : s
    );
    if (dept.manager && dept.manager.name === oldName) {
      dept.manager = updated;
    }
  }

  // If department changed, move the employee
  if (updated.department && updated.level === 2) {
    // Remove from old department staff
    for (const dept of next.departments) {
      dept.staff = dept.staff.filter(
        (s) => s.name !== updated.name || dept.name === updated.department
      );
    }
    // Add to new department if not already there
    const target = next.departments.find((d) => d.name === updated.department);
    if (target && !target.staff.find((s) => s.name === updated.name)) {
      target.staff.push(updated);
    }
  }

  return recompute(next);
}

/** Delete an employee by name */
export function deleteEmployee(data: OrgData, name: string): OrgData {
  const next = structuredClone(data);
  if (next.director && next.director.name === name) {
    next.director = null;
  }
  next.managers = next.managers.filter((m) => m.name !== name);
  for (const dept of next.departments) {
    dept.staff = dept.staff.filter((s) => s.name !== name);
    if (dept.manager && dept.manager.name === name) {
      dept.manager = undefined;
    }
  }
  return recompute(next);
}

/** Add an employee to a specific location */
export function addEmployee(
  data: OrgData,
  emp: Employee,
  target: { level: number; department?: string }
): OrgData {
  const next = structuredClone(data);
  if (target.level === 0) {
    next.director = emp;
  } else if (target.level === 1) {
    next.managers.push(emp);
  } else if (target.department) {
    const dept = next.departments.find((d) => d.name === target.department);
    if (dept) {
      dept.staff.push(emp);
    }
  }
  return recompute(next);
}

/** Add a new department */
export function addDepartment(
  data: OrgData,
  name: string,
  color: string
): OrgData {
  const next = structuredClone(data);
  next.departments.push({ name, color, staff: [] });
  return next;
}

/** Delete a department, optionally moving staff to another dept */
export function deleteDepartment(
  data: OrgData,
  deptName: string,
  moveStaffTo?: string
): OrgData {
  const next = structuredClone(data);
  const dept = next.departments.find((d) => d.name === deptName);
  if (!dept) return next;

  if (moveStaffTo) {
    const target = next.departments.find((d) => d.name === moveStaffTo);
    if (target) {
      for (const s of dept.staff) {
        s.department = moveStaffTo;
        target.staff.push(s);
      }
    }
  }

  next.departments = next.departments.filter((d) => d.name !== deptName);
  return recompute(next);
}

/** Rename a department */
export function renameDepartment(
  data: OrgData,
  oldName: string,
  newName: string
): OrgData {
  const next = structuredClone(data);
  for (const dept of next.departments) {
    if (dept.name === oldName) {
      dept.name = newName;
      for (const s of dept.staff) s.department = newName;
    }
  }
  return next;
}
