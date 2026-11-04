import { NotificationEventKey } from '../constants/notification.constants';
import { NotificationTemplateContext } from '../utils/notification-template.util';

export interface RecordAndDeliverInput {
  organizationId: string;
  recipientUserId: string;
  eventKey: NotificationEventKey;
  templateContext: NotificationTemplateContext;
  requestId?: string;
  metadata?: Record<string, unknown>;
}
