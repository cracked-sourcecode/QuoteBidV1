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
    const result = await getDb()
      .select()
      .from(users)
      .where(sql`LOWER(${users[column]}) = LOWER(${value})`)
      .limit(1);

    res.json({ unique: result.length === 0 });
  } catch (err) {
    next(err);
  }
} 