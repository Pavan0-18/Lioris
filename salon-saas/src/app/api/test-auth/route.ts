import { db } from "@/lib/db";
import { superAdmins } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { compare } from "bcryptjs";

export async function GET() {
  try {
    console.log("[TestAuth] Checking super admins...");
    const allAdmins = await db.select().from(superAdmins);
    console.log(`[TestAuth] Found ${allAdmins.length} super admins`);

    const testEmail = "pavan@gmail.com";
    const testPassword = "1234";

    const [admin] = await db.select().from(superAdmins).where(eq(superAdmins.email, testEmail)).limit(1);
    
    if (!admin) {
      return Response.json({ 
        success: false, 
        message: `Super admin ${testEmail} not found`,
        admins: allAdmins.map(a => ({ email: a.email, name: a.name }))
      });
    }

    console.log(`[TestAuth] Found admin: ${admin.email}`);
    console.log(`[TestAuth] Password hash: ${admin.passwordHash.substring(0, 20)}...`);

    const passwordMatch = await compare(testPassword, admin.passwordHash);
    console.log(`[TestAuth] Password matches: ${passwordMatch}`);

    return Response.json({
      success: passwordMatch,
      message: passwordMatch ? "Login would succeed" : "Login would fail",
      admin: {
        email: admin.email,
        name: admin.name,
        passwordMatch
      }
    });
  } catch (error: any) {
    console.error("[TestAuth] Error:", error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
