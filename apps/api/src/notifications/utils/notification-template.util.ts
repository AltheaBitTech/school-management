import { NotificationEventKey, NOTIFICATION_EVENT_KEYS } from '../constants/notification.constants';

export interface LeaveNotificationTemplateContext {
  staffName: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
}

export interface RenderedNotificationTemplate {
  eventKey: NotificationEventKey;
  title: string;
  body: string;
  html: string;
  emailSubject: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderLeaveNotificationTemplate(
  eventKey: NotificationEventKey,
  context: LeaveNotificationTemplateContext,
): RenderedNotificationTemplate {
  const staffName = context.staffName.trim();
  const leaveTypeName = context.leaveTypeName.trim();
  const startDate = context.startDate.trim();
  const endDate = context.endDate.trim();

  if (eventKey === NOTIFICATION_EVENT_KEYS.LEAVE_APPROVED) {
    const title = 'Leave request approved';
    const body = `Your ${leaveTypeName} request from ${startDate} to ${endDate} has been approved.`;
    return {
      eventKey,
      title,
      body,
      emailSubject: title,
      html: `<p>Hello ${escapeHtml(staffName)},</p><p>${escapeHtml(body)}</p>`,
    };
  }

  const title = 'Leave request rejected';
  const body = `Your ${leaveTypeName} request from ${startDate} to ${endDate} has been rejected.`;
  return {
    eventKey,
    title,
    body,
    emailSubject: title,
    html: `<p>Hello ${escapeHtml(staffName)},</p><p>${escapeHtml(body)}</p>`,
  };
}
