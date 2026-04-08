import { SmartNotificationCommandEvent } from 'src/core/notifications/events/smart-notification-command.event';
import { NOTIFICATION_TYPE } from 'src/core/notifications/enums/notification-type.enum';

describe('SmartNotificationCommandEvent', () => {
  it('sanitizes title and body', () => {
    const event = new SmartNotificationCommandEvent({
      eventId: '6e57ce83-c965-4b4f-bc2b-3341f9409c6d',
      userId: '68a9c74f-53fb-45d7-b9f8-f8e1833737d8',
      title: '<b>Hello</b>\u0001 User',
      body: 'Body <script>alert(1)</script> content',
      type: NOTIFICATION_TYPE.MESSAGE,
      save: true,
      meta: { donationId: 'd1' },
    });

    expect(event.title).toBe('Hello User');
    expect(event.body).toBe('Body alert(1) content');
  });

  it('throws on invalid payload', () => {
    expect(
      () =>
        new SmartNotificationCommandEvent({
          eventId: 'not-a-uuid',
          userId: 'also-invalid',
          title: 'ok',
          body: 'ok',
          type: NOTIFICATION_TYPE.MESSAGE,
          save: true,
        } as any),
    ).toThrow('Invalid SmartNotificationCommandEvent payload');
  });
});
