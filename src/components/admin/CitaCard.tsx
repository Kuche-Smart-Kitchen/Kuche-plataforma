"use client";

import { Calendar, MapPin } from "lucide-react";
import { Cita } from "@/lib/axios/citasApi";

interface CitaCardProps {
  cita: Cita;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
}

export default function CitaCard({ cita, onClick, onDragStart }: CitaCardProps) {
  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-MX', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNombreIngeniero = () => {
    if (!cita.ingenieroAsignado) return 'Sin asignar';
    if (Array.isArray(cita.ingenieroAsignado)) {
      const nombres = cita.ingenieroAsignado.map((item) => (typeof item === 'string' ? item : item.nombre)).filter(Boolean);
      return nombres.length > 0 ? nombres.join(', ') : 'Sin asignar';
    }
    if (typeof cita.ingenieroAsignado === 'string') return 'Asignado';
    return cita.ingenieroAsignado.nombre;
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="group cursor-move rounded-lg border border-gray-200 bg-white p-3.5 transition hover:border-gray-300 hover:shadow-sm"
    >
      <h4 className="text-sm font-medium text-primary line-clamp-1">
        {cita.nombreCliente}
      </h4>
      
      <div className="mt-2 space-y-1.5 text-xs text-secondary">
        {cita.ubicacion && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="line-clamp-1">{cita.ubicacion}</span>
          </div>
        )}
        
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3 flex-shrink-0" />
          <span>{formatearFecha(cita.fechaAgendada)}</span>
        </div>
        
        <div className="text-xs text-secondary/70">
          {getNombreIngeniero()}
        </div>
      </div>
    </div>
  );
}
