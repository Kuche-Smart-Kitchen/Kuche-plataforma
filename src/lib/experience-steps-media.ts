/**
 * Imágenes del proceso Küche (pasos 1–6): una sola fuente para el carrusel 3D del home
 * y para la página `/experiencia`.
 */
export type ExperienceStepMedia = {
  id: string;
  image: string;
  /** Paso 5 (portal): mismo tratamiento que en `Experience3D` (UI / capturas). */
  imageFit?: "cover" | "contain";
};

export const EXPERIENCE_STEP_MEDIA: readonly ExperienceStepMedia[] = [
  {
    id: "paso-01",
    image: "/images/home/experiencia-3d/slide-01-cita-domicilio.jpg",
  },
  {
    id: "paso-02",
    image: "/images/home/experiencia-3d/slide-02-diseno-cotizacion.jpeg",
  },
  {
    id: "paso-03",
    image: "/images/home/experiencia-3d/slide-03-realidad-virtual.jpg",
  },
  {
    id: "paso-04",
    image: "/images/home/experiencia-3d/slide-04-cortes-cnc.jpeg",
  },
  {
    id: "paso-05",
    image: "/images/home/experiencia-3d/slide-05-seguimiento-portal.jpeg",
    imageFit: "contain",
  },
  {
    id: "paso-06",
    image: "/images/home/experiencia-3d/slide-06-instalacion-entrega.jpg",
  },
];
