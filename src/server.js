// PHẢI LUÔN IMPORT OTel CONFIG ĐẦU TIÊN (Nếu đã triển khai OTel)
// require('./config/opentelemetry.config'); 

const fastify = require('fastify');
require('dotenv').config();

// Khởi tạo Fastify Server
const server = fastify({
    logger: true // Bật logger mặc định của Fastify
});

const PORT = process.env.PORT || 8000;

/**
 * Hàm khởi động server
 */
async function startServer() {
    try {
        // Đăng ký Database Service
        // Đây là cách Fastify khuyến nghị để chia sẻ logic: sử dụng plugin
        server.decorate('db', require('./configs/db'));

        // Đăng ký Plugins
        server.register(require('@fastify/jwt'), {
            secret: process.env.JWT_SECRET || 'default_secret_key'
        });
        server.register(require('@fastify/cookie'));

        // Đăng ký Routes
        server.register(require('./routes/auth.routes'), { prefix: '/api/v1/auth' });

        server.decorate('authenticate', async function (request, reply) {
            try {
                await request.jwtVerify();
            } catch (err) {
                reply.code(401).send(new Error('Authentication failed: Invalid or missing token.'));
            }
        });

        await server.listen({ port: PORT, host: '0.0.0.0' });
        server.log.info(`Server đang chạy trên cổng ${PORT} - Instance ID: ${process.pid}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
}

startServer();