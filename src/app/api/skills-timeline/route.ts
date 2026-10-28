import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET () {
    try {
        const skillsTimeline = await query(`SELECT * FROM skills_timeline`);
        return NextResponse.json({ ok: true, skillsTimeline: skillsTimeline.rows });
    } catch(err: any) {
        return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
    }
}