import Hero from "@/components/home/Hero";
import History from "@/components/home/History";
import FeaturedProjects from "@/components/home/FeaturedProjects";
import Experience3D from "@/components/home/Experience3D";
import LeadForm from "@/components/home/LeadForm";
import Testimonials from "@/components/home/Testimonials";
import Location from "@/components/home/Location";
import Footer from "@/components/layout/Footer";

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-primary">
      <Hero />
      <History />
      <FeaturedProjects />
      <Experience3D />
      <Testimonials />
      <LeadForm />
      <Location />
      <Footer />
    </main>
  );
}
