import BootTerminal from "./_components/BootTerminal";
import Header from "./_components/Header";
import HeroSection from "./_components/HeroSection";
import KnownIssuesBulletin from "./_components/KnownIssuesBulletin";
import WallpaperShowcase from "./_components/WallpaperShowcase";
import WatchdogVisualizer from "./_components/WatchdogVisualizer";
import ComparisonTable from "./_components/ComparisonTable";
import FeaturesSection from "./_components/FeaturesSection";
import DownloadSection from "./_components/DownloadSection";
import UpdatesSection from "./_components/UpdatesSection";
import FooterSection from "./_components/FooterSection";
import { fetchReleases, pickPrimaryAsset } from "./_lib/githubReleases";

export const revalidate = 60; // Revalidate page data every 60 seconds

export default async function HomePage() {
  let releases = [] as Awaited<ReturnType<typeof fetchReleases>>;
  let releasesError: string | null = null;

  try {
    releases = await fetchReleases();
  } catch (e: any) {
    releasesError = e?.message || "Failed to load releases";
  }

  const latestRelease = releases[0] || null;
  const latestReleaseAsset = latestRelease ? pickPrimaryAsset(latestRelease.assets || []) : null;
  const olderReleases = releases.slice(1, 6);

  return (
    <>
      <BootTerminal />
      <Header />
      <main>
        <HeroSection
          latestRelease={latestRelease}
          latestReleaseAsset={latestReleaseAsset}
          releasesError={releasesError}
        />
        <KnownIssuesBulletin />
        <hr className="hr" />
        <WallpaperShowcase />
        <hr className="hr" />
        <WatchdogVisualizer />
        <hr className="hr" />
        <ComparisonTable />
        <hr className="hr" />
        <FeaturesSection />
        <hr className="hr" />
        <DownloadSection
          latestRelease={latestRelease}
          latestReleaseAsset={latestReleaseAsset}
          olderReleases={olderReleases}
          releasesError={releasesError}
        />
        <hr className="hr" />
        <UpdatesSection releases={releases} />
        <hr className="hr" />
        <FooterSection />
      </main>
    </>
  );
}
