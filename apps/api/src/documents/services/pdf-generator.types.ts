export interface CommonDocumentData {
  organization: { name: string; city?: string; phone?: string; email?: string };
  generatedDate: string;
  documentId: string;
  logo?: Buffer;
  heading?: string;
  body?: string;
  /** Institution-specific label for the academic unit (Class / Program / Course). */
  unitLabel?: string;
}

export interface IdCardData extends CommonDocumentData {
  kind: 'student' | 'staff';
  person: {
    name: string;
    code: string;
    line2?: string;
    line3?: string;
  };
  photo?: Buffer;
  layout?: {
    showPhoto: boolean;
    showCode: boolean;
    footerLine?: string;
  };
}

export interface BonafideData extends CommonDocumentData {
  student: {
    name: string;
    admissionNumber: string;
    class?: string;
    section?: string;
    academicYear?: string;
  };
  purpose?: string;
}

export interface CharacterData extends CommonDocumentData {
  student: {
    name: string;
    admissionNumber: string;
    class?: string;
    conduct: string;
    attendancePercentage?: string;
  };
  purpose?: string;
}

export interface ExperienceData extends CommonDocumentData {
  staff: {
    name: string;
    designation: string;
    department: string;
    joiningDate: string;
    leavingDate?: string;
    employeeCode: string;
  };
  relievingReason?: string;
}

export interface SalaryData extends CommonDocumentData {
  staff: {
    name: string;
    designation: string;
    department: string;
    employeeCode: string;
    monthlySalary: string;
    salaryMonth: string;
  };
  purpose?: string;
}

export interface VisitorPassData extends CommonDocumentData {
  visitor: {
    name: string;
    mobile: string;
    organization?: string;
    purpose: string;
    host: string;
    checkInTime: string;
    validUntil: string;
    visitorId: string;
  };
}
