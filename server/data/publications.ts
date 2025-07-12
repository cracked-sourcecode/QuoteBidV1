import { Publication } from "@shared/schema";

// Publication logos are generated as SVG data URLs for ease of implementation
const publicationLogos = {
  dailyMail: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 40'%3E%3Crect width='100' height='40' fill='%23fff'/%3E%3Cpath d='M10 10h80v20H10z' fill='%230f5fa5'/%3E%3Ctext x='50' y='25' text-anchor='middle' font-family='Arial' font-weight='bold' font-size='14' fill='%23fff'%3EDaily Mail%3C/text%3E%3C/svg%3E",
  familyHandyman: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 40'%3E%3Crect width='100' height='40' fill='%23fff'/%3E%3Cpath d='M10 10h80v20H10z' fill='%23e63946'/%3E%3Ctext x='50' y='25' text-anchor='middle' font-family='Arial' font-weight='bold' font-size='10' fill='%23fff'%3EFamily Handyman%3C/text%3E%3C/svg%3E",
  prosperityReport: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 40'%3E%3Crect width='100' height='40' fill='%23fff'/%3E%3Ccircle cx='50' cy='20' r='15' fill='%231d3557'/%3E%3Ctext x='50' y='24' text-anchor='middle' font-family='Arial' font-weight='bold' font-size='9' fill='%23fff'%3EProsperity%3C/text%3E%3C/svg%3E",
  medscape: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 40'%3E%3Crect width='100' height='40' fill='%23fff'/%3E%3Cpath d='M10 10h80v20H10z' fill='%234ea8de'/%3E%3Ctext x='50' y='25' text-anchor='middle' font-family='Arial' font-weight='bold' font-size='14' fill='%23fff'%3EMedscape%3C/text%3E%3C/svg%3E",
  motorTrend: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 40'%3E%3Crect width='100' height='40' fill='%23fff'/%3E%3Cpath d='M10 10h80v20H10z' fill='%23fb8500'/%3E%3Ctext x='50' y='25' text-anchor='middle' font-family='Arial' font-weight='bold' font-size='11' fill='%23fff'%3EMotor Trend%3C/text%3E%3C/svg%3E",
  theManual: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 40'%3E%3Crect width='100' height='40' fill='%23fff'/%3E%3Cpath d='M10 10h80v20H10z' fill='%23333'/%3E%3Ctext x='50' y='25' text-anchor='middle' font-family='Arial' font-weight='bold' font-size='14' fill='%23fff'%3EThe Manual%3C/text%3E%3C/svg%3E",
  realEstateTimes: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 40'%3E%3Crect width='100' height='40' fill='%23fff'/%3E%3Cpath d='M10 10h80v20H10z' fill='%23457b9d'/%3E%3Ctext x='50' y='25' text-anchor='middle' font-family='Arial' font-weight='bold' font-size='10' fill='%23fff'%3EReal Estate Times%3C/text%3E%3C/svg%3E",
  askMen: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 40'%3E%3Crect width='100' height='40' fill='%23fff'/%3E%3Cpath d='M10 10h80v20H10z' fill='%23003049'/%3E%3Ctext x='50' y='25' text-anchor='middle' font-family='Arial' font-weight='bold' font-size='14' fill='%23fff'%3EAskMen%3C/text%3E%3C/svg%3E",
  corporateCompliance: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 40'%3E%3Crect width='100' height='40' fill='%23fff'/%3E%3Cpath d='M10 10h80v20H10z' fill='%232b2d42'/%3E%3Ctext x='50' y='22' text-anchor='middle' font-family='Arial' font-weight='bold' font-size='9' fill='%23fff'%3ECorporate%3C/text%3E%3Ctext x='50' y='30' text-anchor='middle' font-family='Arial' font-weight='bold' font-size='9' fill='%23fff'%3ECompliance%3C/text%3E%3C/svg%3E",
  
  // Major publications that are commonly referenced
  yahooFinance: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 80'%3E%3Crect width='240' height='80' fill='%23fff'/%3E%3Ctext x='120' y='35' text-anchor='middle' font-family='Helvetica,Arial,sans-serif' font-weight='bold' font-size='28' fill='%23410093'%3EYahoo%3C/text%3E%3Ctext x='120' y='60' text-anchor='middle' font-family='Helvetica,Arial,sans-serif' font-weight='600' font-size='18' fill='%236001D2'%3EFinance%3C/text%3E%3C/svg%3E",
  bloomberg: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 80'%3E%3Crect width='240' height='80' fill='%23000'/%3E%3Ctext x='120' y='50' text-anchor='middle' font-family='Helvetica,Arial,sans-serif' font-weight='bold' font-size='24' fill='%23fff'%3EBloomberg%3C/text%3E%3C/svg%3E",
  forbes: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 80'%3E%3Crect width='240' height='80' fill='%23094f90'/%3E%3Ctext x='120' y='50' text-anchor='middle' font-family='Helvetica,Arial,sans-serif' font-weight='bold' font-size='28' fill='%23fff'%3EForbes%3C/text%3E%3C/svg%3E",
  techCrunch: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 80'%3E%3Crect width='240' height='80' fill='%2300ff88'/%3E%3Ctext x='120' y='50' text-anchor='middle' font-family='Helvetica,Arial,sans-serif' font-weight='bold' font-size='22' fill='%23000'%3ETechCrunch%3C/text%3E%3C/svg%3E",
  wallStreetJournal: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 80'%3E%3Crect width='240' height='80' fill='%23fff'/%3E%3Ctext x='120' y='45' text-anchor='middle' font-family='Georgia,serif' font-weight='bold' font-size='16' fill='%23000'%3EThe Wall Street%3C/text%3E%3Ctext x='120' y='65' text-anchor='middle' font-family='Georgia,serif' font-weight='bold' font-size='16' fill='%23000'%3EJournal%3C/text%3E%3C/svg%3E",
  globeStreet: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 80'%3E%3Crect width='240' height='80' fill='%23fff'/%3E%3Ctext x='120' y='50' text-anchor='middle' font-family='Arial,sans-serif' font-weight='bold' font-size='28' fill='%23000'%3EGlobeSt%3C/text%3E%3Ctext x='180' y='50' text-anchor='middle' font-family='Arial,sans-serif' font-weight='normal' font-size='16' fill='%23000'%3E.com%3C/text%3E%3C/svg%3E"
};

