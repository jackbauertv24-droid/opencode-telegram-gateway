import { Context, NextFunction } from "grammy";
import { isUserApproved } from "../../store/users.js";
import { logger } from "../../logger.js";

export async function authMiddleware(
  ctx: Context,
  next: NextFunction
): Promise<void> {
  const userId = ctx.from?.id?.toString();

  if (!userId) {
    return;
  }

  const isCommand =
    ctx.message?.text?.startsWith("/") ||
    ctx.callbackQuery?.data?.startsWith("/");

  if (isCommand && ctx.message?.text === "/start") {
    return next();
  }

  if (!isUserApproved(userId)) {
    ctx.session = { ...(ctx.session || {}), approved: false };
    return next();
  }

  ctx.session = { ...(ctx.session || {}), approved: true };
  return next();
}

declare module "grammy" {
  interface Context {
    session?: {
      approved?: boolean;
      processing?: boolean;
    };
  }
}
