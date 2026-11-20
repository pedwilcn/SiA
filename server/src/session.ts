import type { Request, Response, NextFunction } from 'express';

let activeDek: Buffer | null = null;

export function getDek(): Buffer | null {
  return activeDek;
}

export function setDek(dek: Buffer | null): void {
  if (activeDek && activeDek !== dek) {
    activeDek.fill(0);
  }
  activeDek = dek;
}

export function requireUnlocked(req: Request, res: Response, next: NextFunction): void {
  if (!activeDek) {
    res.status(401).json({ error: 'Sessão bloqueada. Informe seu PIN para continuar.' });
    return;
  }
  next();
}
