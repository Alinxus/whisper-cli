import {NextResponse, NextRequest} from 'next/server';

const BASE_URL =  'http://localhost:3000/api/v1';

export async function POST(request: NextRequest) {
    const {email, password, firstName, lastName, username} = await request.json();

    const registerResponse = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email,
            password,
            firstName,
            lastName,
            username,
        }),
    });
    const data = await registerResponse.json();
    if (!registerResponse.ok) {
        return NextResponse.json({error: data.message}, {status: registerResponse.status});
    }
    return NextResponse.json(data, {status: 200});
}

export async function GET(request: NextRequest) {
    const response = await fetch(`${BASE_URL}/auth/login`);
    const {email, password, username} = await response.json();

    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email,
            password,
            username
        }),
    });
    const data = await loginResponse.json();
    if (!loginResponse.ok) {
        return NextResponse.json({error: data.message}, {status: loginResponse.status});
    }
    return NextResponse.json(data, {status: 200});
}