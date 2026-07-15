import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Categories table does not exist in the database, return an empty array to maintain frontend compatibility
    return NextResponse.json({ categories: [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json({ error: "Categories management is disabled (table categories does not exist)" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
