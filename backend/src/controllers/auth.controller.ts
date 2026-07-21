import type { AuthUser, LoginRequest, LoginResponse, SuccessEnvelope } from "@flowerp/shared";
import type { Request, Response } from "express";
import { login as loginService, toAuthUser } from "../services/auth.service.js";
import { findUserById } from "../services/user.service.js";
import { NotFoundError } from "../utils/errors.js";

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.validated?.body as LoginRequest;
  const { token, user } = await loginService(email, password);

  const body: SuccessEnvelope<LoginResponse> = { data: { token, user } };
  res.status(200).json(body);
}

export async function me(req: Request, res: Response): Promise<void> {
  // req.user is guaranteed by the `authenticate` middleware this route is
  // mounted behind.
  const user = await findUserById(req.user!.id);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  const body: SuccessEnvelope<AuthUser> = { data: toAuthUser(user) };
  res.status(200).json(body);
}
