import { Pitch } from "@shared/schema";

// Sample pitches for testing
export const samplePitches: Partial<Pitch>[] = [
  {
    id: 1001,
    opportunityId: 4,
    userId: 1,
    content: "I'm an expert on tariffs with over 15 years of experience in international trade. Happy to discuss the impact of recent policy changes.",
    status: 'pending',
    createdAt: new Date(),
    bidAmount: 200,
    user: {
      id: 1,
      username: 'tariff_expert',
      email: 'expert@example.com',
      fullName: 'Jane Smith'
    },
    opportunity: {
      id: 4,
      title: 'Seeking Experts on Tariffs',
      publicationId: 2,
    },
    publication: {
      id: 2,
      name: 'Forbes',
      logo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLW5ld3NwYXBlciI+PHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiB4PSIyIiB5PSIyIiByeD0iMiIvPjxwYXRoIGQ9Ik0xNiA4aDJtLTIgNGgyIG0tMiA0aDJNNiA4aDZ2NGgtNnptMCA4aDEwbS0xMC00aDYiLz48L3N2Zz4='
    }
  },
  {
    id: 1002,
    opportunityId: 4,
    userId: 2,
    audioUrl: 'https://example.com/sample-audio.mp3',
    transcript: "Hello, I'm a tariff policy analyst at a major think tank. I can provide detailed insights on how the current tariffs are affecting global supply chains.",
    status: 'interested',
    createdAt: new Date(Date.now() - 86400000), // 1 day ago
    bidAmount: 250,
    user: {
      id: 2,
      username: 'policy_analyst',
      email: 'analyst@example.com',
      fullName: 'John Doe'
    },
    opportunity: {
      id: 4,
      title: 'Seeking Experts on Tariffs',
      publicationId: 2,
    },
    publication: {
      id: 2,
      name: 'Forbes',
      logo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLW5ld3NwYXBlciI+PHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiB4PSIyIiB5PSIyIiByeD0iMiIvPjxwYXRoIGQ9Ik0xNiA4aDJtLTIgNGgyIG0tMiA0aDJNNiA4aDZ2NGgtNnptMCA4aDEwbS0xMC00aDYiLz48L3N2Zz4='
    }
  },
  {
    id: 1003,
    opportunityId: 4,
    userId: 3,
    content: "I'm the lead economist at a major corporation and can speak authoritatively about how tariffs are impacting our business sector.",
    status: 'not_interested',
    createdAt: new Date(Date.now() - 172800000), // 2 days ago
    bidAmount: 300,
    user: {
      id: 3,
      username: 'lead_economist',
      email: 'economist@example.com',
      fullName: 'Michael Johnson'
    },
    opportunity: {
      id: 4,
      title: 'Seeking Experts on Tariffs',
      publicationId: 2,
    },
    publication: {
      id: 2,
      name: 'Forbes',
      logo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLW5ld3NwYXBlciI+PHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiB4PSIyIiB5PSIyIiByeD0iMiIvPjxwYXRoIGQ9Ik0xNiA4aDJtLTIgNGgyIG0tMiA0aDJNNiA4aDZ2NGgtNnptMCA4aDEwbS0xMC00aDYiLz48L3N2Zz4='
    }
  },
  {
    id: 1004,
    opportunityId: 4,
    userId: 4,
    audioUrl: 'https://example.com/sample-audio2.mp3',
    transcript: "I've been studying international trade agreements for a decade and can provide insight on how current tariff structures compare historically.",
    status: 'successful',
    createdAt: new Date(Date.now() - 259200000), // 3 days ago
    bidAmount: 350,
    paymentIntentId: 'pi_sample_12345',
    user: {
      id: 4,
      username: 'trade_researcher',
      email: 'researcher@example.com',
      fullName: 'Emily Wilson'
    },
    opportunity: {
      id: 4,
      title: 'Seeking Experts on Tariffs',
      publicationId: 2,
    },
    publication: {
      id: 2,
      name: 'Forbes',
      logo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLW5ld3NwYXBlciI+PHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiB4PSIyIiB5PSIyIiByeD0iMiIvPjxwYXRoIGQ9Ik0xNiA4aDJtLTIgNGgyIG0tMiA0aDJNNiA4aDZ2NGgtNnptMCA4aDEwbS0xMC00aDYiLz48L3N2Zz4='
    }
  }
];