export const samplePublications: Partial<Publication>[] = [
  {
    name: "DailyMail.com",
    logo: publicationLogos.dailyMail,
    website: "https://www.dailymail.com",
    category: "News"
  },
  {
    name: "Family Handyman",
    logo: publicationLogos.familyHandyman,
    website: "https://www.familyhandyman.com",
    category: "Home & DIY"
  },
  {
    name: "Expert's Prosperity Report",
    logo: publicationLogos.prosperityReport,
    website: "https://www.expertprosperity.com",
    category: "Finance"
  },
  {
    name: "Medscape",
    logo: publicationLogos.medscape,
    website: "https://www.medscape.com",
    category: "Health"
  },
  {
    name: "Motor Trend Magazine",
    logo: publicationLogos.motorTrend,
    website: "https://www.motortrend.com",
    category: "Automotive"
  },
  {
    name: "The Manual",
    logo: publicationLogos.theManual,
    website: "https://www.themanual.com",
    category: "Lifestyle"
  },
  {
    name: "Real Estate Times",
    logo: publicationLogos.realEstateTimes,
    website: "https://www.realestatetimes.com",
    category: "Real Estate"
  },
  {
    name: "AskMen",
    logo: publicationLogos.askMen,
    website: "https://www.askmen.com",
    category: "Lifestyle"
  },
  {
    name: "Corporate Compliance Insights",
    logo: publicationLogos.corporateCompliance,
    website: "https://www.corporatecomplianceinsights.com",
    category: "Business"
  },
  {
    name: "Yahoo Finance",
    logo: publicationLogos.yahooFinance,
    website: "https://finance.yahoo.com",
    category: "Finance"
  },
  {
    name: "Bloomberg",
    logo: publicationLogos.bloomberg,
    website: "https://www.bloomberg.com",
    category: "Finance"
  },
  {
    name: "Forbes",
    logo: publicationLogos.forbes,
    website: "https://www.forbes.com",
    category: "Finance"
  },
  {
    name: "TechCrunch",
    logo: publicationLogos.techCrunch,
    website: "https://techcrunch.com",
    category: "Technology"
  },
  {
    name: "The Wall Street Journal",
    logo: publicationLogos.wallStreetJournal,
    website: "https://www.wsj.com",
    category: "Finance"
  }
];
