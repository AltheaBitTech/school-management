import { buildStudentClassName } from '../../students/utils/student-class.util';

/**
 * Students keep denormalized class/section strings so fee, transport, parent and report
 * views keep working. These are always derived from the linked Section record.
 */
export function sectionDisplayFields(className: string, sectionName: string) {
  return {
    studentClass: className,
    section: sectionName,
    className: buildStudentClassName({ studentClass: className, section: sectionName }),
  };
}
