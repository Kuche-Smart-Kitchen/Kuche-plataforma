import BookingSection from "@/components/agendar/BookingSection";
import Footer from "@/components/layout/Footer";

export default function AgendarPage() {
  return (
    <main className="min-h-screen bg-background text-primary">
      <section className="px-4 pt-28 md:pt-32">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h1 className="text-3xl font-semibold text-primary md:text-5xl">
              Agenda una cita con Küche
            </h1>
            <p className="mt-3 pb-6 text-sm text-secondary md:text-base">
              Selecciona fecha, horario y comparte los detalles de tu proyecto.
            </p>
          </div>
        </div>
      </section>
      <BookingSection />
      <Footer />
    </main>
  );
}

