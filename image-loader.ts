export type ImageLoaderProps = {
  src: string;
  width: number;
  quality?: number;
};

export default function customLoader({ src }: ImageLoaderProps) {
  // No optimizamos nada, solo devolvemos la imagen tal cual.
  return src;
}
