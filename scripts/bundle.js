var through  = require('through2');
var File     = require('vinyl');
var fs       = require('fs');
var path     = require('path');

module.exports = function bundle(destFolder, wrapper) {
    var babelHelpers = [
        { regex: /^(?:.*)var _createClass(?:.*)$/,           found: false },
        { regex: /^(?:.*)function _classCallCheck(?:.*)$/,   found: false },
        { regex: /^(?:.*)var _slicedToArray =(?:.*)$/,       found: false },
        { regex: /^(?:.*)var _extends =(?:.*)$/,             found: false }
    ];
    var buffer = [];
    var pkgVersion = require('../package.json').version;

    return through(
        { objectMode: true },
        function (file, enc, cb) {
            buffer.push(file.contents.toString());
            cb();
        },
        function (cb) {
            var license = fs.readFileSync(path.join(__dirname, '..', 'LICENSE'))
                .toString().trim().split('\n')
                .map(function (line) {
                    return ' * ' + line;
                })
                .join('\n');

            var bundleContents = '/**\n * @license\n * @version ' + pkgVersion + '\n' + license + '\n */' +
                wrapper.header + buffer
                    .join('\n')
                    .split('\n')
                    .filter(function(line) {
                        if (/^module.exports/.test(line)) return false;
                        for (var i = 0; i < babelHelpers.length; i += 1) {
                            if (babelHelpers[i].regex.test(line)) {
                                if (babelHelpers[i].found === false) {
                                    babelHelpers[i].found = true;
                                    return true;
                                }
                                return false;
                            }
                        }
                        return true;
                    })
                    .map(function(line) {
                        return '    ' + line;
                    })
                    .join('\n') +
                wrapper.export + wrapper.footer;

            this.push(new File({
                cwd: process.cwd(),
                base: 'dist',
                path: 'dist/' + destFolder + '/router5-listeners.js',
                contents: new Buffer(bundleContents)
            }));
        }
    );
}
