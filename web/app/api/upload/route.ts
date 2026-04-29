import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("admin_session");

    if (!session || session.value !== "true") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Use the Service Role Key to bypass Row Level Security (RLS) 
    // because we already authenticated the user with our ADMIN_PASSWORD.
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is missing in .env.local" }, { status: 500 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const buffer = await file.arrayBuffer();
    const ext = file.name.substring(file.name.lastIndexOf('.'));
    // Generate a very short unique name like "0123-4567.jpg"
    const randomStr = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const timeStr = Date.now().toString().slice(-4);
    const filename = `${randomStr}-${timeStr}${ext}`;

    const { data, error } = await supabaseAdmin.storage
      .from("wallpapers")
      .upload(filename, buffer, {
        contentType: file.type,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
