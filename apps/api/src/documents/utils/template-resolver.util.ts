import { BadRequestException } from '@nestjs/common';
import { Organization, Student } from '@prisma/client';
import {
  ALLOWED_TEMPLATE_VARIABLES,
  DOCUMENT_ERROR_CODES,
} from '../constants/document.constants';
import { getStudentDisplayName } from '../../students/utils/student-display.util';

export interface ParsedDocumentTemplate {
  title: string;
  body: string;
}

export interface TemplateResolutionContext {
  student: Student;
  organization: Organization;
  generatedAt: Date;
}

export function parseDocumentTemplateContent(content: string): ParsedDocumentTemplate {
  try {
    const parsed = JSON.parse(content) as { title?: unknown; body?: unknown };

    if (typeof parsed.title !== 'string' || typeof parsed.body !== 'string') {
      throw new Error('Invalid template shape');
    }

    return {
      title: parsed.title.trim(),
      body: parsed.body.trim(),
    };
  } catch {
    throw new BadRequestException({
      code: DOCUMENT_ERROR_CODES.INVALID_TEMPLATE_CONTENT,
      message: 'Document template content is invalid',
    });
  }
}

export function resolveTemplateText(
  template: ParsedDocumentTemplate,
  context: TemplateResolutionContext,
): ParsedDocumentTemplate {
  const variables = buildTemplateVariables(context);

  return {
    title: replaceAllowedVariables(template.title, variables),
    body: replaceAllowedVariables(template.body, variables),
  };
}

function buildTemplateVariables(context: TemplateResolutionContext): Record<string, string> {
  const studentName = getStudentDisplayName(context.student);
  const className = context.student.className?.trim() ?? '';
  const classLine = className ? ` in class ${className}` : '';

  return {
    'student.name': studentName,
    'student.admissionNumber': context.student.studentCode,
    'student.class': className || 'N/A',
    'student.classLine': classLine,
    'organization.name': context.organization.name,
    'organization.code': context.organization.code,
    'generated.date': context.generatedAt.toISOString().slice(0, 10),
  };
}

export function renderStoredTemplate(
  content: string,
  variables: Record<string, string>,
): { title: string; body: string } | null {
  try {
    const parsed = parseDocumentTemplateContent(content);
    return {
      title: replaceAllowedVariables(parsed.title, variables),
      body: replaceAllowedVariables(parsed.body, variables),
    };
  } catch {
    return null;
  }
}

export function findUnknownPlaceholders(text: string): string[] {
  const unknown = new Set<string>();
  for (const match of text.matchAll(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g)) {
    const name = match[1] ?? '';
    if (!(ALLOWED_TEMPLATE_VARIABLES as readonly string[]).includes(name)) {
      unknown.add(name);
    }
  }
  return [...unknown];
}

function replaceAllowedVariables(
  input: string,
  variables: Record<string, string>,
): string {
  return input.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, variableName: string) => {
    if (!(ALLOWED_TEMPLATE_VARIABLES as readonly string[]).includes(variableName)) {
      return match;
    }

    return variables[variableName] ?? '';
  });
}
