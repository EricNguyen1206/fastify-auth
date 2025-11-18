// Tạm thời, chúng ta sẽ sử dụng logic placeholder.
// Logic thực sự (signup, signin, refresh) sẽ nằm trong controllers

/**
 * Plugin Fastify cho các routes xác thực
 * @param {FastifyInstance} fastify
 * @param {object} options
 */
async function authRoutes(fastify, options) {
  const bscrypt = require("bcrypt");
  const { db } = fastify.sqlite;

  // Route Sign Up
  fastify.post("/signup", async (request, reply) => {
    // TODO: Gọi controller/service để xử lý đăng ký
    const { email, username, password } = request.body;

    // Validate dữ liệu
    if (!email || !username || !password) {
      reply
        .status(400)
        .send({ error: "Email, username và password là bắt buộc." });
      return;
    }

    // Hash password và lưu user vào DB
    const userId = fastify.sqlite.generateUUID();
    const stmt = db.prepare(
      "INSERT INTO users (id, email, username, password) VALUES (?, ?, ?, ?)"
    );
    const hashedPassword = await bscrypt.hash(password, 10);
    stmt.run(userId, email, username, hashedPassword, function (err) {
      if (err) {
        reply.status(500).send({ error: "Lỗi khi tạo user." });
        return;
      }

      reply.status(201).send({ message: "Đăng ký thành công", username });
      return;
    });
  });

  // Route Sign In
  fastify.post("/signin", async (request, reply) => {
    // TODO: Gọi controller/service để xử lý đăng nhập
    const { email, password } = request.body;

    // Validate dữ liệu
    if (!email || !password) {
      reply.status(400).send({ error: "Email và password là bắt buộc." });
      return;
    }

    const row = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });

    if (!row) {
      reply
        .status(401)
        .send({ error: "Email đăng nhập hoặc mật khẩu không đúng." });
      return;
    }

    const passwordMatch = await bscrypt.compare(password, row.password);
    if (!passwordMatch) {
      reply
        .status(401)
        .send({ error: "Email đăng nhập hoặc mật khẩu không đúng." });
      return;
    }

    // Trả về token
    const accessToken = fastify.jwt.sign(
      { userId: row.id, email: row.email },
      { expiresIn: "15m" }
    );
    const refreshToken = fastify.jwt.sign(
      { userId: row.id, email: row.email },
      { expiresIn: "7d" }
    );

    // Lưu refreshToken vào database
    const sessionId = fastify.sqlite.generateUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const stmt = db.prepare(
      "INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)"
    );
    stmt.run(
      sessionId,
      row.id,
      refreshToken,
      expiresAt.toISOString(),
      function (err) {
        if (err) {
          reply.status(500).send({ error: "Lỗi khi tạo session." });
          return;
        }
      }
    );

    // Lưu accessToken, refreshToken vào httpOnly cookie
    reply.setCookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/api/v1/",
      maxAge: 15 * 60, // 15 minutes in seconds
    });
    reply.setCookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/api/v1/",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    reply.send({ message: "Đăng nhập thành công", accessToken, refreshToken });

    return;
  });

  // Route Refresh Token
  fastify.post("/refresh", async (request, reply) => {
    const { refreshToken } = request.cookies;

    if (!refreshToken) {
      reply.status(401).send({ error: "Refresh token không tồn tại." });
      return;
    }

    try {
        // Xác thực refresh token
    const decoded = fastify.jwt.verify(refreshToken);
      const sessionRow = await db.get(
        'SELECT * FROM sessions WHERE token = ? AND user_id = ? AND expires_at > datetime("now")',
        [refreshToken, decoded.userId]
      );

      if (!sessionRow) {
        reply.status(401).send({ error: "Refresh token không hợp lệ." });
        return;
      }

      const newAccessToken = fastify.jwt.sign(
        { userId: decoded.userId, email: decoded.email },
        { expiresIn: "15m" }
      );

        // Cập nhật accessToken trong httpOnly cookie
        reply.setCookie("accessToken", newAccessToken, {
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
          path: "/api/v1/",
          maxAge: 15 * 60, // 15 minutes in seconds
        });

        return reply.send({ message: "Làm mới token thành công", accessToken: newAccessToken });

    } catch (err) {
      reply.status(500).send({ error: "Lỗi khi làm mới token." });
      return;
    }
  });

  // Route Sign Out
  fastify.post("/signout", { preHandler: fastify.authenticate }, async (request, reply) => {
    const { refreshToken } = request.cookies;

    if (refreshToken) {
      // Xóa session khỏi database
      const stmt = db.prepare("DELETE FROM sessions WHERE token = ?");
      stmt.run(refreshToken, function (err) {
        if (err) {
          reply.status(500).send({ error: "Lỗi khi xóa session." });
          return;
        }
      });
    }

    // Xóa cookie
    reply.clearCookie("accessToken", { path: "/api/v1/" });
    reply.clearCookie("refreshToken", { path: "/api/v1/" });
    return { message: "Đăng xuất thành công." };
  });
}

module.exports = authRoutes;
