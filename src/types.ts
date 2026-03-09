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

export const DEPARTMENTS = [
  "Accounting",
  "Operations",
  "Internal Audit",
  "Automations",
  "Statutory Audit"
];
