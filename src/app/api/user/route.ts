import { NextResponse } from "next/server";

const USERNAME = 'wrouruy'

export async function GET () {
    try {
        const res = await fetch('https://api.github.com/users/' + USERNAME,
            {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + process.env.GITHUB_TOKEN
                }
            }
        );
        const data = await res.json();
    
        return NextResponse.json({ ok: true, user: data });
    } catch(err: any) {
        return NextResponse.json({ ok: false, message: err.message });
    }
}