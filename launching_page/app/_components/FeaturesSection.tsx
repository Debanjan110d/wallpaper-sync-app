const FEATURES = [
  { title: "Drag & drop", description: "Add wallpapers instantly — no import wizards." },
  { title: "Auto-rotate", description: "Set an interval and forget it. Your desktop stays fresh." },
  { title: "Tray-first", description: "Runs quietly in the system tray; minimal background usage." },
  { title: "Optional sync", description: "Point it at a server API and sync a shared wallpaper collection." },
  { title: "Update checks", description: "Installed builds can check for updates and open the latest installer." },
  { title: "Open source", description: "Transparent releases and changelog. Fork it, tweak it, ship it." },
];

export default function FeaturesSection() {
  return (
    <section className="section" id="features">
      <div className="container">
        <h2 className="sectionTitle">Features</h2>
        <p className="sectionSub">
          Everything you’d expect from a modern wallpaper utility — without bloat.
        </p>

        <div className="featureGrid">
          {FEATURES.map((item) => (
            <div className="feature" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
