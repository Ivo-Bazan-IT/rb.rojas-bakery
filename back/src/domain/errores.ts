/** Error de regla de negocio. La capa HTTP lo traduce a 422. */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}
