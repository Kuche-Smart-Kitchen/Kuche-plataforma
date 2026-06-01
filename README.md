# Ecosistema Digital Küche

El **Ecosistema Digital Küche** es una plataforma web híbrida diseñada y desarrollada para una empresa especializada en cocinas inteligentes. El proyecto resuelve la dependencia de procesos manuales y la falta de herramientas estandarizadas mediante la integración de una interfaz pública de alta conversión y un potente sistema administrativo interno.

---

## Características Clave del Sistema

* **Landing Page de Alta Conversión:** Interfaz optimizada para la captación automatizada de clientes potenciales y presentación estética de productos de alta gama.
* **Sistema Administrativo Interno:** Módulos diseñados para la digitalización operativa, incluyendo el registro digital de levantamientos técnicos, asignación de citas y tableros de control de producción.
* **Motor de Cotización Automatizado:** Lógica de negocio y formularios dinámicos para la generación automática de presupuestos precisos.
* **Módulo de Seguimiento en Tiempo Real:** Interfaz interactiva donde los clientes finales pueden monitorear el estado de fabricación de sus proyectos, consultar recibos de pago y revisar periodos de garantía.
* **Estrategia Híbrida de Renderizado:** Uso de SSR/SSG en Next.js para optimizar de forma masiva el rendimiento de carga y el posicionamiento SEO.

---

## Stack Tecnológico

* **Frontend:** Next.js (React), TypeScript, Tailwind CSS
* **Backend:** Express.js, Node.js
* **Base de Datos:** MongoDB
* **Gestión de Proyecto:** Metodología Ágil (SCRUM)

---

## Equipo de Desarrollo y Créditos

Este ecosistema fue planificado, diseñado y construido en colaboración por:

* **Alejandro Monreal** — *Frontend Lead & Product Strategy*  
  Desarrollo de la arquitectura de la interfaz con Next.js/TypeScript, diseño de la experiencia de usuario (UI/UX), integración del motor de cotizaciones dinámicas y lógica de consumo de APIs.
  * [GitHub](https://github.com/Monreal-Alejandro) | [LinkedIn](https://www.linkedin.com/in/monreal-alejandro)

* **Gael Valles** — *Full Stack Engineer / Backend Lead*  
   Diseño y arquitectura del backend en Express, modelado de esquemas en MongoDB, lógica de autenticación y despliegue del servidor.
  

---

##  Desarrollo Local

1. **Clonar el repositorio:**
```bash
   git clone [https://github.com/Monreal-Alejandro/Kuche-plataforma.git](https://github.com/Monreal-Alejandro/Kuche-plataforma.git)


This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The repo is ready for Vercel deployment. Use the default Next.js framework detection, or rely on the included [vercel.json](vercel.json).

Before deploying, set these environment variables in the Vercel project settings:

- `NEXT_PUBLIC_API_URL`: base URL of your backend API.
- `NEXT_PUBLIC_FILE_UPLOAD_ENDPOINT`: upload endpoint used by the frontend.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: optional captcha site key.

Use [.env.example](.env.example) as the template for local and production values.

If your backend is deployed separately, make sure it is reachable from Vercel over HTTPS and that CORS allows requests from the frontend domain.
