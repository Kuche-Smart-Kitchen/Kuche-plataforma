"use client";

import MotionSection from "./MotionSection";
import ProjectCard from "./ProjectCard";

const projects = [
  {
    title: "Proyecto Residencial Navarro",
    description: "Cocina luminosa con madera natural y diseño funcional.",
    images: [
      "/images/home/proyecto-destacado-1/cocina-1.jpg",
      "/images/home/proyecto-destacado-1/render-uno.jpg",
      "/images/home/proyecto-destacado-1/plano1.jpg",
      "/images/home/proyecto-destacado-1/cocina-2.jpg",
    ],
  },
  {
    title: "Proyecto Loft Reforma",
    description: "Isla central protagonista y herrajes premium integrados.",
    images: [
      "/images/home/proyecto-destacado-2/cocina-1.jpg",
      "/images/home/proyecto-destacado-2/render-uno.jpg",
      "/images/home/proyecto-destacado-2/plano2.jpg",
      "/images/home/proyecto-destacado-2/cocina-2.jpg",
    ],
  },
  {
    title: "Proyecto Casa Bruma",
    description: "Paleta neutra con toques de color y textura elegante.",
    images: [
      "/images/home/proyecto-destacado-3/cocina-1.jpg",
      "/images/home/proyecto-destacado-3/render-uno.jpg",
      "/images/home/proyecto-destacado-3/plano1.jpg",
      "/images/home/proyecto-destacado-3/cocina-2.jpg",
    ],
  },
];

export default function FeaturedProjects() {
  return (
    <MotionSection className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-3xl font-semibold text-accent md:text-4xl">
          Proyectos Destacados
        </h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.title}
              title={project.title}
              description={project.description}
              images={project.images}
            />
          ))}
        </div>
      </div>
    </MotionSection>
  );
}
