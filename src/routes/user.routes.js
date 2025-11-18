async function userRoutes(fastify, options) {
    const db = fastify.sqlite.db;

    // Controller placeholder
    // Lấy thông tin profile của user hiện tại
    fastify.get('/profile', {
        preHandler: fastify.authenticate,
    }, async (request, reply) => {
        const userId = request.user.id;
        const row = await new Promise((resolve, reject) => {
            db.get(
                "SELECT id, email, username, created_at FROM users WHERE id = ?",
                [userId],
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
            reply.status(404).send({ error: "User không tồn tại." });
            return;
        }

        reply.send({ user: row });
    });

    // Cập nhật username của user hiện tại
    fastify.put('/profile', {
        preHandler: fastify.authenticate,
        schema: {
            body: {
                type: 'object',
                required: ['username'],
                properties: {
                    username: { 
                        type: 'string',
                        minLength: 3,
                        maxLength: 50
                    }
                }
            }
        }
    }, async (request, reply) => {
        const userId = request.user.id;
        const { username } = request.body;
        
        const stmt = db.prepare(
            "UPDATE users SET username = ? WHERE id = ?"
        );
        stmt.run(username, userId, function(err) {
            if (err) {
                reply.status(500).send({ error: "Lỗi khi cập nhật username." });
                return;
            }

            if (this.changes === 0) {
                reply.status(404).send({ error: "User không tồn tại." });
                return;
            }

            reply.send({ message: "Cập nhật username thành công." });
        });
    });
}

module.exports = userRoutes;