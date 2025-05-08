import { User } from "@shared/schema";

export const sampleUsers: Partial<User>[] = [
  {
    username: "ben.stevens",
    password: "$2a$10$abcdefghijklmnopqrstuvwxyz", // This would be properly hashed in a real app
    fullName: "Ben Stevens",
    email: "ben.stevens@example.com",
    avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23e0e0e0'/%3E%3Ctext x='50' y='55' text-anchor='middle' font-family='Arial' font-size='40' fill='%23333'%3EBS%3C/text%3E%3C/svg%3E"
  },
  {
    username: "jane.editor",
    password: "$2a$10$abcdefghijklmnopqrstuvwxyz",
    fullName: "Jane Editor",
    email: "jane.editor@example.com",
    avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23e0e0e0'/%3E%3Ctext x='50' y='55' text-anchor='middle' font-family='Arial' font-size='40' fill='%23333'%3EJE%3C/text%3E%3C/svg%3E"
  },
  {
    username: "mark.writer",
    password: "$2a$10$abcdefghijklmnopqrstuvwxyz",
    fullName: "Mark Writer",
    email: "mark.writer@example.com",
    avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23e0e0e0'/%3E%3Ctext x='50' y='55' text-anchor='middle' font-family='Arial' font-size='40' fill='%23333'%3EMW%3C/text%3E%3C/svg%3E"
  }
];
