/* Login de la única usuaria: email + contraseña (bcrypt) y JWT en cookie httpOnly.
   Incluye cambio de contraseña y un freno a los intentos fallidos de login. */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import type { NextFunction, Request, Response } from 'express';
import type { Db } from '../core/db.ts';
import { Controlador } from '../core/Controlador.ts';
import { DatosInvalidos, NoAutorizado } from '../core/errores.ts';

const COOKIE = 'rb_sesion';
const DURACION_DIAS = 30;
/** En producción JWT_SECRET es obligatorio: con una clave conocida cualquiera podría falsificar una sesión. */
export function verificarSecreto() {
  if (process.env.NODE_ENV === 'production' && (process.env.JWT_SECRET ?? '').length < 32) {
    throw new Error('En producción, JWT_SECRET es obligatorio y tiene que tener al menos 32 caracteres.');
  }
}
const secreto = () => process.env.JWT_SECRET || 'solo-para-desarrollo-local';

const esquemaLogin = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) });
const esquemaCambio = z.object({
  actual: z.string().min(1, 'Ingresá tu contraseña actual.'),
  nueva: z.string().min(8, 'La contraseña nueva tiene que tener al menos 8 caracteres.').max(200),
});

/** Freno a la fuerza bruta: 5 intentos fallidos por IP cada 15 minutos.
    En Vercel cada instancia lleva su propia cuenta: frena intentos masivos, no es un bloqueo exacto. */
const MAX_FALLOS = 5;
const VENTANA_MS = 15 * 60_000;
const fallos = new Map<string, { n: number; desde: number }>();
function bloqueado(ip: string) {
  const f = fallos.get(ip);
  if (!f) return false;
  if (Date.now() - f.desde > VENTANA_MS) { fallos.delete(ip); return false; }
  return f.n >= MAX_FALLOS;
}
function registrarFallo(ip: string) {
  const f = fallos.get(ip);
  if (!f || Date.now() - f.desde > VENTANA_MS) fallos.set(ip, { n: 1, desde: Date.now() });
  else f.n++;
}

export class ServicioAuth {
  private readonly db: Db;
  constructor(db: Db) { this.db = db; }

  async login(body: unknown) {
    const r = esquemaLogin.safeParse(body);
    if (!r.success) throw new DatosInvalidos('Ingresá tu email y tu contraseña.');
    const u = await this.db.usuario.findUnique({ where: { email: r.data.email } });
    if (!u || !(await bcrypt.compare(r.data.password, u.passwordHash))) throw new NoAutorizado('El email o la contraseña no coinciden.');
    const token = jwt.sign({ sub: u.id }, secreto(), { expiresIn: `${DURACION_DIAS}d` });
    return { token, usuario: { id: u.id, email: u.email, nombre: u.nombre } };
  }

  async cambiarPassword(id: number, body: unknown) {
    const r = esquemaCambio.safeParse(body);
    if (!r.success) throw new DatosInvalidos(r.error.issues[0]?.message ?? 'Revisá los datos.');
    const u = await this.db.usuario.findUnique({ where: { id } });
    if (!u) throw new NoAutorizado();
    if (!(await bcrypt.compare(r.data.actual, u.passwordHash))) throw new DatosInvalidos('La contraseña actual no es correcta.');
    if (r.data.actual === r.data.nueva) throw new DatosInvalidos('La contraseña nueva tiene que ser distinta de la actual.');
    await this.db.usuario.update({ where: { id }, data: { passwordHash: await bcrypt.hash(r.data.nueva, 10) } });
    return { ok: true };
  }

  async usuario(id: number) {
    const u = await this.db.usuario.findUnique({ where: { id } });
    if (!u) throw new NoAutorizado();
    return { id: u.id, email: u.email, nombre: u.nombre };
  }

  verificar(token: string | undefined): number {
    if (!token) throw new NoAutorizado();
    try {
      const p = jwt.verify(token, secreto()) as unknown as { sub: number };
      return Number(p.sub);
    } catch {
      throw new NoAutorizado('Tu sesión venció. Ingresá de nuevo.');
    }
  }

  /** Middleware: corta las rutas privadas si no hay sesión. */
  middleware() {
    return (req: Request, _res: Response, next: NextFunction) => {
      try {
        (req as Request & { usuarioId?: number }).usuarioId = this.verificar(req.cookies?.[COOKIE]);
        next();
      } catch (e) { next(e); }
    };
  }
}

export class ControladorAuth extends Controlador {
  readonly ruta = '/auth';
  private readonly servicio: ServicioAuth;

  constructor(servicio: ServicioAuth) {
    super();
    this.servicio = servicio;
    this.router.post('/login', this.h(async (req, res) => {
      const ip = req.ip ?? 'desconocida';
      if (bloqueado(ip)) { res.status(429); return { error: 'Demasiados intentos fallidos. Esperá 15 minutos y probá de nuevo.' }; }
      let sesion: Awaited<ReturnType<ServicioAuth['login']>>;
      try { sesion = await this.servicio.login(req.body); } catch (e) { if (e instanceof NoAutorizado) registrarFallo(ip); throw e; }
      fallos.delete(ip);
      const { token, usuario } = sesion;
      // secure: en producción la cookie viaja solo por HTTPS.
      res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: DURACION_DIAS * 864e5, path: '/' });
      return usuario;
    }));
    this.router.post('/logout', this.h(async (_req, res) => { res.clearCookie(COOKIE, { path: '/' }); return { ok: true }; }));
    this.router.post('/cambiar-password', this.h(async (req) => this.servicio.cambiarPassword(this.servicio.verificar(req.cookies?.[COOKIE]), req.body)));
    this.router.get('/me', this.h(async (req) => this.servicio.usuario(this.servicio.verificar(req.cookies?.[COOKIE]))));
  }
}
