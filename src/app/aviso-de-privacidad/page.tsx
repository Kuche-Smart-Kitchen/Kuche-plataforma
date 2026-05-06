import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Aviso de Privacidad | Küche",
  description:
    "Información sobre el tratamiento de datos personales en posesión de Küche Cocinas Inteligentes.",
};

export default function AvisoDePrivacidadPage() {
  return (
    <main className="min-h-screen bg-background text-primary">
      <section className="px-4 pb-16 pt-16 md:pt-20">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Aviso de Privacidad
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-primary md:text-5xl">
            Protegemos tu información
          </h1>
          <p className="mt-6 text-sm leading-relaxed text-secondary md:text-base">
            En cumplimiento de la Ley Federal de Protección de Datos Personales en Posesión de los
            Particulares y su Reglamento (México), ponemos a su disposición el siguiente aviso.
          </p>

          <div className="mt-10 space-y-8 text-sm leading-relaxed text-secondary md:text-base">
            <section>
              <h2 className="text-base font-semibold text-primary md:text-lg">1. Responsable</h2>
              <p className="mt-2">
                El responsable del tratamiento de sus datos personales es{" "}
                <strong className="text-primary">Küche Cocinas Inteligentes</strong> (en adelante, “Küche”),
                con domicilio en <strong className="text-primary">Calle Industrial 45, Ciudad de México</strong>.
                Para asuntos de privacidad puede contactarnos en{" "}
                <a
                  href="mailto:hola@kuche.mx"
                  className="font-semibold text-accent underline-offset-2 hover:underline"
                >
                  hola@Küche.mx
                </a>.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-primary md:text-lg">
                2. Datos personales que podemos recabar
              </h2>
              <p className="mt-2">
                Cuando usted utiliza nuestro sitio web o formularios de contacto, podemos recabar, entre otros:
                nombre, teléfono, correo electrónico y los datos que voluntariamente nos envíe en mensajes.
                Por el uso del sitio también pueden generarse datos técnicos (por ejemplo, tipo de navegador,
                dirección IP o identificadores de sesión) necesarios para seguridad y funcionamiento.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-primary md:text-lg">3. Finalidades</h2>
              <p className="mt-2">Sus datos se tratan para:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  <strong className="text-primary">Finalidades primarias:</strong> atender solicitudes de
                  información, cotización o contacto; dar seguimiento comercial y operativo acorde a su relación
                  con Küche.
                </li>
                <li>
                  <strong className="text-primary">Finalidades secundarias (cuando apliquen):</strong> envío
                  de comunicaciones sobre productos o servicios. Si no desea estos usos secundarios, puede
                  manifestarlo al correo indicado en la sección de derechos.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-primary md:text-lg">
                4. Transferencias y cookies
              </h2>
              <p className="mt-2">
                Küche no vende sus datos personales. En algunos casos podemos compartir información con
                proveedores que nos prestan servicios (por ejemplo, alojamiento, seguridad o verificación
                anti-spam), bajo acuerdos de confidencialidad y solo en la medida necesaria.
              </p>
              <p className="mt-2">
                El sitio puede utilizar cookies o tecnologías similares estrictamente necesarias para la
                operación del sitio. Si en el futuro se incorporan cookies analíticas o de publicidad, este
                aviso se actualizará y, cuando la ley lo aplique, solicitaremos su consentimiento expreso.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-primary md:text-lg">
                5. ARCO y revocación del consentimiento
              </h2>
              <p className="mt-2">
                Usted tiene derecho a <strong className="text-primary">Acceder, Rectificar, Cancelar u Oponerse</strong>{" "}
                al tratamiento de sus datos (ARCO), así como a revocar el consentimiento que hubiere otorgado,
                en los términos de la ley. Para ejercer estos derechos, envíe su solicitud al correo de contacto
                del responsable, indicando nombre, medio de respuesta y el derecho que desea ejercer.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-primary md:text-lg">
                6. Cambios al aviso
              </h2>
              <p className="mt-2">
                Küche podrá actualizar este aviso para reflejar cambios normativos o en nuestros servicios. La
                versión vigente permanecerá publicada en{" "}
                <Link href="/aviso-de-privacidad" className="font-semibold text-accent underline-offset-2 hover:underline">
                  esta página
                </Link>
                . Le recomendamos revisarla periódicamente.
              </p>
            </section>
          </div>

          <p className="mt-10 text-sm text-secondary">
            <Link href="/" className="font-semibold text-accent underline-offset-2 hover:underline">
              ← Volver al inicio
            </Link>
          </p>
        </div>
      </section>

      <footer className="border-t border-primary/10 px-4 py-8">
        <div className="mx-auto max-w-3xl text-center text-xs text-secondary">
          <p>© {new Date().getFullYear()} Küche Cocinas Inteligentes.</p>
          <p className="mt-2">
            <Link href="/" className="font-medium text-accent underline-offset-2 hover:underline">
              Ir al inicio
            </Link>
          </p>
        </div>
      </footer>
    </main>
  );
}
