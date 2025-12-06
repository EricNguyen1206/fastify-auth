// src/routes/auth/signin.route.js
// Signin route

import { signin, createAuthSession } from "../../services/auth.service.js";
import { config } from "../../configs/variables.js";

export default async function signinRoute(fastify, options) {
  fastify.post(
    "/auth/signin",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: 15 * 60 * 1000, // 5 attempts per 15 minutes
        },
      },
      schema: {
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      try {
        const user = await signin(email, password);

        // Create session and tokens
        const { accessToken, refreshToken } = await createAuthSession(
          user,
          fastify.jwt
        );

        // Set cookies
        reply.setCookie("token", accessToken, {
          httpOnly: true,
          secure: !config.isDev,
          sameSite: "strict",
          maxAge: 15 * 60, // 15 minutes
        });

        reply.setCookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: !config.isDev,
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60, // 7 days
        });

        // Audit log: Successful signin
        fastify.log.info(
          {
            audit: {
              event: "signin_success",
              userId: user.id,
              email: user.email,
              ip: request.ip,
              userAgent: request.headers["user-agent"],
            },
          },
          `User logged in: ${email}`
        );

        return reply.send({
          message: "Login successful",
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
          },
        });
      } catch (error) {
        // Audit log: Failed signin attempt
        fastify.log.warn(
          {
            audit: {
              event: "signin_failed",
              email,
              ip: request.ip,
              userAgent: request.headers["user-agent"],
              reason: error.message,
            },
          },
          `Failed signin attempt for ${email}`
        );

        throw error;
      }
    }
  );
}
