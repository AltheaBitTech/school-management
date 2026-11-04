import {
  generateBonafidePdf,
  generateCharacterCertificatePdf,
  generateExperienceLetterPdf,
  generateSalaryCertificatePdf,
  generateVisitorPassPdf,
} from './pdf-generator.service';

describe('pdf-generator.service', () => {
  const common = {
    organization: { name: 'Green Valley School', city: 'Pune' },
    generatedDate: '29 September 2026',
    documentId: 'AB12CD34',
  };

  it('generates a non-empty bonafide PDF buffer', async () => {
    const buffer = await generateBonafidePdf({
      ...common,
      student: {
        name: 'Anita Desai',
        admissionNumber: 'ADM-001',
        class: 'Grade 8',
        section: 'A',
        academicYear: '2026-2027',
      },
      purpose: 'scholarship application',
    });

    expect(buffer.length).toBeGreaterThan(500);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('generates a non-empty character certificate PDF buffer', async () => {
    const buffer = await generateCharacterCertificatePdf({
      ...common,
      student: { name: 'Test Student', admissionNumber: 'ADM-002', conduct: 'Excellent' },
    });
    expect(buffer.length).toBeGreaterThan(500);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('generates a non-empty experience letter PDF buffer', async () => {
    const buffer = await generateExperienceLetterPdf({
      ...common,
      staff: {
        name: 'Test Staff',
        designation: 'Teacher',
        department: 'Science',
        joiningDate: '01 Apr 2022',
        employeeCode: 'emp-001',
      },
    });
    expect(buffer.length).toBeGreaterThan(500);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('generates a non-empty salary certificate PDF buffer', async () => {
    const buffer = await generateSalaryCertificatePdf({
      ...common,
      staff: {
        name: 'Test Staff',
        designation: 'Teacher',
        department: 'Science',
        employeeCode: 'emp-001',
        monthlySalary: '₹45,000',
        salaryMonth: 'September 2026',
      },
    });
    expect(buffer.length).toBeGreaterThan(500);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('generates a non-empty visitor pass PDF buffer', async () => {
    const buffer = await generateVisitorPassPdf({
      ...common,
      visitor: {
        name: 'Guest Parent',
        mobile: '+919876543210',
        purpose: 'PTM',
        host: 'Rajesh Kumar',
        checkInTime: '29 Sep 2026, 10:00 am',
        validUntil: '29 Sep 2026, 06:00 pm',
        visitorId: 'VIS-001',
      },
    });

    expect(buffer.length).toBeGreaterThan(500);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});
