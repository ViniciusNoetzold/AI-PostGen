import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    totalContacts: 1250,
    totalInteractions: 345,
    activeLeads: 42,
    conversionRate: 15.4,
    statusCounts: [
      { name: 'New', value: 400 },
      { name: 'Contacted', value: 300 },
      { name: 'Qualified', value: 200 },
      { name: 'Converted', value: 100 },
    ],
    upcomingReminders: [
      {
        id: '1',
        message: 'Follow up on proposal',
        date: new Date().toISOString(),
        contact: { name: 'Alice Smith' },
      },
      {
        id: '2',
        message: 'Send product catalog',
        date: new Date(Date.now() + 86400000).toISOString(),
        contact: { name: 'Bob Johnson' },
      },
    ],
  });
}
