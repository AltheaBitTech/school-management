import { NOTIFICATION_EVENT_KEYS } from '../constants/notification.constants';
import { renderNotificationTemplate } from './notification-template.util';

describe('renderNotificationTemplate', () => {
  it('renders complaint assigned template', () => {
    const result = renderNotificationTemplate(NOTIFICATION_EVENT_KEYS.COMPLAINT_ASSIGNED, {
      kind: 'complaint',
      complaintCode: 'CMP-000001',
      title: 'Broken projector',
      status: 'ASSIGNED',
    });
    expect(result.title).toBe('Complaint assigned to you');
    expect(result.body).toContain('CMP-000001');
  });

  it('renders notice published template', () => {
    const result = renderNotificationTemplate(NOTIFICATION_EVENT_KEYS.NOTICE_PUBLISHED, {
      kind: 'notice',
      noticeTitle: 'Holiday schedule',
    });
    expect(result.title).toBe('New notice published');
    expect(result.body).toContain('Holiday schedule');
  });

  it('renders document generated template', () => {
    const result = renderNotificationTemplate(NOTIFICATION_EVENT_KEYS.DOCUMENT_GENERATED, {
      kind: 'document',
      documentTypeLabel: 'Bonafide certificate',
      ownerLabel: 'STU-001',
    });
    expect(result.title).toBe('Document generated');
    expect(result.body).toContain('Bonafide certificate');
  });
});
