"use client";

import { useState, useRef, useEffect } from "react";

export default function Page() {
  const [username, setUsername] = useState("Admin");
  const [files, setFiles] = useState<File[]>([]);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchGallery = async () => {
    try {
      const res = await fetch("/api/wallpapers");
      const data = await res.json();
      if (data.wallpapers) {
        setGalleryImages(data.wallpapers);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, []);

  const validateAspectRatio = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        // Accept roughly 16:9, 16:10, 21:9
        if (ratio >= 1.5 && ratio <= 2.5) {
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
      if (!file.type.startsWith('image/')) continue;
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
    fetchGallery();
  };

  const deleteImage = async (filename: string) => {
    if (!confirm("Are you sure you want to permanently delete this wallpaper?")) return;
    
    try {
      const res = await fetch("/api/wallpapers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename })
      });
      if (res.ok) {
        setGalleryImages(prev => prev.filter(img => img.name !== filename));
      } else {
        const data = await res.json();
        alert("Delete failed: " + data.error);
      }
    } catch (e) {
      alert("Delete failed: " + e);
    }
  };

  return (
    <div className="container">
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#0070f3", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold" }}>
          {(username?.trim()?.[0] ?? "A").toUpperCase()}
        </div>
        <h1>{username}'s Dashboard</h1>
      </div>
      <p style={{ color: "rgba(255,255,255,0.7)" }}>Upload multiple landscape wallpapers to your Supabase storage.</p>
      
      <div className="card" style={{ maxWidth: 800, marginTop: "2rem" }}>
        <form onSubmit={handleUpload}>
          <div style={{ display: "flex", gap: "1rem" }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                required
              />
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

          {files.length > 0 && (
            <div className="file-list">
              <h4>Selected Files:</h4>
              <ul>
                {files.map((f, i) => (
                  <li key={i}>
                    {f.name} <button type="button" onClick={() => removeFile(i)}>✕</button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button type="submit" className="btn" disabled={loading || files.length === 0} style={{ width: "100%", marginTop: "1rem" }}>
            {loading ? `Uploading ${files.length} file(s)...` : `Upload ${files.length} Wallpaper(s)`}
          </button>
          
          {messages.length > 0 && (
            <div className="messages" style={{ marginTop: "1rem", padding: "1rem", background: "rgba(0,0,0,0.2)", borderRadius: 8 }}>
              {messages.map((msg, i) => (
                <p key={i} style={{ margin: "0.5rem 0" }}>{msg}</p>
              ))}
            </div>
          )}
        </form>
      </div>

      {galleryImages.length > 0 && (
        <div className="card" style={{ maxWidth: 800, marginTop: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h2 style={{ margin: 0 }}>Manage Collection</h2>
            <span style={{ color: "rgba(255,255,255,0.6)" }}>{galleryImages.length} wallpapers</span>
          </div>
          <div className="grid">
            {galleryImages.map((img, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img src={img.url} className="img-preview" alt={img.name} />
                <button 
                  onClick={() => deleteImage(img.name)}
                  style={{
                    position: "absolute", top: 8, right: 8, background: "rgba(255,0,0,0.8)", 
                    color: "white", border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer",
                    fontWeight: "bold"
                  }}
                >
                  Delete
                </button>
                <div style={{ fontSize: "0.8rem", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "rgba(255,255,255,0.8)" }}>
                  {img.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
