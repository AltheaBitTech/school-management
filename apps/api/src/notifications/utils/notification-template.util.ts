import { NotificationEventKey, NOTIFICATION_EVENT_KEYS } from '../constants/notification.constants';
import { paragraph, renderEmailLayout } from '../email-templates/email-layout';

export interface LeaveNotificationTemplateContext {
  kind: 'leave';
  staffName: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
}

export interface VisitorNotificationTemplateContext {
  kind: 'visitor';
  hostName: string;
  visitorName: string;
  visitorCode: string;
  purpose: string;
  checkInAt: string;
}

export interface ComplaintNotificationTemplateContext {
  kind: 'complaint';
  complaintCode: string;
  title: string;
  status: string;
  assigneeName?: string;
}

export interface NoticeNotificationTemplateContext {
  kind: 'notice';
  noticeTitle: string;
}

export interface DocumentNotificationTemplateContext {
  kind: 'document';
  documentTypeLabel: string;
  ownerLabel: string;
}

export type NotificationTemplateContext =
  | LeaveNotificationTemplateContext
  | VisitorNotificationTemplateContext
  | ComplaintNotificationTemplateContext
  | NoticeNotificationTemplateContext
  | DocumentNotificationTemplateContext;

export interface RenderedNotificationTemplate {
  eventKey: NotificationEventKey;
  title: string;
  body: string;
  html: string;
  emailSubject: string;
}

function brandedHtml(title: string, body: string, greeting?: string): string {
  return renderEmailLayout({
    preheader: title,
    heading: title,
    bodyHtml: `${greeting ? paragraph(greeting) : ''}${paragraph(body)}`,
  });
}

export function renderNotificationTemplate(
  eventKey: NotificationEventKey,
  context: NotificationTemplateContext,
): RenderedNotificationTemplate {
  if (context.kind === 'visitor' || eventKey === NOTIFICATION_EVENT_KEYS.VISITOR_CHECKED_IN) {
    const visitorContext = context as VisitorNotificationTemplateContext;
    const title = 'Visitor checked in';
    const body = `${visitorContext.visitorName} (${visitorContext.visitorCode}) checked in to meet you. Purpose: ${visitorContext.purpose}. Time: ${visitorContext.checkInAt}.`;
    return {
      eventKey: NOTIFICATION_EVENT_KEYS.VISITOR_CHECKED_IN,
      title,
      body,
      emailSubject: title,
      html: brandedHtml(title, body, `Hello ${visitorContext.hostName},`),
    };
  }

  if (context.kind === 'complaint') {
    const complaintContext = context as ComplaintNotificationTemplateContext;
    if (eventKey === NOTIFICATION_EVENT_KEYS.COMPLAINT_ASSIGNED) {
      const title = 'Complaint assigned to you';
      const body = `${complaintContext.complaintCode}: ${complaintContext.title} has been assigned to you.`;
      return {
        eventKey,
        title,
        body,
        emailSubject: title,
        html: brandedHtml(title, body),
      };
    }
    const title = 'Complaint status updated';
    const body = `${complaintContext.complaintCode}: ${complaintContext.title} is now ${complaintContext.status}.`;
    return {
      eventKey: NOTIFICATION_EVENT_KEYS.COMPLAINT_STATUS_CHANGED,
      title,
      body,
      emailSubject: title,
      html: brandedHtml(title, body),
    };
  }

  if (context.kind === 'notice') {
    const noticeContext = context as NoticeNotificationTemplateContext;
    const title = 'New notice published';
    const body = `A new notice was published: ${noticeContext.noticeTitle}`;
    return {
      eventKey: NOTIFICATION_EVENT_KEYS.NOTICE_PUBLISHED,
      title,
      body,
      emailSubject: title,
      html: brandedHtml(title, body),
    };
  }

  if (context.kind === 'document') {
    const documentContext = context as DocumentNotificationTemplateContext;
    const title = 'Document generated';
    const body = `${documentContext.documentTypeLabel} generated for ${documentContext.ownerLabel}.`;
    return {
      eventKey: NOTIFICATION_EVENT_KEYS.DOCUMENT_GENERATED,
      title,
      body,
      emailSubject: title,
      html: brandedHtml(title, body),
    };
  }

  const leaveContext = context as LeaveNotificationTemplateContext;
  const staffName = leaveContext.staffName.trim();
  const leaveTypeName = leaveContext.leaveTypeName.trim();
  const startDate = leaveContext.startDate.trim();
  const endDate = leaveContext.endDate.trim();

  if (eventKey === NOTIFICATION_EVENT_KEYS.LEAVE_APPROVED) {
    const title = 'Leave request approved';
    const body = `Your ${leaveTypeName} request from ${startDate} to ${endDate} has been approved.`;
    return {
      eventKey,
      title,
      body,
      emailSubject: title,
      html: brandedHtml(title, body, staffName ? `Hello ${staffName},` : undefined),
    };
  }

  const title = 'Leave request rejected';
  const body = `Your ${leaveTypeName} request from ${startDate} to ${endDate} has been rejected.`;
  return {
    eventKey: NOTIFICATION_EVENT_KEYS.LEAVE_REJECTED,
    title,
    body,
    emailSubject: title,
    html: brandedHtml(title, body, staffName ? `Hello ${staffName},` : undefined),
  };
}

/** @deprecated Use renderNotificationTemplate */
export function renderLeaveNotificationTemplate(
  eventKey: NotificationEventKey,
  context: Omit<LeaveNotificationTemplateContext, 'kind'>,
): RenderedNotificationTemplate {
  return renderNotificationTemplate(eventKey, { kind: 'leave', ...context });
}
