import { ReminderForm } from '../components/ReminderForm';

export function EditReminderScreen() {
  return (
    <ReminderForm
      title="Edit Reminder"
      defaultValues={{
        title: 'Drink Water',
        repeat: 'daily',
        leadTime: '15min',
        entryType: 'task',
      }}
    />
  );
}
