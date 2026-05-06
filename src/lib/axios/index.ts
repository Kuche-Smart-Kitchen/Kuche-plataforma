/**
 * Punto de entrada principal para todas las APIs
 * Exporta todas las funciones de API organizadas por módulo
 */

// Exportar configuración y tipos base
export { default as axiosInstance } from './axiosConfig';
export type { ApiResponse, ApiSuccessResponse, ApiErrorResponse } from './axiosConfig';

// Exportar APIs de autenticación
export * as authApi from './authApi';
export type {
  LoginCredentials,
  RegisterData,
  User,
  AuthResponse,
} from './authApi';

// Exportar APIs de levantamientos
export * as levantamientosApi from './levantamientosApi';
export type {
  ClienteLevantamiento,
  LevantamientoCreate,
  Levantamiento,
  HistorialEstado,
  LevantamientoFilters,
  CambiarEstadoData,
  AsignarEmpleadoData,
} from './levantamientosApi';

// Exportar APIs de cotizaciones
export * as cotizacionesApi from './cotizacionesApi';
export type {
  Medidas,
  HerrajeItem,
  CotizacionCreate,
  Cotizacion,
  HistorialEstadoCotizacion,
  CotizacionFilters,
  CambiarEstadoCotizacionData,
  CotizadorConfig,
} from './cotizacionesApi';

// Exportar APIs de catálogos
export * as catalogosApi from './catalogosApi';
export type {
  Material,
  Herraje,
} from './catalogosApi';

// Exportar APIs de usuarios
export * as usuariosApi from './usuariosApi';
export type {
  Usuario,
} from './usuariosApi';

// Exportar APIs de citas
export * as citasApi from './citasApi';
export type {
  ClienteCita,
  EspecificacionesInicio,
  CitaCreate,
  Cita,
  CitaUpdate,
  AsignarIngenieroData,
  IniciarCitaData,
  FinalizarCitaData,
  ActualizarEstadoData,
} from './citasApi';

// Exportar APIs de tareas (Kanban)
export * as tareasApi from './tareasApi';
export type {
  ArchivoTarea,
  Tarea,
  CrearTareaData,
  ActualizarTareaData,
  FiltrosTareas,
} from './tareasApi';

// Exportar APIs de kanban explícito por columna
export * as kanbanApi from './kanbanApi';
export type {
  KanbanItem,
} from './kanbanApi';

// Exportar API de workflow admin
export * as adminWorkflowApi from './adminWorkflowApi';

// Exportar API de seguimiento cliente
export * as seguimientoApi from './seguimientoApi';
export type {
  SeguimientoLoginResponse,
  SeguimientoProyectoResponse,
} from './seguimientoApi';

// Exportar APIs de clientes
export * as clientesApi from './clientesApi';
export type {
  ClienteResumen,
  PanelClienteResponse,
  PanelClienteCita,
  PanelClienteProyecto,
  PanelClienteTarea,
} from './clientesApi';

// Exportar API de archivos del cliente
export * as archivosClienteApi from './archivosClienteApi';
export type {
  ClienteArchivo,
  PanelArchivosResponse,
} from './archivosClienteApi';

// Exportar APIs de electrodomesticos y extras
export * as equipamientoApi from './equipamientoApi';
export type {
  Electrodomestico,
  ElectrodomesticoPayload,
  Extra,
  ExtraPayload,
  ExtraCategoria,
  ExtraCategoriaPayload,
  CloudinaryUploadResponse,
} from './equipamientoApi';

// Exportar API de configuración de levantamiento
export * as levantamientoConfigApi from './levantamientoConfigApi';
