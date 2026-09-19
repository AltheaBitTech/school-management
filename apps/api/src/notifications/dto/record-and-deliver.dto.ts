import { NotificationEventKey } from '../constants/notification.constants';
import { LeaveNotificationTemplateContext } from '../utils/notification-template.util';

export interface RecordAndDeliverInput {
  organizationId: string;
  recipientUserId: string;
  eventKey: NotificationEventKey;
  templateContext: LeaveNotificationTemplateContext;
  requestId?: string;
  metadata?: Record<string, unknown>;
}
