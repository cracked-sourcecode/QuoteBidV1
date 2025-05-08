import { Card, CardContent } from "@/components/ui/card";

export default function MediaMoves() {
  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-medium text-gray-800">Media Moves</h1>
      </div>

      <div className="bg-white shadow-sm rounded-md p-4 mb-6">
        <p className="text-gray-600">
          Stay updated on journalists' career moves, new beat assignments, and editorial changes across media outlets.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Recent Media Moves</h3>
              <span className="text-sm text-gray-500">Coming Soon</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              This feature is currently in development. Check back soon for updates on journalist moves and changes.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
