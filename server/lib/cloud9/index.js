/**
 * @copyright 2010, Ajax.org Services B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
require("../../../support/paths");

var Connect = require("connect");
var IO = require("socket.io");
var Fs = require("fs");
var Path = require("path");
var IdeServer = require("./ide");
var middleware = require("./middleware");

exports.main = function(options) {
    var projectDir = options.workspace,
        port = options.port,
        ip = options.ip,
        user = options.user,
        group = options.group;
        
    if (!Path.existsSync(projectDir)) 
        throw new Error("Workspace directory does not exist: " + projectDir);
        
    var ideProvider = function(projectDir, server) {
        // load plugins:
        var exts = {};
        Fs.readdirSync(Path.normalize(__dirname + "/../../ext")).forEach(function(name){
            exts[name] = require("ext/" + name);
        });
        
        // create web socket
        var options = {
            transports:  ['websocket', 'htmlfile', 'xhr-multipart', 'xhr-polling', 'jsonp-polling']
        };
        var socketIo = IO.listen(server, options);
        
        var ide = new IdeServer(projectDir, server, socketIo, exts);
        
        return function(req, res, next) {
            ide.handle(req, res, next);
        }
    }
    
    var server = Connect.createServer();
    //server.use(Connect.logger());
    server.use(Connect.conditionalGet());
    //server.use(Connect.gzip());
    server.use(ideProvider(projectDir, server));
    server.use(middleware.staticProvider(Path.normalize(__dirname + "/../../../support"), "/static/support"));
    server.use(middleware.staticProvider(Path.normalize(__dirname + "/../../../client"), "/static"));

    //obfuscate process rights if configured
    if (group)
        process.setgid(group);
    if (user)
        process.setuid(user);

    if (ip === "all" || ip === "0.0.0.0")
        ip = null;

    server.listen(port, ip);
};

process.on("uncaughtException", function(e) {
    console.log("uncaught exception:");
    //console.log(e.stack + "");
})

if (module === require.main) {
    exports.main({workspace: ".", port: 3000, ip: '127.0.0.1'})
}