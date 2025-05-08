import { Card, CardContent } from "@/components/ui/card";

export default function EventsAwards() {
  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-medium text-gray-800">Events & Awards</h1>
      </div>

      <div className="bg-white shadow-sm rounded-md p-4 mb-6">
        <p className="text-gray-600">
          Browse upcoming industry events, conferences, and award opportunities. Submit entries and track important deadlines.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Upcoming Events</h3>
              <span className="text-sm text-gray-500">Coming Soon</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              This feature is currently in development. Check back soon for upcoming events and award opportunities.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
