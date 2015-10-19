var gulp         = require('gulp');
var babel        = require('gulp-babel');
var runSequence  = require('run-sequence');
var bundle       = require('./scripts/bundle');
var rename       = require('gulp-rename');
var uglify       = require('gulp-uglify');
var del          = require('del');

var files = [
    'modules/index.js'
];

var globalWrapper = {
    header: '\n(function (window) {\n',
    footer: '\n}(window));\n',
    export: '\n\n    window.router5ListenersPlugin = listenersPlugin;\n'
}

var amdWrapper = {
    header: "\ndefine('router5ListenersPlugin', [], function () {\n",
    footer: '\n});\n',
    export: '\n\n    return listenersPlugin;'
}

function build(modules, dest) {
    return function() {
        return gulp
            .src(files, {base: 'modules'})
            .pipe(babel({modules: modules}))
            .pipe(gulp.dest(dest));
    };
}

function buildBundle(dest, wrapper) {
    return function() {
        return gulp
            .src(files)
            .pipe(babel({modules: 'ignore', blacklist: ['strict']}))
            .pipe(bundle(dest, wrapper))
            .pipe(gulp.dest('dist'))
            .pipe(uglify())
            .pipe(rename(dest + '/router5-listeners.min.js'))
            .pipe(gulp.dest('dist'));
    };
}

gulp.task('clean', function() {
    return del(['dist']);
});

gulp.task('buildCommonJs', build('common', 'dist/commonjs'));
gulp.task('buildUmd',      build('umd', 'dist/umd'));
// gulp.task('buildTest',     build('ignore', 'temp/test'));/
gulp.task('buildGlobal',   buildBundle('browser', globalWrapper));
gulp.task('buildAmd',      buildBundle('amd', amdWrapper));

gulp.task('build', function() {
    runSequence('clean', ['buildCommonJs', 'buildUmd', 'buildGlobal', 'buildAmd'/*, 'buildTest'*/]);
});
