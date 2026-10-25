import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
    try {
        const skills = await query(`SELECT * FROM skills`);
        return NextResponse.json({ ok: true, skills: skills.rows });
    } catch(err: any) {
        return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
    }
}