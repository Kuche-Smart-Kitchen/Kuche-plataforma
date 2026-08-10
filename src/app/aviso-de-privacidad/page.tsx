import type { Metadata } from "next";
import Link from "next/link";

import { KUCHE_EMAIL, KUCHE_EMAIL_MAILTO_HREF } from "@/lib/kuche-contact";

export const metadata: Metadata = {
  title: "Aviso de Privacidad | Küche",
  description:
    "Información sobre el tratamiento de datos personales en posesión de Küche Cocinas Inteligentes.",
};

export default function AvisoDePrivacidadPage() {
  return (
    <main className="min-h-screen bg-background text-primary">
      <section className="px-4 pb-16 pt-28 md:pt-32">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Aviso de Privacidad
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-primary md:text-5xl">
            Protegemos tu información
          </h1>

          <div className="mt-10 space-y-8 text-sm leading-relaxed text-secondary md:text-base">
            <section>
              <p>
                <strong className="text-primary">Küche Cocinas Inteligentes</strong>, con domicilio en{" "}
                <strong className="text-primary">
                  Av Universidad España 119, Cd Industrial, 34208 Durango, Dgo.
                </strong>
                , en su carácter de responsable del tratamiento de los datos personales, pone a disposición
                de sus clientes, proveedores, empleados y público en general el presente Aviso de
                Privacidad, de conformidad con la Ley Federal de Protección de Datos Personales en Posesión
                de los Particulares y demás disposiciones aplicables.
              </p>
              <p className="mt-4">
                Los datos personales que nos proporcione serán tratados de manera legítima, controlada e
                informada y únicamente para las finalidades descritas en este aviso. El acceso a los datos
                personales se encuentra limitado de acuerdo con las funciones y responsabilidades de las
                personas que intervienen en su tratamiento. El personal administrativo y operativo únicamente
                tendrá acceso a los datos personales que resulten necesarios para el desempeño de sus
                funciones para el cumplimiento de las finalidades establecidas en este Aviso de Privacidad.
              </p>
              <p className="mt-4">
                Küche Cocinas Inteligentes implementará medidas administrativas, técnicas y físicas
                orientadas a restringir el acceso no autorizado a los datos personales y a proteger su
                confidencialidad, integridad y disponibilidad. Las personas que intervengan en cualquier
                etapa del tratamiento deberán guardar confidencialidad respecto de los datos personales a
                los que tengan acceso.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-primary md:text-lg">
                Datos personales de clientes
              </h2>
              <p className="mt-2">A nuestros clientes les solicitamos los siguientes datos personales:</p>
              <p className="mt-2">
                Nombre, teléfono, correo electrónico, domicilio y, cuando resulte necesario para la
                operación solicitada, ubicación, para elaborar y dar seguimiento a cotizaciones, establecer
                comunicación, gestionar la contratación de servicios y mantener controles administrativos.
              </p>
              <p className="mt-2">
                <strong className="text-primary">Comprobantes de pago:</strong> imagen o archivo del
                comprobante correspondiente a la operación realizada, el cual podrá contener información
                financiera o patrimonial. Estos datos serán tratados exclusivamente para verificar y
                acreditar el pago, conciliar la operación correspondiente y llevar los controles
                administrativos y contables relacionados con los productos y/o servicios contratados.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-primary md:text-lg">
                Datos personales de proveedores
              </h2>
              <p className="mt-2">Respecto de nuestros proveedores se podrá mostrar la siguiente información:</p>
              <p className="mt-2">
                Los datos que podrán ser utilizados y publicados en el apartado de &quot;Aliados&quot; de
                nuestra plataforma se limitarán al nombre comercial del proveedor y su logotipo, con la
                finalidad de brindar transparencia a nuestros clientes respecto de los proveedores, marcas
                y productos con los que trabaja la empresa, así como proporcionar información sobre la
                calidad y procedencia de los productos utilizados en la prestación de nuestros servicios.
              </p>
              <p className="mt-2">
                La publicación de dicha información tendrá exclusivamente fines informativos, de transparencia
                y de identificación comercial, y no implicará la publicación de datos personales adicionales
                de los proveedores, representantes, empleados o colaboradores.
              </p>
              <p className="mt-2">
                No se publicarán en este apartado números telefónicos, domicilios particulares, correos
                electrónicos ni cualquier otra información personal que no sea necesaria para las
                finalidades anteriormente señaladas.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-primary md:text-lg">
                Datos personales de empleados
              </h2>
              <p className="mt-2">A nuestros empleados solicitamos los siguientes datos personales:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  Nombre, teléfono, correo electrónico únicamente en la medida necesaria para la
                  administración de la relación laboral y el cumplimiento de las obligaciones legales
                  correspondientes.
                </li>
                <li>
                  Puesto ejercido y responsabilidades en su área de trabajo cuando sean necesarios para los
                  procesos de administración de personal y cumplimiento de obligaciones aplicables.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-primary md:text-lg">
                Uso, transferencia y conservación de datos
              </h2>
              <p className="mt-2">
                Los datos personales no serán utilizados para finalidades distintas de aquellas señaladas en
                este aviso sin que, cuando legalmente sea necesario, se obtenga previamente el consentimiento
                correspondiente. De igual forma, no se venderán ni comercializarán los datos personales.
              </p>
              <p className="mt-2">
                Los datos personales podrán ser comunicados o transferidos únicamente cuando resulte necesario
                para cumplir las finalidades descritas en este aviso, para la prestación de servicios
                relacionados con la operación, para el cumplimiento de obligaciones legales o cuando exista
                una excepción al consentimiento prevista por la legislación aplicable. Cuando una
                transferencia requiera consentimiento, éste será solicitado en los términos correspondientes.
              </p>
              <p className="mt-2">
                Los datos personales serán conservados únicamente durante el periodo necesario para cumplir
                las finalidades que justifican su tratamiento y, posteriormente, durante los plazos de
                conservación que resulten exigibles por obligaciones legales o para la atención de
                responsabilidades. Una vez concluido el periodo correspondiente, serán eliminados, bloqueados
                o anonimizados conforme resulte aplicable.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-primary md:text-lg">
                Derechos ARCO y revocación del consentimiento
              </h2>
              <p className="mt-2">
                La persona titular de los datos personales, o su representante legal debidamente acreditado,
                podrá ejercer los derechos de{" "}
                <strong className="text-primary">Acceso, Rectificación, Cancelación y Oposición (ARCO)</strong>
                , así como solicitar la revocación de su consentimiento cuando legalmente proceda, mediante
                una solicitud enviada al correo electrónico{" "}
                <a
                  href={KUCHE_EMAIL_MAILTO_HREF}
                  className="font-semibold text-accent underline-offset-2 hover:underline"
                >
                  {KUCHE_EMAIL}
                </a>
                , dirigida a Küche Cocinas Inteligentes como responsable del tratamiento de los datos
                personales.
              </p>
              <p className="mt-4">La solicitud para el ejercicio de los derechos ARCO deberá contener, como mínimo:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Nombre de la persona titular y un medio para recibir notificaciones.</li>
                <li>
                  Documentos que permitan acreditar la identidad de la persona titular y, en su caso, la
                  personalidad e identidad de su representante legal.
                </li>
                <li>
                  Descripción clara y precisa de los datos personales respecto de los cuales se pretende
                  ejercer el derecho, salvo cuando se trate del derecho de Acceso.
                </li>
                <li>
                  Descripción del derecho ARCO que se pretende ejercer y, en su caso, la solicitud concreta
                  que se formula.
                </li>
                <li>Cualquier otro elemento o documento que facilite la localización de los datos personales.</li>
              </ul>
              <p className="mt-4">
                Cuando se solicite el derecho de Acceso, la persona titular deberá indicar, de ser posible,
                la modalidad en la que desea recibir sus datos personales.
              </p>
              <p className="mt-4">
                Küche Cocinas Inteligentes dará trámite a las solicitudes recibidas y emitirá la respuesta
                correspondiente dentro de los plazos establecidos por la legislación aplicable. Actualmente,
                el plazo para comunicar la determinación sobre la solicitud no podrá exceder de veinte días
                contados a partir del día siguiente a su recepción. Cuando resulte procedente el ejercicio
                del derecho solicitado, éste deberá hacerse efectivo dentro de los quince días siguientes a
                la fecha en que se comunique la respuesta. Los plazos podrán ampliarse en los términos
                previstos por la legislación aplicable.
              </p>
              <p className="mt-4">
                El ejercicio de los derechos ARCO será gratuito, sin perjuicio de los costos de reproducción,
                certificación o envío que, en su caso, resulten aplicables conforme a la legislación.
              </p>
              <p className="mt-4">
                También podrá solicitar la limitación del uso o divulgación de sus datos personales mediante
                los medios de contacto señalados anteriormente.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-primary md:text-lg">
                Cambios al aviso de privacidad
              </h2>
              <p className="mt-2">
                En caso de realizar modificaciones al presente Aviso de Privacidad, le informaremos mediante
                correo electrónico, nuestro sitio web oficial y/o los medios de comunicación que resulten
                razonables y adecuados. La versión actualizada estará disponible en{" "}
                <a
                  href="https://cocinainteligenteskuche.com"
                  className="font-semibold text-accent underline-offset-2 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  cocinainteligenteskuche.com
                </a>{" "}
                y en{" "}
                <Link href="/aviso-de-privacidad" className="font-semibold text-accent underline-offset-2 hover:underline">
                  esta página
                </Link>
                .
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
