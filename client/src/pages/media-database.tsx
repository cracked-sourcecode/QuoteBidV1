import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Publication } from "@shared/schema";

export default function MediaDatabase() {
  const { data: publications, isLoading } = useQuery({
    queryKey: ["/api/publications"],
  });

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-medium text-gray-800">Media Database</h1>
      </div>

      <div className="bg-white shadow-sm rounded-md p-4 mb-6">
        <p className="text-gray-600">
          Access contact information for journalists, bloggers, and media outlets. Build targeted media lists for your PR campaigns.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="bg-white shadow-sm rounded-md h-32 animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {publications?.map((publication: Publication) => (
            <Card key={publication.id}>
              <CardContent className="p-4">
                <div className="flex items-center mb-3">
                  <img src={publication.logo} alt={publication.name} className="h-8 mr-3" />
                  <h3 className="font-medium text-gray-900">{publication.name}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Category: {publication.category}
                </p>
                {publication.website && (
                  <a 
                    href={publication.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-qpurple hover:underline"
                  >
                    Visit Website
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
