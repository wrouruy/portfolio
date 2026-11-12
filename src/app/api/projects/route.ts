import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
    try {
        const projects = await query(`
            SELECT
                p.*,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', s.id,
                            'name', s.name,
                            'icon_url', s.icon_url,
                            'category_id', s.category_id,
                            'sort_order', s.sort_order
                        )
                        ORDER BY s.sort_order, s.id
                    ) FILTER (WHERE s.id IS NOT NULL),
                    '[]'
                ) AS skills
            FROM projects p
            LEFT JOIN project_skills ps ON ps.project_id = p.id
            LEFT JOIN skills s ON s.id = ps.skill_id
            GROUP BY p.id
            ORDER BY p.id
        `);
        return NextResponse.json({ ok: true, projects: projects.rows});
    } catch(err: any) {
        return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
    }
}