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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStyleFilter, setSelectedStyleFilter] = useState("");
  const [selectedMoodFilter, setSelectedMoodFilter] = useState("");
  const [selectedColorFilter, setSelectedColorFilter] = useState("");

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
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCharacters, setEditCharacters] = useState("");
  const [editFranchises, setEditFranchises] = useState("");
  const [editStyles, setEditStyles] = useState("");
  const [editMoods, setEditMoods] = useState("");
  const [editPrimaryColor, setEditPrimaryColor] = useState("");
  const [editCollectionIds, setEditCollectionIds] = useState<number[]>([]);
  const [editCategoryId, setEditCategoryId] = useState<string>("");
  const [editTags, setEditTags] = useState<number[]>([]);

  // Wallpaper Preview Modal State
  const [previewWallpaper, setPreviewWallpaper] = useState<any | null>(null);

  // Recommendation Engine State
  const [recommendations, setRecommendations] = useState<any[]>([]);

  // AI Operations States
  const [indexingLoading, setIndexingLoading] = useState(false);
  const [indexingMessage, setIndexingMessage] = useState<string | null>(null);
  const [indexingProgress, setIndexingProgress] = useState<any>(null);
  const [showProgressCard, setShowProgressCard] = useState(false);
  const [visionProvider, setVisionProvider] = useState<"gemini" | "imagga">("imagga");

  const [migrationLoading, setMigrationLoading] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState<any>(null);
  const [showMigrationCard, setShowMigrationCard] = useState(false);

  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryMessage, setDiscoveryMessage] = useState<string | null>(null);

  // Check Phase 1 Migration Status
  const checkMigrationStatus = async () => {
    try {
      const res = await fetch("/api/wallpapers/migrate");
      if (res.ok) {
        const data = await res.json();
        setMigrationProgress(data);
        if (data && data.active) {
          setShowMigrationCard(true);
        }
        return data;
      }
    } catch (e) {
      console.error("Failed to check migration status:", e);
    }
    return null;
  };

  // Check Batch Indexing Status
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
    checkMigrationStatus();

    const interval = setInterval(async () => {
      const idxProgress = await checkIndexingStatus();
      const migProgress = await checkMigrationStatus();

      if (
        (idxProgress && !idxProgress.active && indexingProgress?.active) ||
        (migProgress && !migProgress.active && migrationProgress?.active)
      ) {
        fetchGallery();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [indexingProgress?.active, migrationProgress?.active]);

  // Trigger Phase 1 Migration
  const handleTriggerMigration = async (forceAll = false) => {
    setMigrationLoading(true);
    setDiscoveryMessage(null);
    try {
      const res = await fetch("/api/wallpapers/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceAll, provider: visionProvider })
      });
      const data = await res.json();
      if (res.ok) {
        setDiscoveryMessage(`Success: ${data.message}`);
        await checkMigrationStatus();
      } else {
        setDiscoveryMessage(`Error: ${data.error || "Failed to trigger library migration"}`);
      }
    } catch (err: any) {
      setDiscoveryMessage(`Error: ${err.message || err}`);
    } finally {
      setMigrationLoading(false);
    }
  };

  const handleCancelMigration = async () => {
    setMigrationLoading(true);
    try {
      const res = await fetch("/api/wallpapers/migrate", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setDiscoveryMessage("Success: Library migration was aborted.");
        await checkMigrationStatus();
      } else {
        setDiscoveryMessage(`Error: ${data.error || "Failed to abort migration"}`);
      }
    } catch (err: any) {
      setDiscoveryMessage(`Error: ${err.message || err}`);
    } finally {
      setMigrationLoading(false);
    }
  };

  // Trigger Phase 3 Discovery
  const handleTriggerDiscovery = async () => {
    setDiscoveryLoading(true);
    setDiscoveryMessage(null);
    try {
      const res = await fetch("/api/collections/discover", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setDiscoveryMessage(`Success: ${data.message}`);
        await fetchMetadata();
        await fetchGallery();
      } else {
        setDiscoveryMessage(`Error: ${data.error || "Failed to discover collections"}`);
      }
    } catch (err: any) {
      setDiscoveryMessage(`Error: ${err.message || err}`);
    } finally {
      setDiscoveryLoading(false);
    }
  };

  // Trigger manual collection re-assignments
  const handleReassignCollections = async () => {
    setDiscoveryLoading(true);
    setDiscoveryMessage(null);
    try {
      const res = await fetch("/api/wallpapers/assign-collections", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setDiscoveryMessage(`Success: ${data.message}`);
        await fetchGallery();
      } else {
        setDiscoveryMessage(`Error: ${data.error || "Failed to assign collections"}`);
      }
    } catch (err: any) {
      setDiscoveryMessage(`Error: ${err.message || err}`);
    } finally {
      setDiscoveryLoading(false);
    }
  };

  const handleTriggerIndexing = async (reindexAll = false) => {
    setIndexingLoading(true);
    setIndexingMessage(null);
    try {
      const res = await fetch("/api/wallpapers/batch-index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reindexAll, provider: visionProvider }),
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
      const res = await fetch("/api/wallpapers/batch-index", { method: "DELETE" });
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
      if (selectedCategoryFilter) queryStr += `category=${selectedCategoryFilter}&`;
      if (selectedCollectionFilter) queryStr += `collection=${selectedCollectionFilter}&`;
      if (selectedTagFilters.length > 0) queryStr += `tags=${selectedTagFilters.join(",")}&`;
      if (searchQuery) queryStr += `q=${encodeURIComponent(searchQuery)}&`;
      if (selectedStyleFilter) queryStr += `style=${encodeURIComponent(selectedStyleFilter)}&`;
      if (selectedMoodFilter) queryStr += `mood=${encodeURIComponent(selectedMoodFilter)}&`;
      if (selectedColorFilter) queryStr += `color=${encodeURIComponent(selectedColorFilter)}&`;

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

  // RECOMMENDATION ENGINE (Local-Storage & Metadata overlaps)
  const trackInteraction = (wallpaper: any, type: "view" | "download" | "favorite") => {
    if (typeof window === "undefined" || !wallpaper) return;
    
    const historyRaw = localStorage.getItem("interaction_history");
    const history = historyRaw
      ? JSON.parse(historyRaw)
      : { downloads: [], favorites: [], views: [] };

    const listKey = type === "view" ? "views" : type === "download" ? "downloads" : "favorites";
    
    if (!history[listKey].includes(wallpaper.id)) {
      history[listKey].push(wallpaper.id);
      localStorage.setItem("interaction_history", JSON.stringify(history));
    }

    const descriptorsRaw = localStorage.getItem("interaction_descriptors");
    const descriptors = descriptorsRaw
      ? JSON.parse(descriptorsRaw)
      : { tags: {}, franchises: {}, characters: {} };

    const addValues = (arr: string[], map: Record<string, number>, multiplier: number) => {
      arr.forEach((v) => {
        const val = v.toLowerCase().trim();
        map[val] = (map[val] || 0) + multiplier;
      });
    };

    const multiplier = type === "favorite" ? 3 : type === "download" ? 2 : 1;
    if (Array.isArray(wallpaper.characters)) addValues(wallpaper.characters, descriptors.characters, multiplier);
    if (Array.isArray(wallpaper.franchises)) addValues(wallpaper.franchises, descriptors.franchises, multiplier);
    if (Array.isArray(wallpaper.tags)) {
      addValues(wallpaper.tags.map((t: any) => t.name || t), descriptors.tags, multiplier);
    }

    localStorage.setItem("interaction_descriptors", JSON.stringify(descriptors));
    computeRecommendations(galleryImages);
  };

  const computeRecommendations = (wps: any[]) => {
    if (typeof window === "undefined" || !wps || wps.length === 0) return;
    
    const historyRaw = localStorage.getItem("interaction_history");
    if (!historyRaw) return;
    const history = JSON.parse(historyRaw);
    const interactedIds = new Set([
      ...history.downloads,
      ...history.favorites,
      ...history.views
    ]);

    const descriptorsRaw = localStorage.getItem("interaction_descriptors");
    if (!descriptorsRaw) return;
    const descriptors = JSON.parse(descriptorsRaw);

    const scored = wps
      .filter((wp) => !interactedIds.has(wp.id))
      .map((wp) => {
        let score = 0;
        
        if (Array.isArray(wp.franchises)) {
          wp.franchises.forEach((f: string) => {
            score += (descriptors.franchises[f.toLowerCase().trim()] || 0) * 3;
          });
        }
        if (Array.isArray(wp.characters)) {
          wp.characters.forEach((c: string) => {
            score += (descriptors.characters[c.toLowerCase().trim()] || 0) * 2;
          });
        }
        if (Array.isArray(wp.tags)) {
          wp.tags.forEach((t: any) => {
            const name = (t.name || t).toLowerCase().trim();
            score += (descriptors.tags[name] || 0) * 1;
          });
        }

        return { ...wp, recommendation_score: score };
      })
      .filter((wp) => wp.recommendation_score > 0)
      .sort((a, b) => b.recommendation_score - a.recommendation_score)
      .slice(0, 5);

    setRecommendations(scored);
  };

  const toggleFavoriteLocal = (wallpaper: any) => {
    if (typeof window === "undefined" || !wallpaper) return;
    const historyRaw = localStorage.getItem("interaction_history");
    const history = historyRaw
      ? JSON.parse(historyRaw)
      : { downloads: [], favorites: [], views: [] };

    const index = history.favorites.indexOf(wallpaper.id);
    if (index > -1) {
      history.favorites.splice(index, 1);
      localStorage.setItem("interaction_history", JSON.stringify(history));
      computeRecommendations(galleryImages);
    } else {
      trackInteraction(wallpaper, "favorite");
    }
    fetchGallery();
  };

  const isFavorited = (id: string) => {
    if (typeof window === "undefined") return false;
    const historyRaw = localStorage.getItem("interaction_history");
    if (!historyRaw) return false;
    const history = JSON.parse(historyRaw);
    return history.favorites?.includes(id);
  };

  useEffect(() => {
    fetchMetadata();
    fetchReviews();
    fetchReleases();
  }, []);

  useEffect(() => {
    fetchGallery();
    setSelectedImageIds([]);
  }, [
    selectedCategoryFilter,
    selectedCollectionFilter,
    selectedTagFilters,
    searchQuery,
    selectedStyleFilter,
    selectedMoodFilter,
    selectedColorFilter
  ]);

  useEffect(() => {
    if (galleryImages.length > 0) {
      computeRecommendations(galleryImages);
    }
  }, [galleryImages]);

  // Setup auto-slide timer
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
        if (ratio >= 0.5 && ratio <= 3.0) {
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
        newMessages.push(`❌ ${file.name} ignored: Extreme aspect ratio. Please upload a desktop wallpaper styled image.`);
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
      formData.append("provider", visionProvider);

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
        setSelectedTagsForUpload((prev) => [...prev, data.tag.id]);
      } else {
        alert("Failed to create tag: " + data.error);
      }
    } catch (e) {
      alert("Error: " + e);
    }
  };

  const handleToggleTagFilter = (tagId: number) => {
    setSelectedTagFilters((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleToggleTagUpload = (tagId: number) => {
    setSelectedTagsForUpload((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

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

  const handleStartEdit = (img: any) => {
    trackInteraction(img, "view");
    setEditingWallpaper(img);
    setEditTitle(img.title || "");
    setEditDescription(img.description || "");
    setEditCharacters(Array.isArray(img.characters) ? img.characters.join(", ") : "");
    setEditFranchises(Array.isArray(img.franchises) ? img.franchises.join(", ") : "");
    setEditStyles(Array.isArray(img.styles) ? img.styles.join(", ") : img.style || "");
    setEditMoods(Array.isArray(img.moods) ? img.moods.join(", ") : "");
    setEditPrimaryColor(img.primary_color || "");
    setEditTags(img.tags ? img.tags.map((t: any) => t.id) : []);

    const colIds = Array.isArray(img.collections)
      ? img.collections.map((c: any) => c.id)
      : img.collection_id
        ? [Number(img.collection_id)]
        : [];
    setEditCollectionIds(colIds);
    setEditCategoryId(img.collection_details?.category_id ? String(img.collection_details.category_id) : "");
  };

  const handleSaveEdit = async () => {
    if (!editingWallpaper) return;
    setLoading(true);
    try {
      const itemUpdate: any = {
        id: editingWallpaper.id,
        title: editTitle.trim(),
        description: editDescription.trim(),
        characters: editCharacters.split(",").map((s) => s.trim()).filter(Boolean),
        franchises: editFranchises.split(",").map((s) => s.trim()).filter(Boolean),
        styles: editStyles.split(",").map((s) => s.trim()).filter(Boolean),
        moods: editMoods.split(",").map((s) => s.trim()).filter(Boolean),
        primary_color: editPrimaryColor.trim(),
        collection_ids: editCollectionIds,
        tags: editTags
      };

      const res = await fetch("/api/wallpapers/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [itemUpdate] }),
      });
      if (res.ok) {
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
          itemUpdate.collection_ids = [Number(bulkCollectionId)];
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

  const toggleCollectionEditCheckbox = (colId: number) => {
    setEditCollectionIds((prev) =>
      prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId]
    );
  };

  const filteredUploadCollections = collections;
  const filteredFilterCollections = collections;
  const filteredBulkCollections = collections;

  const sliderImages = galleryImages.slice(0, 5);

  return (
    <div className="container" style={{ paddingBottom: "100px" }}>
      {/* Brand Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: "bold",
              boxShadow: "0 0 15px rgba(26,115,232,0.4)"
            }}
          >
            {(username?.trim()?.[0] ?? "A").toUpperCase()}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.8rem", letterSpacing: "-0.5px" }}>{username}'s Dashboard</h1>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Wallpaper Sync Administration Portal • v4.0 AI Architecture
            </p>
          </div>
        </div>
        <Link href="/docs" style={{
          padding: "8px 18px",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          color: "var(--foreground)",
          textDecoration: "none",
          fontSize: "0.9rem",
          fontWeight: 500,
          backdropFilter: "blur(10px)",
          transition: "background 0.2s"
        }}>
          Documentation
        </Link>
      </div>

      {/* Dynamic System Action Center (Phase 1, 3, 4 Operations) */}
      <div className="card" style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)", borderColor: "rgba(255,255,255,0.05)" }}>
        <h3 style={{ margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "8px" }}>
          ⚙️ <span>AI Smart Core Operations Center</span>
        </h3>
        
        <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
          Manage your AI operations cleanly. You can run one-time migrations to describe existing items (Vision AI + Gemma-4 normalization), discover global stable collections from the database, or trigger a manual layout evaluation.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
          
          {/* Phase 1 Migration Card */}
          <div style={{ padding: "1.25rem", borderRadius: "8px", border: "1px solid var(--border)", background: "rgba(255,255,255,0.01)" }}>
            <h4 style={{ margin: "0 0 0.5rem 0" }}>Phase 1: Library AI Migration</h4>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
              Runs Vision AI & Gemma-4 Normalization across all 432+ wallpapers. Skipped automatically if already analyzed.
            </p>
            <div style={{ marginBottom: "0.75rem" }}>
              <select
                value={visionProvider}
                onChange={(e) => setVisionProvider(e.target.value as "gemini" | "imagga")}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  fontSize: "0.8rem",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid var(--border)",
                  borderRadius: "4px",
                  color: "inherit",
                  cursor: "pointer",
                  height: "32px"
                }}
                disabled={migrationLoading || migrationProgress?.active || indexingLoading || indexingProgress?.active}
              >
                <option value="imagga">🖼️ Imagga API (100/mo)</option>
                <option value="gemini">♊ Gemini AI</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="btn"
                style={{ padding: "6px 12px", fontSize: "0.8rem", flex: 1 }}
                disabled={migrationLoading || migrationProgress?.active}
                onClick={() => handleTriggerMigration(false)}
              >
                Start Migration
              </button>
              <button
                className="btn-secondary"
                style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                disabled={migrationLoading || migrationProgress?.active}
                onClick={() => handleTriggerMigration(true)}
              >
                Force All
              </button>
            </div>
          </div>

          {/* Phase 3 Collection Discovery Card */}
          <div style={{ padding: "1.25rem", borderRadius: "8px", border: "1px solid var(--border)", background: "rgba(255,255,255,0.01)" }}>
            <h4 style={{ margin: "0 0 0.5rem 0" }}>Phase 3: Collection Discovery</h4>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              Send metadata database to Gemma-4. Discovers 20-40 stable collections, keyword profiles, and synonyms.
            </p>
            <button
              className="btn"
              style={{ padding: "6px 12px", fontSize: "0.8rem", width: "100%" }}
              disabled={discoveryLoading}
              onClick={handleTriggerDiscovery}
            >
              {discoveryLoading ? "Discovering..." : "Discover AI Collections"}
            </button>
          </div>

          {/* Phase 4 Engine Manual Assignment Card */}
          <div style={{ padding: "1.25rem", borderRadius: "8px", border: "1px solid var(--border)", background: "rgba(255,255,255,0.01)" }}>
            <h4 style={{ margin: "0 0 0.5rem 0" }}>Phase 4: Run Keyword Assignment</h4>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              Evaluate all wallpapers against collection keyword profiles. Calculates scores and assigns junction rows.
            </p>
            <button
              className="btn-secondary"
              style={{ padding: "6px 12px", fontSize: "0.8rem", width: "100%" }}
              disabled={discoveryLoading}
              onClick={handleReassignCollections}
            >
              Recalculate Matches
            </button>
          </div>

        </div>

        {discoveryMessage && (
          <div style={{
            marginTop: "1rem",
            padding: "10px 14px",
            background: "rgba(26, 115, 232, 0.1)",
            border: "1px solid var(--primary)",
            borderRadius: "6px",
            fontSize: "0.85rem",
            color: "var(--foreground)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span>{discoveryMessage}</span>
            <button style={{ background: "none", border: "none", color: "white", cursor: "pointer" }} onClick={() => setDiscoveryMessage(null)}>✕</button>
          </div>
        )}
      </div>

      {/* Migration Progress Card */}
      {migrationProgress && showMigrationCard && (
        <div style={{
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "1rem",
          marginBottom: "1.5rem",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>
              🚀 Phase 1 Library Migration: {migrationProgress.active ? "Running" : "Finished"}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "0.9rem", fontWeight: "bold", color: "var(--primary)" }}>
                {Math.round(((migrationProgress.processed + migrationProgress.failed) / (migrationProgress.total || 1)) * 100)}% ({migrationProgress.processed + migrationProgress.failed} / {migrationProgress.total})
              </span>
              {migrationProgress.active && (
                <button
                  type="button"
                  style={{ padding: "4px 8px", fontSize: "0.75rem", background: "rgba(219,68,85,0.2)", border: "1px solid #db4455", color: "#ff6b7b", borderRadius: 4, cursor: "pointer" }}
                  onClick={handleCancelMigration}
                >
                  Stop
                </button>
              )}
            </div>
          </div>
          <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden", marginBottom: "0.5rem" }}>
            <div style={{
              width: `${((migrationProgress.processed + migrationProgress.failed) / (migrationProgress.total || 1)) * 100}%`,
              height: "100%",
              background: "linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%)"
            }}></div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)" }}>
            <span>Processed: {migrationProgress.processed} • Failed: {migrationProgress.failed}</span>
            {migrationProgress.active && <span>Analyzing: <i>{migrationProgress.currentWallpaper}</i></span>}
          </div>
        </div>
      )}

      {/* Visual System Architecture Map (Collapsible) */}
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
              How the application structures data for synchronization. Under v4, wallpapers map to collections dynamically inside a junction table rather than hardcoded attributes.
            </p>
            
            <div className="mindmap-flex" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-around", gap: "2rem", position: "relative" }}>
              <div className="mindmap-branch" style={{ flex: "1 1 300px", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
                <h4 style={{ margin: "0 0 1rem 0", color: "var(--primary)", borderBottom: "1px dashed var(--border)", paddingBottom: "4px" }}>1. Core Data Hierarchy</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", alignItems: "center" }}>
                  <div style={{ background: "rgba(26, 115, 232, 0.15)", border: "1px solid var(--primary)", borderRadius: "8px", padding: "10px 14px", width: "80%", textAlign: "center" }}>
                    <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--primary)", fontWeight: "bold" }}>Level 1: Category</div>
                    <strong style={{ fontSize: "0.95rem" }}>Anime / Game Art</strong>
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: "1.2rem" }}>⬇</div>
                  <div style={{ background: "rgba(255, 159, 10, 0.12)", border: "1px solid var(--accent)", borderRadius: "8px", padding: "10px 14px", width: "80%", textAlign: "center" }}>
                    <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--accent)", fontWeight: "bold" }}>Level 2: Collection</div>
                    <strong style={{ fontSize: "0.95rem" }}>Naruto / Cyberpunk</strong>
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: "1.2rem" }}>⬇</div>
                  <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: "8px", padding: "10px 14px", width: "80%", textAlign: "center" }}>
                    <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--foreground)", opacity: 0.6, fontWeight: "bold" }}>Level 3: Wallpaper</div>
                    <strong style={{ fontSize: "0.95rem" }}>naruto_rain.jpg</strong>
                  </div>
                </div>
              </div>
              <div className="mindmap-branch" style={{ flex: "1 1 300px", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
                <h4 style={{ margin: "0 0 1rem 0", color: "#e8eaed", borderBottom: "1px dashed var(--border)", paddingBottom: "4px" }}>2. Tag Labeling (Many-to-Many)</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", height: "100%", justifyContent: "center" }}>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
                    <span style={{ padding: "6px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid var(--border)", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "bold" }}>#Anime</span>
                    <span style={{ padding: "6px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid var(--border)", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "bold" }}>#Rain</span>
                    <span style={{ padding: "6px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid var(--border)", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "bold" }}>#Blue</span>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "10px 0" }}>🔗 Associated directly to</div>
                    <strong style={{ fontSize: "0.95rem", padding: "8px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: "6px", display: "inline-block" }}>
                      Any Wallpaper
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Smart Recommendations Section */}
      {recommendations.length > 0 && (
        <section className="card" style={{ borderColor: "rgba(26,115,232,0.2)", background: "rgba(26,115,232,0.01)" }}>
          <h3 style={{ margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "8px" }}>
            ✨ <span>Recommended For You</span>
            <span style={{ fontSize: "0.75rem", fontWeight: "normal", color: "var(--primary)", background: "rgba(26,115,232,0.1)", padding: "2px 8px", borderRadius: 10 }}>Personalized</span>
          </h3>
          <div className="recommendations-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
            {recommendations.map((img) => (
              <div
                key={img.id}
                className="gallery-item"
                style={{ cursor: "pointer", border: "1px solid rgba(255,255,255,0.05)" }}
                onClick={() => {
                  setPreviewWallpaper(img);
                  trackInteraction(img, "view");
                }}
              >
                <img src={img.url} className="img-preview" style={{ height: "110px" }} alt={img.title || img.name} />
                <div className="item-info" style={{ padding: "8px" }}>
                  <div className="item-name" style={{ fontSize: "0.8rem", fontWeight: 600 }}>{img.title || img.name}</div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    Match Confidence: {Math.round(img.confidence * 100)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Accessible Auto-Slider */}
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
              <img src={img.url} className="slide-img" alt={img.title || img.file_name || "Featured Wallpaper"} />
              <div className="slide-overlay"></div>
              <div className="slide-content">
                <div className="badge badge-category" style={{ marginBottom: "0.5rem" }}>
                  {img.collection_details?.category_name || "Uncategorized"}
                </div>
                <h3 className="slide-title">{img.title || img.file_name}</h3>
                <p className="slide-desc" style={{ fontSize: "0.85rem" }}>
                  Collection: {img.collection_details?.name || "None"} • Character: {img.characters?.[0] || "None"}
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

      {/* Main Top Grid Section */}
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
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              <div className="form-group" style={{ flex: "1 1 200px" }}>
                <label>Admin Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ flex: "1 1 200px" }}>
                <label>AI Vision Provider</label>
                <select
                  value={visionProvider}
                  onChange={(e) => setVisionProvider(e.target.value as "gemini" | "imagga")}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    color: "inherit",
                    cursor: "pointer",
                    height: "38px"
                  }}
                >
                  <option value="imagga">🖼️ Imagga API (100/mo)</option>
                  <option value="gemini">♊ Gemini AI</option>
                </select>
              </div>

              <div className="form-group" style={{ flex: "1 1 250px" }}>
                <label style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Collection (Series)</span>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: "0 6px", fontSize: "0.75rem", borderRadius: 4 }}
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
                  >
                    <option value="">-- Select Collection --</option>
                    {filteredUploadCollections.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

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
              </div>
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

            <div className="form-group">
              <label>Wallpaper Images</label>
              <div
                className={`dropzone ${isDragging ? "dragging" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <p>Drag & Drop image files here or click to browse</p>
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
          </div>
        </div>
      </div>

      {/* Gallery Filter & Grid Card */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
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
                  <select
                    value={visionProvider}
                    onChange={(e) => setVisionProvider(e.target.value as "gemini" | "imagga")}
                    style={{
                      padding: "6px 10px",
                      fontSize: "0.85rem",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      color: "inherit",
                      cursor: "pointer",
                      height: "32px"
                    }}
                    disabled={indexingLoading || indexingProgress?.active || migrationLoading || migrationProgress?.active}
                  >
                    <option value="imagga">🖼️ Imagga API (100/mo)</option>
                    <option value="gemini">♊ Gemini AI</option>
                  </select>
                  {unindexedCount > 0 && (
                    <button
                      type="button"
                      className="btn"
                      style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                      disabled={indexingLoading || indexingProgress?.active}
                      onClick={() => handleTriggerIndexing(false)}
                    >
                      {indexingLoading ? "Triggering..." : "⚡ Run AI Indexing"}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn"
                    style={{ padding: "6px 12px", fontSize: "0.85rem", background: "rgba(255, 255, 255, 0.05)", border: "1px solid var(--border)", color: "inherit" }}
                    disabled={indexingLoading || indexingProgress?.active}
                    onClick={() => handleTriggerIndexing(true)}
                  >
                    🔄 Re-index All
                  </button>
                </div>
              );
            })()}
          </div>
        </div>

        {indexingMessage && (
          <div style={{
            padding: "10px 14px",
            background: "rgba(52, 168, 83, 0.15)",
            border: "1px solid #34a853",
            borderRadius: "6px",
            fontSize: "0.9rem",
            marginBottom: "1rem",
            color: "var(--foreground)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span>{indexingMessage}</span>
            <button onClick={() => setIndexingMessage(null)} style={{ background: "none", border: "none", color: "var(--foreground)", cursor: "pointer" }}>✕</button>
          </div>
        )}

        {indexingProgress && showProgressCard && (
          <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border)", borderRadius: "8px", padding: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>⚡ AI Indexing Progress</span>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "0.9rem", fontWeight: "bold", color: "var(--primary)" }}>
                  {Math.round(((indexingProgress.processed + indexingProgress.failed) / (indexingProgress.total || 1)) * 100)}% ({indexingProgress.processed + indexingProgress.failed} / {indexingProgress.total})
                </span>
                {indexingProgress.active && (
                  <button type="button" style={{ padding: "4px 8px", fontSize: "0.75rem", background: "rgba(219,68,85,0.2)", border: "1px solid #db4455", color: "#ff6b7b", borderRadius: 4, cursor: "pointer" }} onClick={handleCancelIndexing}>
                    Stop
                  </button>
                )}
              </div>
            </div>
            <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden", marginBottom: "0.5rem" }}>
              <div style={{ width: `${((indexingProgress.processed + indexingProgress.failed) / (indexingProgress.total || 1)) * 100}%`, height: "100%", background: "linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%)" }}></div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)" }}>
              <span>Processed: {indexingProgress.processed} • Failed: {indexingProgress.failed}</span>
              {indexingProgress.active && <span>Analyzing: <i>{indexingProgress.currentWallpaper}</i></span>}
            </div>
          </div>
        )}

        {/* Live Search and Filter Bar */}
        <div style={{ marginBottom: "1.5rem", display: "flex", gap: "10px" }}>
          <input
            type="text"
            placeholder="🔍 Live Search: Search title, description, characters, franchise, tags, style, mood, colors, etc. (AND matched, normalized)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--background)",
              color: "inherit",
              fontSize: "0.95rem",
              boxShadow: "inset 0 1px 4px rgba(0,0,0,0.15)",
              outline: "none"
            }}
          />
          {(searchQuery || selectedCategoryFilter || selectedCollectionFilter || selectedStyleFilter || selectedMoodFilter || selectedColorFilter || selectedTagFilters.length > 0) && (
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: "0 18px", borderRadius: "8px", fontSize: "0.95rem", whiteSpace: "nowrap" }}
              onClick={() => {
                setSearchQuery("");
                setSelectedCategoryFilter("");
                setSelectedCollectionFilter("");
                setSelectedStyleFilter("");
                setSelectedMoodFilter("");
                setSelectedColorFilter("");
                setSelectedTagFilters([]);
              }}
            >
              Clear All Filters
            </button>
          )}
        </div>

        {/* Dynamic Filter Controls Panel */}
        <div className="filter-bar" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "8px", padding: "1.25rem", marginBottom: "1.5rem" }}>

          <div className="filter-group" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Collection</label>
            <select value={selectedCollectionFilter} onChange={(e) => setSelectedCollectionFilter(e.target.value)}>
              <option value="">All Collections</option>
              {filteredFilterCollections.map((col) => (<option key={col.id} value={col.id}>{col.name}</option>))}
            </select>
          </div>

          <div className="filter-group" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Style</label>
            <select value={selectedStyleFilter} onChange={(e) => setSelectedStyleFilter(e.target.value)}>
              <option value="">All Styles</option>
              <option value="Realistic">Realistic</option>
              <option value="Minimal">Minimal</option>
              <option value="Illustration">Illustration</option>
              <option value="3D Render">3D Render</option>
              <option value="Anime">Anime</option>
              <option value="Pixel Art">Pixel Art</option>
              <option value="Cyberpunk">Cyberpunk</option>
              <option value="Vector">Vector</option>
            </select>
          </div>

          <div className="filter-group" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Mood</label>
            <select value={selectedMoodFilter} onChange={(e) => setSelectedMoodFilter(e.target.value)}>
              <option value="">All Moods</option>
              <option value="Dramatic">Dramatic</option>
              <option value="Calm">Calm</option>
              <option value="Mysterious">Mysterious</option>
              <option value="Energetic">Energetic</option>
              <option value="Dark">Dark</option>
              <option value="Vibrant">Vibrant</option>
            </select>
          </div>

          <div className="filter-group" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Colors</label>
            <select value={selectedColorFilter} onChange={(e) => setSelectedColorFilter(e.target.value)}>
              <option value="">All Colors</option>
              <option value="Blue">Blue</option>
              <option value="Black">Black</option>
              <option value="Red">Red</option>
              <option value="White">White</option>
              <option value="Green">Green</option>
              <option value="Yellow">Yellow</option>
              <option value="Orange">Orange</option>
              <option value="Purple">Purple</option>
              <option value="Dark">Dark</option>
            </select>
          </div>
        </div>

        <div className="form-group" style={{ width: "100%", marginBottom: "1.5rem" }}>
          <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "bold" }}>Filter by Tag Labels</label>
          <input
            type="text"
            placeholder="🔍 Search tags to filter..."
            value={tagSearchFilter}
            onChange={(e) => setTagSearchFilter(e.target.value)}
            style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--background)", color: "inherit", fontSize: "0.85rem", marginBottom: "0.5rem" }}
          />
          <div className="tags-filter-list" style={{ maxHeight: "100px", overflowY: "auto", padding: "8px", border: "1px solid var(--border)", borderRadius: "6px", background: "rgba(0,0,0,0.15)", width: "100%" }}>
            {tags
              .filter((t) => t.name.toLowerCase().includes(tagSearchFilter.toLowerCase()) || selectedTagFilters.includes(t.id))
              .map((tag) => (
                <button key={tag.id} type="button" onClick={() => handleToggleTagFilter(tag.id)} className={`tag-chip ${selectedTagFilters.includes(tag.id) ? "active" : ""}`}>
                  {tag.name}
                </button>
              ))}
          </div>
        </div>

        {galleryImages.length > 0 && (
          <div style={{ marginBottom: "1.5rem" }}>
            <button type="button" className="btn-secondary" onClick={handleSelectAllImages} style={{ padding: "6px 14px", borderRadius: 6, fontSize: "0.85rem" }}>
              {selectedImageIds.length === galleryImages.length ? "Deselect All" : `Select All for Bulk Edit (${selectedImageIds.length})`}
            </button>
          </div>
        )}

        {/* Wallpaper Image Grid */}
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1.5rem" }}>
          {galleryImages.map((img) => {
            const isSelected = selectedImageIds.includes(img.id);
            const fav = isFavorited(img.id);
            
            return (
              <div key={img.id} className={`gallery-item ${isSelected ? "selected" : ""}`} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                {/* Selection Checkbox */}
                <div className="select-overlay" style={{ display: "flex", justifyContent: "space-between", width: "calc(100% - 16px)", pointerEvents: "none" }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectImage(img.id)}
                    className="select-checkbox"
                    style={{ pointerEvents: "auto" }}
                  />
                  
                  {/* Favorite button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavoriteLocal(img);
                    }}
                    style={{
                      background: "rgba(0,0,0,0.65)",
                      border: "none",
                      color: fav ? "#ff3b30" : "#ffffff",
                      fontSize: "1rem",
                      cursor: "pointer",
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      pointerEvents: "auto"
                    }}
                  >
                    {fav ? "❤️" : "♡"}
                  </button>
                </div>

                <img
                  src={img.url}
                  className="img-preview"
                  alt={img.title || img.name}
                  style={{ height: "160px", objectFit: "cover", cursor: "zoom-in" }}
                  onClick={() => {
                    setPreviewWallpaper(img);
                    trackInteraction(img, "view");
                  }}
                />

                <div className="item-info" style={{ padding: "12px", display: "flex", flexDirection: "column", flex: 1 }}>
                  <div className="item-name" title={img.title || img.file_name || img.name} style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                    {img.title || img.file_name || img.name}
                  </div>
                  
                  {img.description && (
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "4px 0 8px 0", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {img.description}
                    </p>
                  )}

                  <div className="item-meta" style={{ marginTop: "auto", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    
                    {img.collections && img.collections.map((c: any) => (
                      <span key={c.id} className="badge" style={{ background: "rgba(255, 159, 10, 0.1)", color: "#ffb340", borderColor: "rgba(255, 159, 10, 0.2)", fontSize: "0.65rem" }}>
                        {c.name}
                      </span>
                    ))}

                    {img.characters && img.characters.slice(0, 2).map((c: string, idx: number) => (
                      <span key={idx} className="badge" style={{ background: "rgba(52, 168, 83, 0.1)", color: "#5cd37e", borderColor: "rgba(52, 168, 83, 0.2)", fontSize: "0.65rem" }}>
                        👤 {c}
                      </span>
                    ))}

                    {img.franchises && img.franchises.slice(0, 1).map((f: string, idx: number) => (
                      <span key={idx} className="badge" style={{ background: "rgba(26, 115, 232, 0.1)", color: "#8ab4f8", borderColor: "rgba(26, 115, 232, 0.2)", fontSize: "0.65rem" }}>
                        🎬 {f}
                      </span>
                    ))}
                  </div>

                  {/* Individual actions */}
                  <div style={{ display: "flex", gap: "6px", marginTop: "12px" }}>
                    <button
                      onClick={() => handleStartEdit(img)}
                      className="btn-secondary"
                      style={{ flex: 1, padding: "5px 10px", fontSize: "0.8rem", cursor: "pointer", borderRadius: "6px" }}
                    >
                      Edit
                    </button>
                    
                    <a
                      href={img.url}
                      download={img.file_name}
                      onClick={() => trackInteraction(img, "download")}
                      className="btn-secondary"
                      style={{ padding: "5px 10px", fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", borderRadius: "6px" }}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Download wallpaper"
                    >
                      📥
                    </a>

                    <button
                      onClick={() => deleteImage(img.name)}
                      className="btn-danger"
                      style={{ flex: 1, padding: "5px 10px", fontSize: "0.8rem", cursor: "pointer", borderRadius: "6px", color: "white", border: "none" }}
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

      {/* Analytics Section */}
      <div className="card" style={{ marginTop: "2rem" }}>
        <h2 style={{ margin: 0, marginBottom: "1rem" }}>User Reviews & Analytics</h2>
        <div style={{ display: "flex", gap: "2rem", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 8, padding: "1.5rem", marginBottom: "1.5rem" }}>
          <div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Average Rating</div>
            <div style={{ fontSize: "2.5rem", fontWeight: "bold", color: "var(--accent)", marginTop: "0.25rem" }}>
              {reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : "0.0"}
              <span style={{ fontSize: "1.5rem", color: "var(--text-muted)" }}> / 5</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Total Reviews</div>
            <div style={{ fontSize: "2.5rem", fontWeight: "bold", marginTop: "0.25rem" }}>{reviews.length}</div>
          </div>
        </div>
        <div style={{ maxHeight: "350px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", paddingRight: "6px" }}>
          {reviews.map((r) => (
            <div key={r.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <strong style={{ fontSize: "0.95rem" }}>{r.reviewer_name}</strong>
                <span style={{ color: "#ff9f0a", fontWeight: "bold", fontSize: "0.9rem" }}>{"★".repeat(r.rating) + "☆".repeat(5 - r.rating)}</span>
              </div>
              <p style={{ margin: 0, fontSize: "0.9rem" }}>{r.comment || <em>No comment</em>}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Bulk Edit action bar */}
      {selectedImageIds.length > 0 && (
        <div className="bulk-actions-bar">
          <div><strong style={{ fontSize: "1.1rem" }}>{selectedImageIds.length} item(s) selected</strong></div>
          <div className="bulk-actions-controls">
            <div>
              <select value={bulkCollectionId} onChange={(e) => setBulkCollectionId(e.target.value)} style={{ padding: "6px 12px", borderRadius: 4, border: "1px solid var(--border)", background: "#1a1a1a", color: "#e0e0e0" }}>
                <option value="">-- Assign Collection --</option>
                {filteredBulkCollections.map((col) => (<option key={col.id} value={col.id}>{col.name}</option>))}
              </select>
            </div>
            <button type="button" className="btn" onClick={handleApplyBulkUpdate} disabled={loading}>Apply Changes</button>
            <button type="button" className="btn-secondary" onClick={() => { setSelectedImageIds([]); setBulkCategoryId(""); setBulkCollectionId(""); setBulkTags([]); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Full Resolution Wallpaper Preview Modal */}
      {previewWallpaper && (
        <div
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}
          onClick={() => setPreviewWallpaper(null)}
        >
          <div
            style={{ width: "90%", maxWidth: "1000px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.5rem", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewWallpaper(null)}
              style={{ position: "absolute", top: "1rem", right: "1rem", background: "rgba(0,0,0,0.6)", color: "white", border: "none", fontSize: "1.2rem", width: "36px", height: "36px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              ✕
            </button>
            <img src={previewWallpaper.url} style={{ width: "100%", maxHeight: "65vh", objectFit: "contain", borderRadius: 8 }} alt={previewWallpaper.title || previewWallpaper.name} />
            <div style={{ marginTop: "1rem" }}>
              <h3 style={{ margin: "0 0 0.5rem 0" }}>{previewWallpaper.title || previewWallpaper.file_name}</h3>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)" }}>{previewWallpaper.description || "No description available."}</p>
            </div>
          </div>
        </div>
      )}

      {/* Individual Wallpaper Edit Modal */}
      {editingWallpaper && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="card" style={{ width: "100%", maxWidth: "600px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.5rem 2rem", position: "relative", margin: 0, maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>Edit Wallpaper Metadata</h3>
            
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem", wordBreak: "break-all" }}>
              File: {editingWallpaper.file_name || editingWallpaper.name}
            </p>

            <div className="form-group">
              <label>Title</label>
              <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={2} style={{ resize: "vertical" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label>Characters (Comma-separated)</label>
                <input type="text" value={editCharacters} onChange={(e) => setEditCharacters(e.target.value)} placeholder="e.g. Naruto Uzumaki, Sasuke" />
              </div>
              <div className="form-group">
                <label>Franchises (Comma-separated)</label>
                <input type="text" value={editFranchises} onChange={(e) => setEditFranchises(e.target.value)} placeholder="e.g. Naruto, Shonen Jump" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label>Styles (Comma-separated)</label>
                <input type="text" value={editStyles} onChange={(e) => setEditStyles(e.target.value)} placeholder="e.g. Anime, Digital Art" />
              </div>
              <div className="form-group">
                <label>Moods (Comma-separated)</label>
                <input type="text" value={editMoods} onChange={(e) => setEditMoods(e.target.value)} placeholder="e.g. Dramatic, Mysterious" />
              </div>
            </div>

            <div className="form-group">
              <label>Dominant Color</label>
              <input type="text" value={editPrimaryColor} onChange={(e) => setEditPrimaryColor(e.target.value)} placeholder="e.g. Blue" />
            </div>

            {/* Many-to-many Collection selection checkboxes */}
            <div className="form-group">
              <label style={{ fontWeight: "bold", display: "block", marginBottom: "8px" }}>Assigned Collections (Multi-Select)</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "8px", maxHeight: "120px", overflowY: "auto", border: "1px solid var(--border)", padding: "10px", borderRadius: "6px", background: "rgba(0,0,0,0.1)" }}>
                {collections.map((col) => (
                  <label key={col.id} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={editCollectionIds.includes(col.id)} onChange={() => toggleCollectionEditCheckbox(col.id)} style={{ width: 14, height: 14 }} />
                    <span>{col.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Tags checkboxes */}
            <div className="form-group">
              <label>Tags Selection</label>
              <input type="text" placeholder="🔍 Search tags..." value={tagSearchEdit} onChange={(e) => setTagSearchEdit(e.target.value)} style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border)", background: "rgba(0,0,0,0.2)", color: "white", fontSize: "0.85rem", marginBottom: "0.5rem" }} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", padding: "8px", border: "1px solid var(--border)", borderRadius: 6, background: "rgba(0,0,0,0.15)", maxHeight: "100px", overflowY: "auto" }}>
                {tags
                  .filter((t) => t.name.toLowerCase().includes(tagSearchEdit.toLowerCase()) || editTags.includes(t.id))
                  .map((t) => (
                    <button key={t.id} type="button" className={`tag-chip ${editTags.includes(t.id) ? "active" : ""}`} onClick={() => setEditTags((prev) => prev.includes(t.id) ? prev.filter((id) => id !== t.id) : [...prev, t.id])} style={{ padding: "2px 8px", fontSize: "0.75rem" }}>
                      {t.name}
                    </button>
                  ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "1.5rem" }}>
              <button type="button" className="btn-secondary" onClick={() => setEditingWallpaper(null)} disabled={loading}>Cancel</button>
              <button type="button" className="btn" onClick={handleSaveEdit} disabled={loading}>{loading ? "Saving..." : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        .tags-filter-list::-webkit-scrollbar,
        .recommendations-grid::-webkit-scrollbar,
        .release-notes-box::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .tags-filter-list::-webkit-scrollbar-thumb,
        .recommendations-grid::-webkit-scrollbar-thumb,
        .release-notes-box::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.15);
          border-radius: 4px;
        }
      `}} />
    </div>
  );
}
