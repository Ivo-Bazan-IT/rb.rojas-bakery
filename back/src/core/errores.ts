/** Error con código HTTP. Los servicios lanzan estos; el manejador de errores los responde. */
export class HttpError extends Error {
  readonly status: number;
  readonly detalles?: unknown;
  constructor(status: number, message: string, detalles?: unknown) {
    super(message);
    this.status = status;
    this.detalles = detalles;
  }
}

export class NoEncontrado extends HttpError {
  constructor(que = 'El registro') { super(404, `${que} no existe.`); }
}
export class NoAutorizado extends HttpError {
  constructor(message = 'Tenés que iniciar sesión.') { super(401, message); }
}
export class Conflicto extends HttpError {
  constructor(message: string) { super(409, message); }
}
export class DatosInvalidos extends HttpError {
  constructor(message: string, detalles?: unknown) { super(400, message, detalles); }
}
