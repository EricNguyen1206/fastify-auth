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
    const { username, password } = request.body;

    // Validate dữ liệu
    if (!username || !password) {
      reply.status(400).send({ error: "Username và password là bắt buộc." });
      return;
    }

    // Hash password và lưu user vào DB
    const userId = fastify.sqlite.generateUUID();
    const stmt = db.prepare(
      "INSERT INTO users (id, username, password) VALUES (?, ?, ?)"
    );
    const hashedPassword = await bscrypt.hash(password, 10);
    stmt.run(userId, username, hashedPassword, function (err) {
      if (err) {
        reply.status(500).send({ error: "Lỗi khi tạo user." });
        return;
      }

      reply.status(201).send({ message: "Đăng ký thành công", username });
      return 
    });
  });

  // Route Sign In
  fastify.post("/signin", async (request, reply) => {
    // TODO: Gọi controller/service để xử lý đăng nhập
    const { username, password } = request.body;

    // Validate dữ liệu
    if (!username || !password) {
      reply.status(400).send({ error: "Username và password là bắt buộc." });
      return;
    }

    const row = await new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM users WHERE username = ?",
        [username],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });

    if (!row) {
      reply.status(401).send({ error: "Tên đăng nhập hoặc mật khẩu không đúng." });
      return;
    }

    const passwordMatch = await bscrypt.compare(password, row.password);
    if (!passwordMatch) {
      reply.status(401).send({ error: "Tên đăng nhập hoặc mật khẩu không đúng." });
      return;
    }

    // Trả về token
    const accessToken = fastify.jwt.sign({ username }, { expiresIn: '15m' });
    const refreshToken = fastify.jwt.sign({ username }, { expiresIn: '7d' });
    
    // Lưu accessToken, refreshToken vào cookie
    reply.setCookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/api/v1/',
      maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
    });
    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/api/v1/auth/refresh-token',
      maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
    });


    // Lưu refreshToken vào database
    const sessionId = fastify.sqlite.generateUUID();
    const stmt = db.prepare(
      "INSERT INTO sessions (id, user_id, token) VALUES (?, ?, ?)"
    );
    stmt.run(sessionId, row.id, refreshToken, function (err) {
      if (err) {
        reply.status(500).send({ error: "Lỗi khi tạo session." });
        return;
      }
    });

    reply.send({ message: "Đăng nhập thành công", accessToken, refreshToken });

    return;
  });

  // Route Refresh Token
  fastify.post("/refresh-token", async (request, reply) => {
    const { refreshToken } = request.cookies;

    if (!refreshToken) {
      reply.status(401).send({ error: "Refresh token không tồn tại." });
      return;
    }

    const validToken = await new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM sessions WHERE token = ?",
        [refreshToken],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });

    if (!validToken) {
      reply.status(401).send({ error: "Refresh token không hợp lệ." });
      return;
    }

    // Tạo access token mới
    const payload = fastify.jwt.decode(refreshToken);
    const newAccessToken = fastify.jwt.sign(
      { username: payload.username },
      { expiresIn: '15m' }
    );

    // Cập nhật cookie accessToken
    reply.setCookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/api/v1/',
      maxAge: 15 * 60 // 15 minutes in seconds
    });

    return { message: "Token làm mới thành công (TODO: Thêm logic)" };
  });

  // Route Sign Out
  fastify.post("/signout", async (request, reply) => {
    const { refreshToken } = request.cookies;

    if (refreshToken) {
      // Xóa session khỏi database
      const stmt = db.prepare(
        "DELETE FROM sessions WHERE token = ?"
      );
      stmt.run(refreshToken, function (err) {
        if (err) {
          reply.status(500).send({ error: "Lỗi khi xóa session." });
          return;
        }
      });
    }

    // Xóa cookie
    reply.clearCookie('accessToken', { path: '/api/v1/' });
    reply.clearCookie('refreshToken', { path: '/api/v1/auth/refresh-token' });
    return { message: "Đăng xuất thành công (TODO: Thêm logic)" };
  });
}

module.exports = authRoutes;
