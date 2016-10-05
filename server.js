"use strict";

/**
 * App dependencies
 */

var http         = require('http');
var debug        = require('debug')('myapp:server');
var express      = require('express');
var helmet       = require('helmet');
var path         = require('path');
var morgan       = require('morgan');
var winston      = require('winston');
var cookieParser = require('cookie-parser');
var cookie       = require('cookie');
var bodyParser   = require('body-parser');
var favicon      = require('serve-favicon');
var fs           = require('fs'); //File System
var _            = require('lodash');
var errorhandler = require('errorhandler');
var colors       = require( "colors" );
var validator    = require('validator');
var handlebars   = require('express-handlebars');

/**
 *  Load environment file in given directory.
 */
try {
    fs.accessSync('./.env', fs.F_OK);
} catch (e) {
    console.log('Unable to read the environment file at .env ');
    console.log('Make sure .env is on the root folder.');
    process.exit(1); //To exit with a 'failure' code:
}

/**
 * Load our environment configuration value
 * normalize our configuration value
 */

var dotenv      = require('dotenv');
dotenv.config();

var config       = require('./configs/app');

console.log('[*] Enviroment->NODE_ENV: ' + config.env);
console.log('[*] Enviroment->DEBUG: ' + config.debug);

/**
 * Configure express
 */

var app = express();
var server = http.createServer(app);
var port = normalizePort(config.port || '5000');
app.set('port', port);


/**
 * Adding Security
 */

app.use(helmet());
app.use(helmet.hidePoweredBy({ setTo: 'Microsoft-IIS/8.0' }));
app.set('trust proxy',['loopback', 'linklocal', 'uniquelocal','10.10.10.1','10.10.10.2']);
app.set('etag', false); // turn off

/**
 * Setting Log file folder
 */

var logDirectory = __dirname + '/logs';
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);
var accessLogStream = fs.createWriteStream(logDirectory + '/http-error.log', {flags: 'a'});
app.use(morgan('combined', {
    stream: accessLogStream, skip: function (req, res) {
        return res.statusCode < 400
    }
}));

/**
 * Setting winston as our logger
 */

var logger = new (winston.Logger)({
    level: 'info',
    transports: [
        // new (winston.transports.Console)({ level: 'error' }),
        new (winston.transports.File)({
            name: 'info-file',
            filename: logDirectory + '/logger-info.log',
            level: 'info'
        }),
        new (winston.transports.File)({
            name: 'error-file',
            filename: logDirectory + '/logger-error.log',
            level: 'error'
        })
    ],
    exitOnError: false,
    exceptionHandlers: [
        new (winston.transports.Console)({ level: 'error' }),
        new winston.transports.File({ filename: logDirectory + '/logger-exceptions.log' })
    ]
});

/**
 * Setting handlebars as our view engine
 */
app.set('views', path.join(__dirname, 'views'));
app.engine('.hbs', handlebars({defaultLayout: 'main', extname: '.hbs'})); // Register `hbs` as our view engine
app.set('view engine', '.hbs');

/**
 * Setting App middlewares
 */

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

/**
 * Serving static files
 */
app.use(express.static(path.join(__dirname, 'public')));
app.use('/view', express.static(__dirname + '/public'));

/**
 * Setting our Routes
 */
var routes  = require('./routes/index');
app.use('/', routes);

/**
 * catch 404 and forward to error handler
 */

app.use(function(req, res, next){
    res.status(404).json({ code: 404 }).end();
});

/**
 * production or development  error handler
 */

if (app.get('env') === 'production') {

    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {message: 'see log', error: {}});
        logger.error(err);
    });

}

if (app.get('env') === 'development') {

    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
        logger.error(err);
    });

}

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port,'0.0.0.0', function(){
    console.log('[*] HTTP Parser: ' + process.versions.http_parser);
    console.log('[*] Node Version: ' + process.versions.node);
    console.log('[*] Node Engine: ' + process.versions.v8);
    console.log('[*] OpenSSL: ' + process.versions.openssl);
    console.log('[*] zLib: ' + process.versions.zlib);
    console.log('[*] Running....Listening on 0.0.0.0:5000' );

    setInterval( function(){
        var mem = parseInt( process.memoryUsage().rss / ( 1024 * 1204 ), 10 );
        if( mem < 50 ){
            mem = colors.blue("" + mem )
        } else if( mem > 70 && mem <= 100){
            mem = colors.yellow( "" + mem )

        } else if( mem > 100 && mem < 200 ) {
            mem = ( "" + mem ).yellowBG.black.bold;
        }else if( mem > 200 ){
            mem = ("" + mem ).red.bold;
        } else{
            mem = colors.green( "" + mem );
        }
        console.log(
            "Server Load Process %s >> %s mb", process.pid, mem
        );
    }, 60*1000); //1*60*1000

});

server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    var bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
    var addr = server.address();
    var bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    debug('Listening on ' + bind);
}