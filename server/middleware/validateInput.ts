import { Request, Response, NextFunction } from 'express';
import { Schema } from 'joi';

export function validateBody(schema: Schema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const details = error.details.map((d) => d.message).join(', ');
      res.status(400).json({ error: `Validation error: ${details}` });
      return;
    }
    req.body = value;
    next();
  };
}

export function validateQuery(schema: Schema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, { abortEarly: false, stripUnknown: true });
    if (error) {
      const details = error.details.map((d) => d.message).join(', ');
      res.status(400).json({ error: `Validation error: ${details}` });
      return;
    }
    req.query = value;
    next();
  };
}
