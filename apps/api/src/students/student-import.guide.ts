import { ImportGuideSection } from '../common/utils/import-guide-pdf.util';

export const STUDENT_IMPORT_COLUMNS = [
  'studentCode',
  'firstName',
  'lastName',
  'displayName',
  'studentClass',
  'section',
  'rollNumber',
  'guardianName',
  'guardianPhone',
  'academicYear',
  'dateOfBirth',
] as const;

export const STUDENT_IMPORT_SAMPLE_CSV = [
  STUDENT_IMPORT_COLUMNS.join(','),
  'stu-2026-001,Riya,Patel,Riya Patel,Grade 8,A,12,Raj Patel,9876543210,2025-2026,2012-05-10',
  'stu-2026-002,Arjun,Mehta,,Grade 8,A,13,Neha Mehta,9876543211,2025-2026,2012-08-21',
].join('\n');

export const STUDENT_IMPORT_GUIDE: { title: string; introduction: string; sections: ImportGuideSection[] } = {
  title: 'CampusOps student CSV import guide',
  introduction:
    'This PDF explains how to prepare a student CSV. It is not an import file. Save your spreadsheet as CSV and upload that CSV. Do not upload this PDF.',
  sections: [
    {
      heading: 'How to prepare the file',
      paragraphs: [
        'Download the sample CSV from the Students page. Open it in a spreadsheet, replace the sample rows with your students, and save it again as CSV.',
        'Keep the header row exactly as it is. You may leave date of birth and display name blank, but class, section, roll number, academic year, guardian name, and guardian phone are required. Do not rename or remove the header names. Do not add extra columns.',
        'The sample file can be imported as it is. Importing it a second time reports those student codes as duplicates and does not create a second profile.',
      ],
    },
    {
      heading: 'Required columns',
      paragraphs: [
        'studentCode: the admission code for this school. Use 2 to 32 letters, numbers, or hyphens. Codes are stored in lowercase, so STU-2026-001 and stu-2026-001 are the same code.',
        'firstName: the student’s given name.',
        'lastName: the student’s family name.',
        'studentClass: the class label, such as Grade 8. Maximum 20 characters.',
        'section: the section label, such as A. Maximum 10 characters.',
        'rollNumber: 1 to 10 letters, numbers, or hyphens, such as 14.',
        'academicYear: two consecutive years, such as 2025-2026. A single year such as 2025 is rejected.',
        'guardianName: the guardian’s name. Maximum 120 characters.',
        'guardianPhone: a 10-digit Indian mobile number. An optional +91 prefix is allowed.',
      ],
    },
    {
      heading: 'Optional columns',
      paragraphs: [
        'displayName: the name to show in CampusOps. Leave blank to use first and last name.',
        'dateOfBirth: the date of birth.',
      ],
    },
    {
      heading: 'Dates, class, section, and academic year',
      paragraphs: [
        'Dates must be YYYY-MM-DD, for example 2012-05-10. Dates such as 10/05/2012 or 10-05-2012 are rejected. A date of birth cannot be in the future.',
        'CampusOps does not keep a separate class or section list. studentClass and section are stored exactly as typed after spaces are trimmed. Grade 8 and grade 8 are different values. Use one spelling for every student in that class.',
        'Academic year must be two consecutive years written as 2025-2026. Use the same year for students in the same class.',
        'The CSV has no status column. Every imported student is created as Active.',
      ],
    },
    {
      heading: 'Guardians and existing accounts',
      paragraphs: [
        'guardianName and guardianPhone are stored on the student. They do not create a parent login, and they are not matched to an existing parent account.',
        'After the import, open the student and use Link a parent to connect an account that already has the Parent role.',
      ],
    },
    {
      heading: 'Duplicates',
      paragraphs: [
        'A student code must be unique in the school and in the file. The first row that uses a code is imported when that row is valid. Later rows with the same code are duplicates and are not saved.',
        'An existing student is not updated. Import does not create a second profile for a code that is already in the school.',
      ],
    },
    {
      heading: 'What the import does with errors',
      paragraphs: [
        'Check the file before saving. The preview shows every row, the rows that can be saved, and the rows that cannot, with the column name and the reason.',
        'When you confirm, only valid rows are saved. Invalid and duplicate rows are not saved and are not skipped silently. Download the error report, correct those rows, and check the file again.',
        'Rows that were already imported are reported as duplicates if they appear in a later file.',
      ],
    },
  ],
};
