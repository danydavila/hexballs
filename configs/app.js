var config = {
    env: process.env.NODE_ENV || 'development',
    debug: process.env.DEBUG || false,
    port: process.env.PORT || 5000,
    redis: {
        port: process.env.REDIS_PORT || 6379,
        auth_pass: process.env.REDIS_PASSWORD || '',
        host: process.env.REDIS_HOST || '127.0.0.1'
    }
};

module.exports = config;