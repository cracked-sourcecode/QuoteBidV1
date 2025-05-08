import { Opportunity } from "@shared/schema";
import { addDays } from "date-fns";

export const sampleOpportunities: Partial<Opportunity>[] = [
  {
    publicationId: 1, // DailyMail.com
    title: "Looking for experts in commercial affairs that have experiences with popular coins",
    requestType: "MATCH TO EXPERT REQUEST",
    description: "We're looking to write a story about evolution of financial systems with special focus on anyone or researcher now that may be interested in being interviewed for an article. We are particularly interested in experts who can discuss cryptocurrency adoption in traditional commercial settings and how this impacts everyday consumers.",
    status: "open",
    tags: ["Business", "Cryptocurrency", "Experts"],
    minimumBid: 150,
    deadline: addDays(new Date(), 2)
  },
  {
    publicationId: 2, // Family Handyman
    title: "Need help! What is a john port?",
    requestType: "EXPERT REQUEST",
    description: "I'm working on an article about \"what is a john port\" for DIY repairs, and I'm expecting responses. \"Thanks! What is a john job? How do you use one to open the cap. I need detailed explanations that will help DIY homeowners understand this plumbing concept.",
    status: "open",
    tags: ["DIY", "Plumbing", "Homeowner"],
    minimumBid: 100,
    deadline: addDays(new Date(), 3)
  },
  {
    publicationId: 3, // Expert's Prosperity Report
    title: "Experts Needed re: \"When Does Life Insurance Make Sense?\"",
    requestType: "EXPERT REQUEST",
    description: "I'm writing a Family Prosperity report on life insurance—I'm looking for several insurance experts that are willing to answer a few questions about when and who should have life insurance. This article will help readers understand the various options and make informed decisions for their families.",
    status: "open",
    tags: ["Insurance", "Financial", "LifeInsurance", "Advice"],
    minimumBid: 175,
    deadline: addDays(new Date(), 2)
  },
  {
    publicationId: 2, // Family Handyman
    title: "Looking For: Home and Auto",
    requestType: "EXPERT REQUEST",
    description: "I'm working on an article around the house and auto repair issues with vinegar. Need money saving tips with vinegar. What it's easy to have a little fun with the topic. Looking for professional handymen and mechanics who can share innovative uses for this household staple.",
    status: "open",
    tags: ["Home", "Auto", "DIY", "Repair"],
    minimumBid: 125,
    deadline: addDays(new Date(), 4)
  },
  {
    publicationId: 4, // Medscape
    title: "Favorite Medical Movies",
    requestType: "EXPERT REQUEST",
    description: "Hello, I'm writing an article on physician favorite medical movies. MDs and DOs—let me know their favorite med movies. Please list the title and any of your favorite med movies in your response, along with a brief explanation of why these films resonate with medical professionals.",
    status: "open",
    tags: ["Medicine", "Movies", "Doctors"],
    minimumBid: 0, // Free to pitch
    deadline: addDays(new Date(), 7)
  },
  {
    publicationId: 5, // Motor Trend Magazine
    title: "Which vehicle \"catches\" in \"how does one write a review?\"",
    requestType: "EXPERT REQUEST",
    description: "I'd like to know if you're a vehicle enthusiast, which recent car model does you think manufacturers can do better? Besides recommending the product, what else should be included in a good vehicle review? Looking for automotive journalists and experts who can share their approach.",
    status: "open",
    tags: ["Automotive", "Editing", "Reviews", "Writer"],
    minimumBid: 200,
    deadline: addDays(new Date(), 3)
  },
  {
    publicationId: 6, // The Manual
    title: "Experts for \"Best Of\" Products: Men's Accessories and more!",
    requestType: "EXPERT REQUEST",
    description: "I'm writing the \"Best Of\" for The Manual. I need experts to recommend the best sunglasses, watches, eyeglasses, and jewelry for men. Besides recommending the products, I'd appreciate insights on current trends, quality indicators, and how to select the right accessories for different occasions.",
    status: "open",
    tags: ["Fashion", "Experts", "Lifestyle", "MensFashion", "Advice"],
    minimumBid: 225,
    deadline: addDays(new Date(), 1)
  },
  {
    publicationId: 7, // Real Estate Times
    title: "Seeking Real Estate Experts on Millennial and Gen Z Homeownership Solutions",
    requestType: "EXPERT REQUEST",
    description: "We're working on an article focused on the challenges and creative solutions for achieving homeownership in today's market. Great for rising prices and limited supply. Seeking real estate agents, mortgage brokers, and housing economists who can provide insights on how younger generations can enter the market.",
    status: "open",
    tags: ["RealEstate", "Millennial", "GenZ", "Housing", "Homeownership"],
    minimumBid: 180,
    deadline: addDays(new Date(), 5)
  },
  {
    publicationId: 8, // AskMen
    title: "Wellness experts needed: Fast Workout Formats That Deliver Big Results",
    requestType: "EXPERT REQUEST",
    description: "Looking for fitness experts to share their most efficient workout routines for busy professionals. Ideal formats should take 30 minutes or less but deliver maximum results. We're particularly interested in evidence-based approaches and routines that don't require extensive equipment.",
    status: "open",
    tags: ["Fitness", "Health", "Wellness", "MensHealth", "Experts"],
    minimumBid: 150,
    deadline: addDays(new Date(), 4)
  },
  {
    publicationId: 9, // Corporate Compliance Insights
    title: "Experts needed to discuss modernizing HIPAA rules and potential SEC changes",
    requestType: "EXPERT REQUEST",
    description: "Looking for compliance experts to discuss recent healthcare data regulation changes and how they impact businesses. Also seeking input on anticipated SEC rule changes and what companies should be preparing for in the coming year. Legal experts and compliance officers preferred.",
    status: "open",
    tags: ["Business", "Compliance", "Legal", "Healthcare", "Finance"],
    minimumBid: 250,
    deadline: addDays(new Date(), 6)
  },
  {
    publicationId: 3, // Expert's Prosperity Report
    title: "Mother's Day Gift Guide: Meaningful Gifts",
    requestType: "EXPERT REQUEST",
    description: "For our Mother's Day Gift Guide we are looking for items and experiences worth meaningful to moms. We want recommendations that go beyond the typical flowers and jewelry, focusing on thoughtful gifts that create lasting memories or solve real problems for busy moms.",
    status: "open",
    tags: ["Lifestyle", "Shopping", "Gifts", "MothersDay", "Family"],
    minimumBid: 125,
    deadline: addDays(new Date(), 10)
  },
  {
    publicationId: 5, // Motor Trend Magazine
    title: "Body Language: Sharing Romantic Feelings Through Body Language",
    requestType: "EXPERT REQUEST",
    description: "Body Talk offers articles and tips that focus on body language and how it is an essential part of communication. We're looking for relationship experts and body language specialists who can provide insights on how non-verbal cues signal romantic interest and emotional connection.",
    status: "open",
    tags: ["Relationships", "Psychology", "Communication", "Lifestyle", "Dating"],
    minimumBid: 175,
    deadline: addDays(new Date(), 14)
  }
];
