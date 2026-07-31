import { HomeClosing } from "@/components/home/HomeClosing";
import { HomeHeader } from "@/components/home/HomeHeader";
import { HeroSection } from "@/components/home/HeroSection";
import { LearningScopeSection } from "@/components/home/LearningScopeSection";
import { PlatformSections } from "@/components/home/PlatformSections";
import styles from "@/components/home/Home.module.css";

export default function HomePage() {
  return (
    <main dir="rtl" className={styles.page}>
      <HomeHeader />
      <HeroSection />
      <LearningScopeSection />
      <PlatformSections />
      <HomeClosing />
    </main>
  );
}
