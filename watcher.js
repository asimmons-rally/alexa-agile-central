/**
 * @author Seth M.
 * 1) `npm install chokidar`
 * 2) Specifiy files to watch in `files` array
 */
var files = ['index.js'];
/*
 * 3) Specify what you want to happen on change
 */
var onChange = function(path) { 
    log("\n\n");
    log('--------------------------');
    //zipping all files that end with .js
    exec("zip -r ../Archive *; ls -l;", function (error, stdout, stderr) {
        sys.print('stdout: ' + stdout);
    });

    log('File', path, 'has been changed'); 
};
/**
 * 4) run `node watcher.js` to start
 * `ctrl c` to stop
 */

var chokidar = require('chokidar');
var sys = require('sys')
var exec = require('child_process').exec;


var watcher = chokidar.watch('file, dir, or glob', {
    ignored: /[\/\\]\./, persistent: true
});

var log = console.log.bind(console);

//options ['add', 'addDir', 'change', 'unlink', 'unlinkDir', 'error', 'ready', 'raw']
watcher
.on('change', onChange)

for (var i = 0; i < files.length; i++) {
    watcher.add(files[i]);
}