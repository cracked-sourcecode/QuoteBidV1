import { Request, Response, NextFunction } from "express";
import { getDb } from "../../db";
import { users } from "@shared/schema";
import { sql } from "drizzle-orm";

const fieldMap = {
  username: "username",
  email: "email",
  phone: "phone_number",
} as const;

export async function checkUnique(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  console.log("► checkUnique hit", req.query);
  try {
    const { field, value } = req.query as {
      field: keyof typeof fieldMap;
      value: string;
    };

    if (!field || !value || !fieldMap[field]) {
      return res.status(400).json({ error: "Invalid query" });
    }

    const column = fieldMap[field];
    
    // Normalize the input value based on field type
    let normalizedValue = value;
    if (field === 'email' || field === 'username') {
      normalizedValue = value.toLowerCase().trim();
    } else if (field === 'phone') {
      // Remove non-numeric characters from phone number for consistent comparison
      normalizedValue = value.replace(/\D/g, '');
      // Ensure we're not searching with an empty string
      if (normalizedValue.length === 0) {
        return res.json({ unique: false, error: 'Invalid phone format' });
      }
    }

    // Use a simplified query that only selects the id to avoid schema issues
    // with fields that might not exist in the database
    const result = await getDb()
      .select({ id: users.id })
      .from(users)
      .where(
        field === 'phone' 
          ? sql`REPLACE(REPLACE(REPLACE(${users.phone_number}, '+', ''), '-', ''), ' ', '') LIKE ${'%' + normalizedValue + '%'}`
          : sql`LOWER(${users[column]}) = LOWER(${normalizedValue})`
      )
      .limit(1);

    res.json({ unique: result.length === 0 });
  } catch (err) {
    console.error('Error in checkUnique:', err);
    // Return a safe response even in case of errors
    res.status(500).json({ error: "Failed to check uniqueness", unique: false });
  }
} 