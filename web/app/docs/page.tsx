"use client";

import Link from "next/link";

export default function DocsPage() {
  return (
    <div className="container" style={{ maxWidth: "800px", padding: "3rem 1.5rem" }}>
      <header style={{ marginBottom: "2.5rem", borderBottom: "1px solid var(--border)", paddingBottom: "1.5rem" }}>
        <Link href="/" style={{
          color: "var(--primary)",
          textDecoration: "none",
          fontSize: "0.95rem",
          fontWeight: 600,
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "1rem"
        }}>
          &larr; Back to Dashboard
        </Link>
        <h1 style={{ fontSize: "2.2rem", fontWeight: 700, margin: 0 }}>
          Wallpaper Sync Documentation
        </h1>
        <p style={{ color: "var(--text-muted)", marginTop: "0.5rem", fontSize: "1.05rem" }}>
          What is new in the version 3 release cycle (v3.4.1).
        </p>
      </header>

      <main style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
        <section>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
            The Discovery Dashboard
          </h2>
          <p style={{ lineHeight: 1.6, color: "var(--foreground)", marginBottom: "1rem" }}>
            The user interface has been completely redesigned. Instead of a simple static list of files, the home page now operates as a full discovery catalog. It features a hero banner highlighting recent uploads, horizontal scrolling strips for recently added files, and card grids allowing you to browse directly by categories.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
            Categories, Collections, and Tags
          </h2>
          <p style={{ lineHeight: 1.6, color: "var(--foreground)", marginBottom: "1rem" }}>
            This release introduces a proper data hierarchy for organizing your wallpapers:
          </p>
          <ul style={{ paddingLeft: "1.5rem", lineHeight: 1.8, marginBottom: "1rem" }}>
            <li>
              <strong>Categories:</strong> The top-level containers representing wide genres (such as Anime, Game Art, Landscapes, or Space).
            </li>
            <li>
              <strong>Collections:</strong> Mid-level albums grouped under specific categories (for example, a Naruto collection nested within the Anime category). Wallpapers are mapped to collections dynamically using a many-to-many junction structure based on matching weights and keywords.
            </li>
            <li>
              <strong>Tags:</strong> A free-form, normalized labeling system. Multi-select grids let administrators tag and map wallpapers globally in a single action, which then synchronizes down to the client.
            </li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
            Smart Slideshow System
          </h2>
          <p style={{ lineHeight: 1.6, color: "var(--foreground)", marginBottom: "1rem" }}>
            The slideshow utility has been expanded to support smart filtering. You can now restrict slideshow loops to run specifically within a single chosen Category or Collection, or limit it to your Favorites playlist. The slideshow settings also include sort orders such as random selection, shuffle, sequential progression, or newest first.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
            Offline-First Cache
          </h2>
          <p style={{ lineHeight: 1.6, color: "var(--foreground)", marginBottom: "1rem" }}>
            To ensure the desktop client remains fully operational during network outages, all categories, collections, tags, and assignments are saved locally in a JSON cache. Client-side pulls retrieve publishing lists from the server and match queries locally against visual styles, dominant colors, and names in milliseconds.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
            Technical Admin & Bulk Updates
          </h2>
          <p style={{ lineHeight: 1.6, color: "var(--foreground)", marginBottom: "1rem" }}>
            The admin web dashboard incorporates robust scaling utilities:
          </p>
          <ul style={{ paddingLeft: "1.5rem", lineHeight: 1.8, marginBottom: "1rem" }}>
            <li>
              <strong>Bulk Update API:</strong> Batch assign categories/collections and push tag updates across groups of wallpapers instantly.
            </li>
            <li>
              <strong>Progress Bar Feedback:</strong> Real-time progress updates visible directly on the UI layout during file uploads.
            </li>
            <li>
              <strong>Background Indexing workers:</strong> Triggers Gemini vision categorization and tags matching pipelines seamlessly on ingestion.
            </li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
            App Minimize & Credits
          </h2>
          <p style={{ lineHeight: 1.6, color: "var(--foreground)", marginBottom: "1rem" }}>
            A new menu toggle button has been added next to the search bar. Clicking this button collapses the left navigation pane completely out of view, maximizing the available screen space for browsing wallpaper cards. The bottom of the sidebar also features project credit links pointing to creator resources.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
            Ratings & Feedback
          </h2>
          <p style={{ lineHeight: 1.6, color: "var(--foreground)", marginBottom: "1rem" }}>
            After changing your wallpaper 5 times, the client application will request a quick rating and comment. Reviews are submitted directly to the server and are plotted in the Web Portal dashboard analytics, helping administrators track app usage and stability.
          </p>
        </section>
      </main>

      <footer style={{ marginTop: "4rem", borderTop: "1px solid var(--border)", paddingTop: "1.5rem", textAlign: "center", fontSize: "0.85rem", color: "var(--text-muted)" }}>
        Wallpaper Sync App - Core Version 3.4.1 - Designed by Debanjan Dutta
      </footer>
    </div>
  );
}
