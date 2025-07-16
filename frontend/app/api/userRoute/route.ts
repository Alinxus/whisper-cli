import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = 'http://localhost:3000/api/v1';

export async function GET(request: NextRequest) {
    const { userId, firstName, lastName, email, role, isActive, isVerified, subscription } = await request.json();

    const response = await fetch(`${BASE_URL}/me/${userId}`);
    const data = await response.json();

    if (!response.ok) {
        return NextResponse.json({ error: data.message }, { status: response.status });
    }
    return NextResponse.json(data, { status: 200 });
}
