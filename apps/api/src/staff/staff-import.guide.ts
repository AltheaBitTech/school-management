import { ImportGuideSection } from '../common/utils/import-guide-pdf.util';

export const STAFF_IMPORT_COLUMNS = [
  'firstName',
  'lastName',
  'email',
  'employeeCode',
  'designation',
  'departmentCode',
  'joiningDate',
  'phone',
  'roleCode',
] as const;

export const STAFF_IMPORT_SAMPLE_CSV = [
  STAFF_IMPORT_COLUMNS.join(','),
  'Asha,Menon,asha.menon.sample@example.com,emp-sample-01,Class teacher,,2024-06-01,9876543210,TEACHER',
  'Ravi,Iyer,ravi.iyer.sample@example.com,emp-sample-02,Accountant,,2024-07-15,9876543211,ACCOUNTANT',
].join('\n');

export const STAFF_CSV_ROLE_CODES = [
  'TEACHER',
  'PRINCIPAL',
  'RECEPTIONIST',
  'ACCOUNTANT',
  'MAINTENANCE_STAFF',
  'STAFF',
  'SCHOOL_ADMIN',
  'PARENT',
] as const;

export const STAFF_IMPORT_GUIDE: { title: string; introduction: string; sections: ImportGuideSection[] } = {
  title: 'CampusOps staff CSV import guide',
  introduction:
    'This PDF explains how to prepare a staff CSV. It is not an import file. Save your spreadsheet as CSV and upload that CSV. Do not upload this PDF.',
  sections: [
    {
      heading: 'How to prepare the file',
      paragraphs: [
        'Download the sample CSV from the Staff page. Open it in a spreadsheet, replace the sample people with your staff, and save it again as CSV.',
        'Keep the header row exactly as it is. Optional cells may be blank. Do not rename columns and do not add columns that are not in the sample.',
        'The sample leaves departmentCode blank so it can be imported before you create departments. When you use a department, type a code that already exists in your institution.',
      ],
    },
    {
      heading: 'Required columns',
      paragraphs: [
        'firstName: the person’s given name.',
        'lastName: the person’s family name.',
        'email: the work email. This becomes the login email. It must be a valid email address and must not already be registered in CampusOps.',
        'employeeCode: 2 to 32 lowercase letters, numbers, or hyphens, such as emp-001. Codes are stored in lowercase.',
      ],
    },
    {
      heading: 'Optional columns',
      paragraphs: [
        'designation: the job title, such as Class teacher. This is not the system role. Maximum 120 characters.',
        'departmentCode: the code of a department that already exists in this institution. Matching ignores letter case. An unknown code is not created for you. Inactive departments are rejected. Leave the cell blank when there is no department.',
        'joiningDate: the joining date.',
        'phone: digits, spaces, plus signs, hyphens, or parentheses. Maximum 20 characters.',
        'roleCode: the system role for the login. Leave it blank to use TEACHER.',
      ],
    },
    {
      heading: 'Dates, departments, and roles',
      paragraphs: [
        'Dates must be YYYY-MM-DD, for example 2024-06-01. Other date formats are rejected.',
        `roleCode must be one of: ${STAFF_CSV_ROLE_CODES.join(', ')}. STUDENT and platform roles are rejected. The role must already exist for your institution.`,
        'The CSV has no employment-status column. Imported staff are created as Active and receive a login invite for the email in the row.',
        'Job title and system role are different. designation is the job title. roleCode is the access role.',
      ],
    },
    {
      heading: 'Duplicates and existing accounts',
      paragraphs: [
        'An employee code must be unique in the institution and in the file. The first valid use of a code is imported. Later rows with that code are duplicates and are not saved.',
        'An email must be unique in the file and across CampusOps. A matching email does not update an existing person and does not create a second staff profile or user.',
        'The error report does not include invite links. Copy an invite from the import result on screen if you need to share it.',
      ],
    },
    {
      heading: 'What the import does with errors',
      paragraphs: [
        'Check the file before saving. The preview lists every row and names the column that failed.',
        'When you confirm, only valid rows are saved. Invalid and duplicate rows stay out and are listed with a reason. Correct the CSV and check it again.',
        'If a row is imported and then appears in another file, it is reported as a duplicate instead of creating another profile.',
        'If a profile is saved but the login invite cannot be sent, that row is listed as failed. Importing the same person again does not create a second profile.',
      ],
    },
  ],
};
