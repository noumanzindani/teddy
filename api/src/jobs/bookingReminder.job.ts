import { prisma } from '../lib/prisma';
import { sendEmail, createNotification } from '../services/notification.service';
import { logger } from '../lib/logger';

export async function processBookingReminder(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      client: { select: { id: true, email: true, firstName: true } },
      service: { select: { name: true } },
      vendor: { select: { businessName: true } },
    },
  });

  if (!booking || booking.status !== 'CONFIRMED') {
    logger.info(`[bookingReminder] Skipping ${bookingId} — status=${booking?.status}`);
    return;
  }

  const title = 'Appointment Tomorrow';
  const body = `Reminder: ${booking.service.name} at ${booking.vendor.businessName} is scheduled for tomorrow.`;

  // createNotification also sends the push (when the user allows booking pushes).
  await createNotification(booking.client.id, title, body, 'booking', `/bookings/${bookingId}`, { bookingId });
  await sendEmail(booking.client.email ?? '', title, 'booking-reminder', {
    firstName: booking.client.firstName,
    serviceName: booking.service.name,
    vendorName: booking.vendor.businessName,
    startsAt: booking.startsAt.toISOString(),
  });

  logger.info(`[bookingReminder] Sent reminder for bookingId=${bookingId}`);
}
