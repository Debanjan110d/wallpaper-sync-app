import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase environment variables are missing");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

interface ReviewItem {
  id: number | string;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

async function getStoredReviews(supabase: any): Promise<ReviewItem[]> {
  // 1. Try PostgreSQL table first
  try {
    const { data: dbData, error: dbError } = await supabase
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (!dbError && dbData && dbData.length > 0) {
      return dbData;
    }
  } catch (e) {
    // Ignore DB fallback to storage
  }

  // 2. Storage bucket fallback
  try {
    const { data: fileData, error: downloadErr } = await supabase.storage
      .from("reviews")
      .download("reviews.json");

    if (!downloadErr && fileData) {
      const text = await fileData.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Storage download error:", e);
  }

  return [];
}

async function saveStoredReviews(supabase: any, reviews: ReviewItem[]): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from("reviews")
      .upload("reviews.json", JSON.stringify(reviews, null, 2), {
        contentType: "application/json",
        upsert: true,
      });

    return !error;
  } catch (e) {
    console.error("Storage upload error:", e);
    return false;
  }
}

function calculateStats(reviews: ReviewItem[]) {
  const totalReviews = reviews.length;
  if (totalReviews === 0) {
    return {
      averageRating: 5.0,
      totalReviews: 0,
      ratingCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    };
  }

  const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;

  for (const r of reviews) {
    const stars = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
    ratingCounts[stars as keyof typeof ratingCounts] = (ratingCounts[stars as keyof typeof ratingCounts] || 0) + 1;
    sum += r.rating;
  }

  const averageRating = Number((sum / totalReviews).toFixed(1));

  return {
    averageRating,
    totalReviews,
    ratingCounts
  };
}

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const reviews = await getStoredReviews(supabase);
    const stats = calculateStats(reviews);

    return NextResponse.json(
      {
        success: true,
        reviews,
        stats
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch reviews" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reviewer_name, rating, comment } = body;

    const numericRating = Number(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return NextResponse.json(
        { error: "Rating must be an integer between 1 and 5" },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();
    const newReview: ReviewItem = {
      id: Date.now(),
      reviewer_name: reviewer_name && String(reviewer_name).trim() ? String(reviewer_name).trim() : "Anonymous User",
      rating: Math.round(numericRating),
      comment: comment ? String(comment).trim() : "",
      created_at: new Date().toISOString()
    };

    // Try inserting into DB table if available
    try {
      await supabase.from("reviews").insert([
        {
          reviewer_name: newReview.reviewer_name,
          rating: newReview.rating,
          comment: newReview.comment
        }
      ]);
    } catch (e) {
      // Table may not exist yet
    }

    // Save to Supabase storage to guarantee persistence
    const existing = await getStoredReviews(supabase);
    const updated = [newReview, ...existing];
    await saveStoredReviews(supabase, updated);

    const stats = calculateStats(updated);

    return NextResponse.json(
      {
        success: true,
        review: newReview,
        stats
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to submit review" },
      { status: 500, headers: corsHeaders }
    );
  }
}
