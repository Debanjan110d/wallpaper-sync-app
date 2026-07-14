"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

export default function Page() {
  const [username, setUsername] = useState("Admin");
  const [files, setFiles] = useState<File[]>([]);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showMindmap, setShowMindmap] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Metadata Lists
  const [categories, setCategories] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);

  // Filtering State
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("");
  const [selectedCollectionFilter, setSelectedCollectionFilter] = useState<string>("");
  const [selectedTagFilters, setSelectedTagFilters] = useState<number[]>([]);

  // Upload Form Metadata
  const [selectedCategoryForUpload, setSelectedCategoryForUpload] = useState<string>("");
  const [selectedCollectionForUpload, setSelectedCollectionForUpload] = useState<string>("");
  const [selectedTagsForUpload, setSelectedTagsForUpload] = useState<number[]>([]);

  // Inline Creation Fields
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  
  const [showNewColInput, setShowNewColInput] = useState(false);
  const [newColName, setNewColName] = useState("");

  const [newTagName, setNewTagName] = useState("");

  // Tag Search states for different forms
  const [tagSearchUpload, setTagSearchUpload] = useState("");
  const [tagSearchFilter, setTagSearchFilter] = useState("");
  const [tagSearchBulk, setTagSearchBulk] = useState("");
  const [tagSearchEdit, setTagSearchEdit] = useState("");

  // Auto-Slider Banner State
  const [sliderIndex, setSliderIndex] = useState(0);
  const [sliderPaused, setSliderPaused] = useState(false);
  const sliderIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Bulk Edit Selection
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [bulkCategoryId, setBulkCategoryId] = useState<string>("");
  const [bulkCollectionId, setBulkCollectionId] = useState<string>("");
  const [bulkTags, setBulkTags] = useState<number[]>([]);

  // Individual Wallpaper Edit Modal State
  const [editingWallpaper, setEditingWallpaper] = useState<any | null>(null);
  const [editCategoryId, setEditCategoryId] = useState<string>("");
  const [editCollectionId, setEditCollectionId] = useState<string>("");
  const [editTags, setEditTags] = useState<number[]>([]);

  // AI Indexing Trigger State
  const [indexingLoading, setIndexingLoading] = useState(false);
  const [indexingMessage, setIndexingMessage] = useState<string | null>(null);
  const [indexingProgress, setIndexingProgress] = useState<{
    active: boolean;
    total: number;
    processed: number;
    failed: number;
    currentWallpaper: string;
  } | null>(null);
  const [showProgressCard, setShowProgressCard] = useState(false);

  const checkIndexingStatus = async () => {
    try {
      const res = await fetch("/api/wallpapers/batch-index");
      if (res.ok) {
        const data = await res.json();
        setIndexingProgress(data);
        if (data && data.active) {
          setShowProgressCard(true);
        }
        return data;
      }
    } catch (e) {
      console.error("Failed to check indexing status:", e);
    }
    return null;
  };

  useEffect(() => {
    checkIndexingStatus();

    const intervalTime = indexingProgress?.active ? 2000 : 10000;
    const interval = setInterval(async () => {
      const progress = await checkIndexingStatus();
      if (progress && !progress.active && indexingProgress?.active) {
        fetchGallery();
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [indexingProgress?.active]);

  const handleTriggerIndexing = async (reindexAll = false) => {
    setIndexingLoading(true);
    setIndexingMessage(null);
    try {
      const res = await fetch("/api/wallpapers/batch-index", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reindexAll }),
      });
      const data = await res.json();
      if (res.ok) {
        setIndexingMessage(`Success: ${data.message}`);
        await checkIndexingStatus();
      } else {
        setIndexingMessage(`Error: ${data.error || "Failed to trigger indexing"}`);
      }
    } catch (err: any) {
      setIndexingMessage(`Error: ${err.message || err}`);
    } finally {
      setIndexingLoading(false);
    }
  };

  const handleCancelIndexing = async () => {
    setIndexingLoading(true);
    setIndexingMessage(null);
    try {
      const res = await fetch("/api/wallpapers/batch-index", {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setIndexingMessage("Success: AI indexing run was aborted.");
        await checkIndexingStatus();
      } else {
        setIndexingMessage(`Error: ${data.error || "Failed to abort indexing"}`);
      }
    } catch (err: any) {
      setIndexingMessage(`Error: ${err.message || err}`);
    } finally {
      setIndexingLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [resCats, resCols, resTags] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/collections"),
        fetch("/api/tags"),
      ]);
      const dataCats = await resCats.json();
      const dataCols = await resCols.json();
      const dataTags = await resTags.json();

      setCategories(dataCats.categories || []);
      setCollections(dataCols.collections || []);
      setTags(dataTags.tags || []);
    } catch (e) {
      console.error("Failed to fetch metadata:", e);
    }
  };

  const fetchGallery = async () => {
    try {
      let queryStr = "?";
      if (selectedCategoryFilter) {
        queryStr += `category=${selectedCategoryFilter}&`;
      }
      if (selectedCollectionFilter) {
        queryStr += `collection=${selectedCollectionFilter}&`;
      }
      if (selectedTagFilters.length > 0) {
        queryStr += `tags=${selectedTagFilters.join(",")}&`;
      }

      const res = await fetch(`/api/wallpapers${queryStr}`);
      const data = await res.json();
      if (data.wallpapers) {
        setGalleryImages(data.wallpapers);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const [reviews, setReviews] = useState<any[]>([]);
  const [releases, setReleases] = useState<any[]>([]);

  const fetchReviews = async () => {
    try {
      const res = await fetch("/api/reviews");
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch (e) {
      console.error("Failed to fetch reviews:", e);
    }
  };

  const fetchReleases = async () => {
    try {
      const res = await fetch("https://api.github.com/repos/Debanjan110d/wallpaper-sync-app/releases");
      if (res.ok) {
        const data = await res.json();
        setReleases(data || []);
      }
    } catch (e) {
      console.error("Failed to fetch releases:", e);
    }
  };

  useEffect(() => {
    fetchMetadata();
    fetchReviews();
    fetchReleases();
  }, []);

  useEffect(() => {
    fetchGallery();
    // Reset selected image IDs when filters change
    setSelectedImageIds([]);
  }, [selectedCategoryFilter, selectedCollectionFilter, selectedTagFilters]);

  // Setup auto-slide timer for recently added wallpapers (top 5 newer wallpapers)
  useEffect(() => {
    const isReduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isReduced || sliderPaused || galleryImages.length === 0) {
      if (sliderIntervalRef.current) clearInterval(sliderIntervalRef.current);
      return;
    }

    const sliderCount = Math.min(5, galleryImages.length);
    sliderIntervalRef.current = setInterval(() => {
      setSliderIndex((prev) => (prev + 1) % sliderCount);
    }, 6000);

    return () => {
      if (sliderIntervalRef.current) clearInterval(sliderIntervalRef.current);
    };
  }, [galleryImages, sliderPaused]);

  const validateAspectRatio = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        // Accept roughly landscape ratios (1.5 to 2.5)
        if (ratio >= 1.4 && ratio <= 2.6) {
          resolve(true);
        } else {
          resolve(false);
        }
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => resolve(false);
      img.src = URL.createObjectURL(file);
    });
  };

  const processFiles = async (newFiles: File[]) => {
    const validFiles: File[] = [];
    const newMessages: string[] = [];
    for (const file of newFiles) {
      if (!file.type.startsWith("image/")) continue;
      const isValid = await validateAspectRatio(file);
      if (isValid) {
        validFiles.push(file);
      } else {
        newMessages.push(`❌ ${file.name} ignored: Invalid aspect ratio. Only landscape wallpapers are allowed.`);
      }
    }
    setFiles((prev) => [...prev, ...validFiles]);
    if (newMessages.length > 0) {
      setMessages((prev) => [...prev, ...newMessages]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0 || !username) return;

    setLoading(true);
    setMessages([]);

    const newMessages: string[] = [];
    const successfulUploads: number[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("username", username);

      if (selectedCollectionForUpload) {
        formData.append("collection_id", selectedCollectionForUpload);
      }
      if (selectedCategoryForUpload) {
        formData.append("category_id", selectedCategoryForUpload);
      }
      if (selectedTagsForUpload.length > 0) {
        formData.append("tags", JSON.stringify(selectedTagsForUpload));
      }

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (res.ok) {
          newMessages.push(`✅ ${file.name} uploaded successfully!`);
          successfulUploads.push(i);
        } else {
          newMessages.push(`❌ ${file.name} failed: ${data.error || "Unknown error"}`);
        }
      } catch (err) {
        newMessages.push(`❌ ${file.name} encountered an error.`);
      }
    }

    setMessages(newMessages);
    setFiles((prev) => prev.filter((_, index) => !successfulUploads.includes(index)));
    setLoading(false);
    
    // Clear upload metadata state
    setSelectedCategoryForUpload("");
    setSelectedCollectionForUpload("");
    setSelectedTagsForUpload([]);

    fetchGallery();
  };

  const deleteImage = async (filename: string) => {
    if (!confirm("Are you sure you want to permanently delete this wallpaper?")) return;

    try {
      const res = await fetch("/api/wallpapers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      if (res.ok) {
        setGalleryImages((prev) => prev.filter((img) => img.name !== filename));
      } else {
        const data = await res.json();
        alert("Delete failed: " + data.error);
      }
    } catch (e) {
      alert("Delete failed: " + e);
    }
  };

  // Inline Category Creator
  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewCatName("");
        setShowNewCatInput(false);
        await fetchMetadata();
        setSelectedCategoryForUpload(String(data.category.id));
      } else {
        alert("Failed to create category: " + data.error);
      }
    } catch (e) {
      alert("Error: " + e);
    }
  };

  // Inline Collection Creator
  const handleCreateCollection = async () => {
    if (!newColName.trim() || !selectedCategoryForUpload) {
      alert("Please enter a collection name and ensure a category is selected.");
      return;
    }
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newColName.trim(),
          category_id: Number(selectedCategoryForUpload),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewColName("");
        setShowNewColInput(false);
        await fetchMetadata();
        setSelectedCollectionForUpload(String(data.collection.id));
      } else {
        alert("Failed to create collection: " + data.error);
      }
    } catch (e) {
      alert("Error: " + e);
    }
  };

  // Inline Tag Creator
  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewTagName("");
        await fetchMetadata();
        // Automatically check the newly created tag for upload selection
        setSelectedTagsForUpload((prev) => [...prev, data.tag.id]);
      } else {
        alert("Failed to create tag: " + data.error);
      }
    } catch (e) {
      alert("Error: " + e);
    }
  };

  // Toggle tag selected for filtering
  const handleToggleTagFilter = (tagId: number) => {
    setSelectedTagFilters((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  // Toggle tag selected for upload
  const handleToggleTagUpload = (tagId: number) => {
    setSelectedTagsForUpload((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  // Image Selection for Bulk Edit
  const handleSelectImage = (id: string) => {
    setSelectedImageIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllImages = () => {
    if (selectedImageIds.length === galleryImages.length) {
      setSelectedImageIds([]);
    } else {
      setSelectedImageIds(galleryImages.map((img) => img.id));
    }
  };

  // Handle start editing individual wallpaper
  const handleStartEdit = (img: any) => {
    setEditingWallpaper(img);
    setEditCategoryId(img.collection_details?.category_id ? String(img.collection_details.category_id) : "");
    setEditCollectionId(img.collection_id ? String(img.collection_id) : "");
    setEditTags(img.tags ? img.tags.map((t: any) => t.id) : []);
  };

  // Handle save editing individual wallpaper
  const handleSaveEdit = async () => {
    if (!editingWallpaper) return;
    setLoading(true);
    try {
      const itemUpdate: any = { id: editingWallpaper.id };
      if (editCollectionId) {
        itemUpdate.collection_id = Number(editCollectionId);
      } else if (editCategoryId) {
        itemUpdate.category_id = Number(editCategoryId);
      } else {
        itemUpdate.collection_id = null; // Clear collection/category
      }
      itemUpdate.tags = editTags; // Override tags

      const res = await fetch("/api/wallpapers/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [itemUpdate] }),
      });
      if (res.ok) {
        alert("Wallpaper metadata updated successfully!");
        setEditingWallpaper(null);
        fetchGallery();
      } else {
        const data = await res.json();
        alert("Failed to update: " + data.error);
      }
    } catch (e) {
      alert("Failed to update: " + e);
    } finally {
      setLoading(false);
    }
  };

  // Apply Bulk Updates
  const handleApplyBulkUpdate = async () => {
    if (selectedImageIds.length === 0) return;
    if (!bulkCategoryId && !bulkCollectionId && bulkTags.length === 0) {
      alert("Please select a category, collection, or tags to apply.");
      return;
    }

    setLoading(true);
    try {
      const items = selectedImageIds.map((id) => {
        const itemUpdate: any = { id };
        if (bulkCollectionId) {
          itemUpdate.collection_id = Number(bulkCollectionId);
        } else if (bulkCategoryId) {
          itemUpdate.category_id = Number(bulkCategoryId);
        }
        if (bulkTags.length > 0) {
          itemUpdate.tags = bulkTags;
        }
        return itemUpdate;
      });

      const res = await fetch("/api/wallpapers/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();

      if (res.ok) {
        alert(`Successfully updated metadata for ${data.summary.successful} wallpapers!`);
        setSelectedImageIds([]);
        setBulkCategoryId("");
        setBulkCollectionId("");
        setBulkTags([]);
        fetchGallery();
      } else {
        alert("Bulk update failed: " + data.error);
      }
    } catch (e) {
      alert("Bulk update failed: " + e);
    } finally {
      setLoading(false);
    }
  };

  // Filter collections by upload category
  const filteredUploadCollections = collections.filter(
    (col) => col.category_id === Number(selectedCategoryForUpload)
  );

  // Filter collections by filter category
  const filteredFilterCollections = collections.filter(
    (col) => !selectedCategoryFilter || col.category_id === Number(selectedCategoryFilter)
  );

  // Filter collections by bulk category
  const filteredBulkCollections = collections.filter(
    (col) => !bulkCategoryId || col.category_id === Number(bulkCategoryId)
  );

  // Filter collections by edit category
  const filteredEditCollections = collections.filter(
    (col) => !editCategoryId || col.category_id === Number(editCategoryId)
  );

  // Images for Auto-Slider (newest 5 verified wallpapers)
  const sliderImages = galleryImages.slice(0, 5);

  return (
    <div className="container">
      {/* Brand Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              background: "var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: "bold",
            }}
          >
            {(username?.trim()?.[0] ?? "A").toUpperCase()}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.8rem" }}>{username}'s Dashboard</h1>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Wallpaper Sync Administration Portal
            </p>
          </div>
        </div>
        <Link href="/docs" style={{
          padding: "6px 16px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          color: "var(--foreground)",
          textDecoration: "none",
          fontSize: "0.9rem",
          fontWeight: 500
        }}>
          Documentation
        </Link>
      </div>

      {/* Visual System Architecture Mindmap (Collapsible) */}
      <div className="card" style={{ marginBottom: "2rem", padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setShowMindmap(!showMindmap)}>
          <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            🧠 <span>System Hierarchy & Architecture Map</span>
          </h3>
          <button className="btn-secondary" style={{ padding: "4px 10px", fontSize: "0.8rem", borderRadius: "4px" }}>
            {showMindmap ? "Hide Map" : "Show Map"}
          </button>
        </div>

        {showMindmap && (
          <div className="mindmap-container" style={{ marginTop: "1.5rem" }}>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
              How the application structures data for synchronization between the dashboard and Electron desktop clients. 
              💡 <strong>Corrections Guide:</strong> If you make a mistake assigning a category, collection, or tag to a wallpaper, you can click the <strong>Edit</strong> button directly on its card in the gallery, or select multiple wallpapers and use the <strong>Bulk Edit Bar</strong> at the bottom of the page to re-assign them in one go.
            </p>
            
            <div className="mindmap-flex" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-around", gap: "2rem", position: "relative" }}>
              {/* Branch 1: The Core Hierarchy */}
              <div className="mindmap-branch" style={{ flex: "1 1 300px", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
                <h4 style={{ margin: "0 0 1rem 0", color: "var(--primary)", borderBottom: "1px dashed var(--border)", paddingBottom: "4px" }}>1. Core Data Hierarchy (1-to-Many)</h4>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", alignItems: "center" }}>
                  {/* Category Node */}
                  <div style={{ background: "rgba(26, 115, 232, 0.15)", border: "1px solid var(--primary)", borderRadius: "8px", padding: "10px 14px", width: "80%", textAlign: "center", position: "relative" }}>
                    <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--primary)", fontWeight: "bold" }}>Level 1: Category</div>
                    <strong style={{ fontSize: "0.95rem" }}>Anime / Game Art</strong>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>Broad thematic genres</div>
                  </div>

                  <div style={{ color: "var(--text-muted)", fontSize: "1.2rem" }}>⬇</div>

                  {/* Collection Node */}
                  <div style={{ background: "rgba(255, 159, 10, 0.12)", border: "1px solid var(--accent)", borderRadius: "8px", padding: "10px 14px", width: "80%", textAlign: "center" }}>
                    <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--accent)", fontWeight: "bold" }}>Level 2: Collection</div>
                    <strong style={{ fontSize: "0.95rem" }}>Naruto / Cyberpunk</strong>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>Specific nested albums</div>
                  </div>

                  <div style={{ color: "var(--text-muted)", fontSize: "1.2rem" }}>⬇</div>

                  {/* Wallpaper Node */}
                  <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: "8px", padding: "10px 14px", width: "80%", textAlign: "center" }}>
                    <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--foreground)", opacity: 0.6, fontWeight: "bold" }}>Level 3: Wallpaper</div>
                    <strong style={{ fontSize: "0.95rem" }}>naruto_rasengan.jpg</strong>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>Actual image file payload</div>
                  </div>
                </div>
              </div>

              {/* Branch 2: Many-to-Many Labels */}
              <div className="mindmap-branch" style={{ flex: "1 1 300px", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
                <h4 style={{ margin: "0 0 1rem 0", color: "#e8eaed", borderBottom: "1px dashed var(--border)", paddingBottom: "4px" }}>2. Tag Labeling (Many-to-Many)</h4>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", height: "100%", justifyContent: "center" }}>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
                    <span style={{ padding: "6px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid var(--border)", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "bold" }}>#4K</span>
                    <span style={{ padding: "6px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid var(--border)", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "bold" }}>#Dark</span>
                    <span style={{ padding: "6px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid var(--border)", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "bold" }}>#Minimal</span>
                  </div>

                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "10px 0" }}>🔗 Associated directly to</div>
                    <strong style={{ fontSize: "0.95rem", padding: "8px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: "6px", display: "inline-block" }}>
                      Any Wallpaper
                    </strong>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "6px" }}>
                      Allows cross-category filtering regardless of the folder/collection hierarchy.
                    </div>
                  </div>
                </div>
              </div>

              {/* Branch 3: Offline Sync Engine */}
              <div className="mindmap-branch" style={{ flex: "1 1 300px", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
                <h4 style={{ margin: "0 0 1rem 0", color: "#34a853", borderBottom: "1px dashed var(--border)", paddingBottom: "4px" }}>3. Offline-First Syncing Engine</h4>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontSize: "0.85rem", lineHeight: 1.5 }}>
                  <div style={{ padding: "8px 12px", background: "rgba(52, 168, 83, 0.12)", border: "1px solid #34a853", borderRadius: "6px" }}>
                    <strong>1. Local Actions (Offline)</strong><br />
                    Creating categories/collections or assigning tags saves to a local JSON cache immediately.
                  </div>
                  <div style={{ padding: "8px 12px", background: "rgba(52, 168, 83, 0.08)", border: "1px solid rgba(52, 168, 83, 0.3)", borderRadius: "6px" }}>
                    <strong>2. Synchronization Queue</strong><br />
                    Pending modifications are pushed into a local `sync_queue` in priority order (categories ➔ collections ➔ tags ➔ wallpaper relationships).
                  </div>
                  <div style={{ padding: "8px 12px", background: "rgba(26, 115, 232, 0.08)", border: "1px solid rgba(26, 115, 232, 0.3)", borderRadius: "6px" }}>
                    <strong>3. DB Sync (Online)</strong><br />
                    When connection is established, the client flushes queue objects to Supabase APIs and updates local IDs to match server database primary keys.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      

      {/* Accessible Auto-Slider for recently added wallpapers */}
      {sliderImages.length > 0 && (
        <section
          className="slider-container"
          role="region"
          aria-roledescription="carousel"
          aria-label="Recently Uploaded Wallpapers Slider"
          onMouseEnter={() => setSliderPaused(true)}
          onMouseLeave={() => setSliderPaused(false)}
          onFocus={() => setSliderPaused(true)}
          onBlur={() => setSliderPaused(false)}
        >
          {sliderImages.map((img, idx) => (
            <div
              key={img.id}
              className={`slide ${idx === sliderIndex ? "active" : ""}`}
              aria-hidden={idx !== sliderIndex}
              role="group"
              aria-roledescription="slide"
              aria-label={`${idx + 1} of ${sliderImages.length}`}
            >
              <img src={img.url} className="slide-img" alt={img.file_name || "Featured Wallpaper"} />
              <div className="slide-overlay"></div>
              <div className="slide-content">
                <div className="badge badge-category" style={{ marginBottom: "0.5rem" }}>
                  {img.collection_details?.category_name || "Uncategorized"}
                </div>
                <h3 className="slide-title">{img.file_name}</h3>
                <p className="slide-desc">
                  Collection: {img.collection_details?.name || "None"} • Hash: {img.hash?.slice(0, 8)}...
                </p>
              </div>
            </div>
          ))}

          {/* Navigation Controls */}
          <button
            className="slider-nav slider-nav-prev"
            type="button"
            aria-label="Previous Slide"
            onClick={() =>
              setSliderIndex((prev) => (prev - 1 + sliderImages.length) % sliderImages.length)
            }
          >
            ◀
          </button>
          <button
            className="slider-nav slider-nav-next"
            type="button"
            aria-label="Next Slide"
            onClick={() => setSliderIndex((prev) => (prev + 1) % sliderImages.length)}
          >
            ▶
          </button>

          {/* Bottom Dot controls & Pause button */}
          <div className="slider-controls">
            <div className="slider-dots" role="tablist" aria-label="Slides Selector">
              {sliderImages.map((_, idx) => (
                <button
                  key={idx}
                  role="tab"
                  aria-selected={idx === sliderIndex}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`slider-dot ${idx === sliderIndex ? "active" : ""}`}
                  type="button"
                  onClick={() => setSliderIndex(idx)}
                ></button>
              ))}
            </div>
            <button
              className="slider-pause-btn"
              type="button"
              onClick={() => setSliderPaused((prev) => !prev)}
            >
              {sliderPaused ? "▶ Autoplay" : "⏸ Pause"}
            </button>
          </div>
        </section>
      )}

      {/* Main Top Grid Section: Upload controls and Application Releases side-by-side */}
      <div className="grid-two-columns" style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
        gap: "2rem",
        marginBottom: "2rem"
      }}>
        {/* Upload Wallpaper Card */}
        <div className="card" style={{ margin: 0, display: "flex", flexDirection: "column" }}>
          <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>Upload New Wallpapers</h2>
          <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <div className="form-group" style={{ flex: "1 1 200px" }}>
                <label>Admin Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              {/* Category selection */}
              <div className="form-group" style={{ flex: "1 1 250px" }}>
                <label style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Category</span>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: "0 6px", fontSize: "0.75rem", borderRadius: 4 }}
                    onClick={() => setShowNewCatInput((prev) => !prev)}
                  >
                    {showNewCatInput ? "Cancel" : "+ New"}
                  </button>
                </label>
                {showNewCatInput ? (
                  <div style={{ display: "flex", gap: "4px" }}>
                    <input
                      type="text"
                      placeholder="New category name"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                    />
                    <button type="button" className="btn" onClick={handleCreateCategory}>
                      Create
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedCategoryForUpload}
                    onChange={(e) => {
                      setSelectedCategoryForUpload(e.target.value);
                      setSelectedCollectionForUpload("");
                    }}
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Collection selection (filtered by Category) */}
              <div className="form-group" style={{ flex: "1 1 250px" }}>
                <label style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Collection (Series)</span>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: "0 6px", fontSize: "0.75rem", borderRadius: 4 }}
                    disabled={!selectedCategoryForUpload}
                    onClick={() => setShowNewColInput((prev) => !prev)}
                  >
                    {showNewColInput ? "Cancel" : "+ New"}
                  </button>
                </label>
                {showNewColInput ? (
                  <div style={{ display: "flex", gap: "4px" }}>
                    <input
                      type="text"
                      placeholder="New collection name"
                      value={newColName}
                      onChange={(e) => setNewColName(e.target.value)}
                    />
                    <button type="button" className="btn" onClick={handleCreateCollection}>
                      Create
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedCollectionForUpload}
                    onChange={(e) => setSelectedCollectionForUpload(e.target.value)}
                    disabled={!selectedCategoryForUpload}
                  >
                    <option value="">
                      {selectedCategoryForUpload ? "-- Select Collection --" : "Select Category First"}
                    </option>
                    {filteredUploadCollections.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.name}
                      </option>
                    ))}
                  </select>
                )}
                {selectedCategoryForUpload && !selectedCollectionForUpload && (
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    💡 Leave empty to assign to the default collection for "{categories.find(c => String(c.id) === selectedCategoryForUpload)?.name}".
                  </p>
                )}
              </div>
            </div>

            {/* Tags Selection & Tag Creator */}
            <div className="form-group">
              <label>Tags Selection</label>
              <input
                type="text"
                placeholder="🔍 Search tags..."
                value={tagSearchUpload}
                onChange={(e) => setTagSearchUpload(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "rgba(0,0,0,0.2)",
                  color: "white",
                  fontSize: "0.85rem",
                  marginBottom: "0.5rem",
                }}
              />
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  padding: "8px",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  background: "rgba(0,0,0,0.15)",
                  marginBottom: "0.5rem",
                  maxHeight: "120px",
                  overflowY: "auto",
                }}
              >
                {tags
                  .filter((t) =>
                    t.name.toLowerCase().includes(tagSearchUpload.toLowerCase()) ||
                    selectedTagsForUpload.includes(t.id)
                  )
                  .map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleToggleTagUpload(tag.id)}
                      className={`tag-chip ${selectedTagsForUpload.includes(tag.id) ? "active" : ""}`}
                    >
                      {tag.name}
                    </button>
                  ))}
                {tags.length === 0 && (
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    No tags created yet.
                  </span>
                )}
              </div>
              {/* Inline tag creator */}
              <div style={{ display: "flex", gap: "6px", maxWidth: 400 }}>
                <input
                  type="text"
                  placeholder="Add new tag"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  style={{ padding: "4px 8px", fontSize: "0.85rem" }}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: "4px 12px", fontSize: "0.85rem" }}
                  onClick={handleCreateTag}
                >
                  + Add Tag
                </button>
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div className="form-group">
              <label>Wallpaper Images</label>
              <div
                className={`dropzone ${isDragging ? "dragging" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <p>Drag & Drop landscape images here or click to browse</p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                />
              </div>
            </div>

            {/* Selected File list */}
            {files.length > 0 && (
              <div className="file-list">
                <h4 style={{ margin: 0 }}>Selected Files ({files.length}):</h4>
                <ul>
                  {files.map((f, i) => (
                    <li key={i}>
                      <div className="file-list-header">
                        <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{f.name}</span>
                        <button type="button" onClick={() => removeFile(i)}>
                          ✕ Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="submit"
              className="btn"
              disabled={loading || files.length === 0}
              style={{ width: "100%", marginTop: "auto" }}
            >
              {loading ? `Processing Uploads...` : `Upload ${files.length} Wallpaper(s)`}
            </button>

            {messages.length > 0 && (
              <div
                className="messages"
                style={{
                  marginTop: "1rem",
                  padding: "1rem",
                  background: "rgba(0,0,0,0.2)",
                  borderRadius: 8,
                }}
              >
                {messages.map((msg, i) => (
                  <p key={i} style={{ margin: "0.5rem 0", fontSize: "0.9rem" }}>
                    {msg}
                  </p>
                ))}
              </div>
            )}
          </form>
        </div>

        {/* GitHub Releases Card */}
        <div className="card" style={{ margin: 0, display: "flex", flexDirection: "column", height: "100%" }}>
          <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>Latest Application Releases</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
            Releases compiled and published dynamically from GitHub Actions build releases pipeline.
          </p>
          <div style={{ flex: 1, overflowY: "auto", maxHeight: "490px", paddingRight: "6px" }}>
            {releases.map((rel) => {
              const exeAsset = rel.assets?.find((a: any) => a.name.endsWith(".exe"));
              return (
                <div key={rel.id} className="release-item">
                  <div className="release-header">
                    <span className="release-tag">{rel.tag_name}</span>
                    <span className="release-date">{new Date(rel.published_at).toLocaleDateString()}</span>
                  </div>
                  <strong style={{ fontSize: "0.95rem", display: "block", marginBottom: "4px" }}>
                    {rel.name || `Release ${rel.tag_name}`}
                  </strong>
                  {exeAsset && (
                    <a href={exeAsset.browser_download_url} className="release-download-btn" target="_blank" rel="noopener noreferrer">
                      Download Windows Installer ({Math.round(exeAsset.size / (1024 * 1024) * 10) / 10} MB)
                    </a>
                  )}
                  {rel.body && (
                    <div className="release-notes-box">
                      {rel.body}
                    </div>
                  )}
                </div>
              );
            })}
            {releases.length === 0 && (
              <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Checking GitHub releases...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gallery Filter & Grid Card */}
      <div className="card">
        {/* Header and counter */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <h2 style={{ margin: 0 }}>Manage Collection</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            {(() => {
              const unindexedCount = galleryImages.filter(
                (wp) => wp.status !== "deleted" && (!wp.indexed_at || wp.status === "uploaded")
              ).length;
              
              return (
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    {galleryImages.length} wallpapers ({unindexedCount} unindexed)
                  </span>
                  {unindexedCount > 0 && (
                    <button
                      type="button"
                      className="btn"
                      style={{ 
                        padding: "6px 12px", 
                        fontSize: "0.85rem", 
                        background: "var(--primary)", 
                        border: "none", 
                        borderRadius: "4px",
                        cursor: "pointer"
                      }}
                      disabled={indexingLoading || indexingProgress?.active}
                      onClick={() => handleTriggerIndexing(false)}
                    >
                      {indexingLoading && !indexingProgress?.active ? "Triggering..." : "⚡ Run AI Indexing"}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn"
                    style={{ 
                      padding: "6px 12px", 
                      fontSize: "0.85rem", 
                      background: "rgba(255, 255, 255, 0.05)", 
                      border: "1px solid var(--border)", 
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                    disabled={indexingLoading || indexingProgress?.active}
                    onClick={() => handleTriggerIndexing(true)}
                  >
                    {indexingLoading && !indexingProgress?.active ? "Triggering..." : "🔄 Re-index All"}
                  </button>
                </div>
              );
            })()}
          </div>
        </div>

        {indexingMessage && (
          <div
            style={{
              padding: "10px 14px",
              background: indexingMessage.startsWith("Error") ? "rgba(219, 68, 85, 0.15)" : "rgba(52, 168, 83, 0.15)",
              border: indexingMessage.startsWith("Error") ? "1px solid #db4455" : "1px solid #34a853",
              borderRadius: "6px",
              fontSize: "0.9rem",
              marginBottom: "1rem",
              color: "var(--foreground)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <span>{indexingMessage}</span>
            <button
              type="button"
              onClick={() => setIndexingMessage(null)}
              style={{ background: "none", border: "none", color: "var(--foreground)", cursor: "pointer", fontSize: "1rem" }}
            >
              ✕
            </button>
          </div>
        )}

        {indexingProgress && showProgressCard && (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "1rem",
              marginBottom: "1.5rem",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontWeight: 600, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>
                  {indexingProgress.active
                    ? "⚡ AI Indexing Progress"
                    : (indexingProgress.processed + indexingProgress.failed >= indexingProgress.total)
                      ? "✅ AI Indexing Completed"
                      : "🛑 AI Indexing Stopped"
                  }
                </span>
                {indexingProgress.active && (
                  <span className="spinner" style={{
                    width: "12px",
                    height: "12px",
                    border: "2px solid rgba(255,255,255,0.2)",
                    borderTopColor: "var(--primary)",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                  }}></span>
                )}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "0.9rem", fontWeight: "bold", color: "var(--primary)" }}>
                  {Math.round(((indexingProgress.processed + indexingProgress.failed) / (indexingProgress.total || 1)) * 100)}% ({indexingProgress.processed + indexingProgress.failed} / {indexingProgress.total})
                </span>
                {indexingProgress.active ? (
                  <button
                    type="button"
                    style={{
                      padding: "4px 8px",
                      fontSize: "0.75rem",
                      background: "rgba(219, 68, 85, 0.2)",
                      border: "1px solid #db4455",
                      color: "#ff6b7b",
                      borderRadius: "4px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                    disabled={indexingLoading}
                    onClick={handleCancelIndexing}
                  >
                    🛑 Stop
                  </button>
                ) : (
                  <button
                    type="button"
                    style={{
                      padding: "4px 8px",
                      fontSize: "0.75rem",
                      background: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      color: "#fff",
                      borderRadius: "4px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                    onClick={() => setShowProgressCard(false)}
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
            
            {/* Progress Track */}
            <div style={{
              width: "100%",
              height: "8px",
              background: "rgba(255,255,255,0.1)",
              borderRadius: "4px",
              overflow: "hidden",
              marginBottom: "0.5rem",
              position: "relative"
            }}>
              <div style={{
                width: `${((indexingProgress.processed + indexingProgress.failed) / (indexingProgress.total || 1)) * 100}%`,
                height: "100%",
                background: "linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%)",
                borderRadius: "4px",
                transition: "width 0.4s ease-out"
              }}></div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)", flexWrap: "wrap", gap: "0.5rem" }}>
              <span>
                Processed: <strong style={{ color: "#34a853" }}>{indexingProgress.processed}</strong> • Failed: <strong style={{ color: "#db4455" }}>{indexingProgress.failed}</strong>
              </span>
              {indexingProgress.active && indexingProgress.currentWallpaper && (
                <span style={{ maxWidth: "60%", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                  Analyzing: <i>{indexingProgress.currentWallpaper}</i>
                </span>
              )}
            </div>
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}} />
          </div>
        )}

        {/* Dynamic Filter Controls */}
        <div className="filter-bar">
          <div className="filter-group">
            <label>Category:</label>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => {
                setSelectedCategoryFilter(e.target.value);
                setSelectedCollectionFilter(""); // Reset collection filter
              }}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Collection:</label>
            <select
              value={selectedCollectionFilter}
              onChange={(e) => setSelectedCollectionFilter(e.target.value)}
            >
              <option value="">All Collections</option>
              {filteredFilterCollections.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group" style={{ width: "100%" }}>
            <label style={{ display: "block", marginBottom: "4px" }}>Filter by Tags:</label>
            <input
              type="text"
              placeholder="🔍 Search tags to filter..."
              value={tagSearchFilter}
              onChange={(e) => setTagSearchFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                background: "var(--background)",
                color: "inherit",
                fontSize: "0.85rem",
                marginBottom: "0.5rem",
              }}
            />
            <div className="tags-filter-list" style={{ maxHeight: "120px", overflowY: "auto", padding: "8px", border: "1px solid var(--border)", borderRadius: "6px", background: "rgba(0,0,0,0.15)", width: "100%" }}>
              {tags
                .filter((t) =>
                  t.name.toLowerCase().includes(tagSearchFilter.toLowerCase()) ||
                  selectedTagFilters.includes(t.id)
                )
                .map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleToggleTagFilter(tag.id)}
                    className={`tag-chip ${selectedTagFilters.includes(tag.id) ? "active" : ""}`}
                  >
                    {tag.name}
                  </button>
                ))}
              {tags.length === 0 && (
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  No tags available.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Gallery selection controls */}
        {galleryImages.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <button type="button" className="btn-secondary" onClick={handleSelectAllImages}>
              {selectedImageIds.length === galleryImages.length
                ? "Deselect All"
                : `Select All for Bulk Edit (${selectedImageIds.length})`}
            </button>
          </div>
        )}

        {/* Wallpaper Image Grid */}
        <div className="grid">
          {galleryImages.map((img) => {
            const isSelected = selectedImageIds.includes(img.id);
            return (
              <div key={img.id} className={`gallery-item ${isSelected ? "selected" : ""}`}>
                {/* Selection Checkbox */}
                <div className="select-overlay">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectImage(img.id)}
                    className="select-checkbox"
                  />
                </div>

                <img src={img.url} className="img-preview" alt={img.name} />

                <div className="item-info">
                  <div className="item-name" title={img.name}>
                    {img.file_name || img.name}
                  </div>
                  <div className="item-meta">
                    <span className="badge badge-category">
                      {img.collection_details?.category_name || "No Category"}
                    </span>
                    <span className="badge">
                      {img.collection_details?.name || "No Collection"}
                    </span>
                    {img.tags &&
                      img.tags.map((t: any) => (
                        <span key={t.id} className="badge">
                          #{t.name}
                        </span>
                      ))}
                  </div>

                  {/* Individual actions */}
                  <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
                    <button
                      onClick={() => handleStartEdit(img)}
                      className="btn-secondary"
                      style={{
                        flex: 1,
                        border: "1px solid var(--border)",
                        borderRadius: 4,
                        padding: "4px 8px",
                        cursor: "pointer",
                        fontWeight: "bold",
                        fontSize: "0.75rem",
                        color: "var(--foreground)",
                        background: "rgba(255,255,255,0.05)",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteImage(img.name)}
                      className="btn-danger"
                      style={{
                        flex: 1,
                        border: "none",
                        borderRadius: 4,
                        padding: "4px 8px",
                        cursor: "pointer",
                        fontWeight: "bold",
                        fontSize: "0.75rem",
                        color: "white",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {galleryImages.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text-muted)" }}>
            <h3>No wallpapers match your filters</h3>
            <p>Upload new files or clear filters to see your collection</p>
          </div>
        )}
      </div>

      {/* Analytics & User Reviews Section */}
      <div className="card" style={{ marginTop: "2rem" }}>
        <h2 style={{ margin: 0, marginBottom: "1rem" }}>User Reviews & Analytics</h2>
        
        <div style={{
          display: "flex",
          gap: "2rem",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "1.5rem",
          marginBottom: "1.5rem"
        }}>
          <div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Average Rating</div>
            <div style={{ fontSize: "2.5rem", fontWeight: "bold", color: "var(--accent)", marginTop: "0.25rem" }}>
              {reviews.length > 0
                ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
                : "0.0"}
              <span style={{ fontSize: "1.5rem", color: "var(--text-muted)" }}> / 5</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Total Reviews</div>
            <div style={{ fontSize: "2.5rem", fontWeight: "bold", marginTop: "0.25rem" }}>
              {reviews.length}
            </div>
          </div>
        </div>

        <div style={{
          maxHeight: "350px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          paddingRight: "6px"
        }}>
          {reviews.map((r) => (
            <div key={r.id} style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "12px 16px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <strong style={{ fontSize: "0.95rem" }}>{r.reviewer_name}</strong>
                <span style={{ color: "#ff9f0a", fontWeight: "bold", fontSize: "0.9rem" }}>
                  {"★".repeat(r.rating) + "☆".repeat(5 - r.rating)}
                </span>
              </div>
              {r.comment ? (
                <p style={{ margin: 0, fontSize: "0.9rem", color: "rgba(255,255,255,0.85)" }}>{r.comment}</p>
              ) : (
                <em style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No comment provided</em>
              )}
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "6px", textAlign: "right" }}>
                {new Date(r.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}

          {reviews.length === 0 && (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
              No user reviews submitted yet. Feedback requested in desktop client.
            </div>
          )}
        </div>
      </div>

      {/* Floating Bulk Edit action bar (appears when items are selected) */}
      {selectedImageIds.length > 0 && (
        <div className="bulk-actions-bar">
          <div>
            <strong style={{ fontSize: "1.1rem" }}>
              {selectedImageIds.length} item(s) selected
            </strong>
          </div>
          <div className="bulk-actions-controls">
            {/* Assign Category */}
            <div>
              <select
                value={bulkCategoryId}
                onChange={(e) => {
                  setBulkCategoryId(e.target.value);
                  setBulkCollectionId("");
                }}
                style={{ padding: "6px 12px", borderRadius: 4, border: "1px solid var(--border)", background: "#1a1a1a", color: "#e0e0e0" }}
              >
                <option value="">-- Assign Category --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Assign collection */}
            <div>
              <select
                value={bulkCollectionId}
                onChange={(e) => setBulkCollectionId(e.target.value)}
                style={{ padding: "6px 12px", borderRadius: 4, border: "1px solid var(--border)", background: "#1a1a1a", color: "#e0e0e0" }}
                disabled={!bulkCategoryId}
              >
                <option value="">
                  {bulkCategoryId ? "-- Assign Collection --" : "Select Category First"}
                </option>
                {filteredBulkCollections.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Bulk Tags (chips toggle) */}
            <div style={{ width: "100%", maxWidth: 300 }}>
              <label style={{ display: "block", fontSize: "0.8rem", marginBottom: "4px" }}>Bulk Tags:</label>
              <input
                type="text"
                placeholder="🔍 Search tags..."
                value={tagSearchBulk}
                onChange={(e) => setTagSearchBulk(e.target.value)}
                style={{
                  width: "100%",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  border: "1px solid var(--border)",
                  background: "#1a1a1a",
                  color: "#e0e0e0",
                  fontSize: "0.75rem",
                  marginBottom: "0.5rem",
                }}
              />
              <div style={{
                display: "flex",
                gap: "4px",
                flexWrap: "wrap",
                maxHeight: "100px",
                overflowY: "auto",
                padding: "6px",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                background: "rgba(0,0,0,0.15)"
              }}>
                {tags
                  .filter((t) =>
                    t.name.toLowerCase().includes(tagSearchBulk.toLowerCase()) ||
                    bulkTags.includes(t.id)
                  )
                  .map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`tag-chip ${bulkTags.includes(t.id) ? "active" : ""}`}
                      onClick={() =>
                        setBulkTags((prev) =>
                          prev.includes(t.id) ? prev.filter((id) => id !== t.id) : [...prev, t.id]
                        )
                      }
                      style={{ padding: "2px 8px", fontSize: "0.75rem" }}
                    >
                      {t.name}
                    </button>
                  ))}
              </div>
            </div>

            <button type="button" className="btn" onClick={handleApplyBulkUpdate} disabled={loading}>
              Apply Changes
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSelectedImageIds([]);
                setBulkCategoryId("");
                setBulkCollectionId("");
                setBulkTags([]);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Individual Wallpaper Edit Modal */}
      {editingWallpaper && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div className="card" style={{
            width: "100%",
            maxWidth: "500px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "1.5rem 2rem",
            boxShadow: "var(--shadow)",
            position: "relative",
            margin: 0
          }}>
            <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>Edit Wallpaper Metadata</h3>
            
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem", wordBreak: "break-all" }}>
              File: {editingWallpaper.file_name || editingWallpaper.name}
            </p>

            <div className="form-group">
              <label>Category</label>
              <select
                value={editCategoryId}
                onChange={(e) => {
                  setEditCategoryId(e.target.value);
                  setEditCollectionId(""); // Clear collection on category change
                }}
              >
                <option value="">-- No Category --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Collection (Series)</label>
              <select
                value={editCollectionId}
                onChange={(e) => setEditCollectionId(e.target.value)}
                disabled={!editCategoryId}
              >
                <option value="">
                  {editCategoryId ? "-- No Collection (Assign Default) --" : "Select Category First"}
                </option>
                {filteredEditCollections.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
              {editCategoryId && !editCollectionId && (
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  💡 Will assign to the default collection for "{categories.find(c => String(c.id) === editCategoryId)?.name}".
                </p>
              )}
            </div>

            <div className="form-group">
              <label>Tags Selection</label>
              <input
                type="text"
                placeholder="🔍 Search tags..."
                value={tagSearchEdit}
                onChange={(e) => setTagSearchEdit(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "rgba(0,0,0,0.2)",
                  color: "white",
                  fontSize: "0.85rem",
                  marginBottom: "0.5rem",
                }}
              />
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
                padding: "8px",
                border: "1px solid var(--border)",
                borderRadius: 6,
                background: "rgba(0,0,0,0.15)",
                maxHeight: "100px",
                overflowY: "auto"
              }}>
                {tags
                  .filter((t) =>
                    t.name.toLowerCase().includes(tagSearchEdit.toLowerCase()) ||
                    editTags.includes(t.id)
                  )
                  .map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`tag-chip ${editTags.includes(t.id) ? "active" : ""}`}
                      onClick={() =>
                        setEditTags((prev) =>
                          prev.includes(t.id) ? prev.filter((id) => id !== t.id) : [...prev, t.id]
                        )
                      }
                      style={{ padding: "2px 8px", fontSize: "0.75rem" }}
                    >
                      {t.name}
                    </button>
                  ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "2rem" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setEditingWallpaper(null)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleSaveEdit}
                disabled={loading}
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
