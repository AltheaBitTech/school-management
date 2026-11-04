import { Injectable } from '@nestjs/common';
import { DocumentType } from '@prisma/client';
import { NOTIFICATION_EVENT_KEYS } from '../notifications/constants/notification.constants';
import { NotificationsService } from '../notifications/notifications.service';

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  BONAFIDE_CERTIFICATE: 'Bonafide certificate',
  CHARACTER_CERTIFICATE: 'Character certificate',
  EXPERIENCE_LETTER: 'Experience letter',
  SALARY_CERTIFICATE: 'Salary certificate',
  VISITOR_PASS: 'Visitor pass',
  STUDENT_ID_CARD: 'Student ID card',
  STAFF_ID_CARD: 'Staff ID card',
};

@Injectable()
export class DocumentNotificationService {
  constructor(private readonly notificationsService: NotificationsService) {}

  async notifyGenerated(input: {
    organizationId: string;
    recipientUserId: string;
    documentId: string;
    documentType: DocumentType;
    ownerLabel: string;
  }): Promise<void> {
    await this.notificationsService.recordAndDeliver({
      organizationId: input.organizationId,
      recipientUserId: input.recipientUserId,
      eventKey: NOTIFICATION_EVENT_KEYS.DOCUMENT_GENERATED,
      templateContext: {
        kind: 'document',
        documentTypeLabel: DOCUMENT_TYPE_LABELS[input.documentType] ?? input.documentType,
        ownerLabel: input.ownerLabel.trim(),
      },
      metadata: { documentId: input.documentId, documentType: input.documentType },
    });
  }
}
