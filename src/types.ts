export enum UserRole {
  MASTER_ADMIN = "Master Admin",
  ADMIN = "Admin",
  OWNER = "Owner",
  PARTNER = "Partner",
  MANAGER = "Manager",
  EMPLOYEE = "Employee"
}

export interface Employee {
  id?: string | number;
  firstName: string;
  lastName: string;
  email: string;
  designation: string;
  dateOfJoining: string;
  role: UserRole;
  department: string;
  reportingPartner: string;
  reportingManager: string;
  employeeCode?: string;
  status?: string;

  // Registration fields
  gender?: string;
  dateOfBirth?: string;
  pan?: string;
  aadhaar?: string;
  maritalStatus?: string;
  personalEmail?: string;
  personalMobile?: string;
  currentAddress?: string;
  pin?: string;
  permanentAddress?: string;
  guardian1Name?: string;
  guardian1Contact?: string;
  guardian1Address?: string;
  guardian2Name?: string;
  guardian2Contact?: string;
  guardian2Address?: string;
  panAttachment?: string;
  aadhaarAttachment?: string;
  educationalQualification?: string;
  employeePhoto?: string;
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    branchName: string;
  };
  chequeBookAttachment?: string;
}

export enum ProjectStatus {
  NOT_STARTED = "Not Started",
  IN_PROGRESS = "In Progress",
  ON_HOLD = "On Hold",
  COMPLETED = "Completed",
  CANCELLED = "Cancelled"
}

export enum JobStatus {
  OPEN = "Open",
  ASSIGNED = "Assigned",
  IN_PROGRESS = "In Progress",
  REVIEW = "Review",
  COMPLETED = "Completed",
  CANCELLED = "Cancelled"
}

export enum JobPriority {
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High",
  CRITICAL = "Critical"
}

export interface Client {
  id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  gstNumber?: string;
  panNumber?: string;
  createdAt?: string;
}

export interface Project {
  id?: string;
  clientId: string;
  clientName: string;
  name: string;
  description: string;
  managerId: string;
  managerName: string;
  startDate: string;
  endDate?: string;
  status: ProjectStatus;
  createdAt?: string;
}

export interface Job {
  id?: string;
  projectId: string;
  projectName: string;
  title: string;
  description: string;
  assigneeId: string;
  assigneeName: string;
  dueDate: string;
  status: JobStatus;
  priority: JobPriority;
  createdAt?: string;
}

export const DEPARTMENTS = [
  "Accounting",
  "Operations",
  "Internal Audit",
  "Automations",
  "Statutory Audit"
];
