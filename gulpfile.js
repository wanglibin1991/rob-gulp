const { src, dest } = require('gulp')
// npm i gulp-sass sass
// const sass = require('gulp-sass')(require('sass'));
// npm i gulp-babel
// const babel = require('gulp-babel');

// 通过gulp-load-plugins加载需要的插件
// 去掉 gulp- 前缀后 - 使用驼峰明明 gulp-a-b => aB
const loadPlugins = require('gulp-load-plugins')
const plugins = loadPlugins()



// 编译scss文件的任务
const style = (done) => {
    const read = src('./src/assets/styles/*.scss', { base: 'src' })
    const write = dest('./temp')
    // 只会转换没有下划线开头的sass文件 引用_开头的文件
    // outputStyle: 'expanded' 转换后的文件完全展开(选择器结束}会换行)          // 以流的方式更新浏览器
    read.pipe(plugins.sass(require('sass'))()).pipe(write).pipe(bs.reload({ stream: true }))
    done()
}

const scripts = (done) => {
    return src('./src/assets/scripts/*.js', { base: './src' }).pipe(plugins.babel({
        presets: [
            '@babel/preset-env'
        ]
    })).pipe(dest('./temp')).pipe(bs.reload({ stream: true }))
}

// 转换hmtl的数据模板
const data = {
    menus: [
        {
            name: 'Home',
            icon: 'aperture',
            link: 'index.html'
        },
        {
            name: 'Features',
            link: 'features.html'
        },
        {
            name: 'About',
            link: 'about.html'
        },
        {
            name: 'Contact',
            link: '#',
            children: [
                {
                    name: 'Twitter',
                    link: 'https://twitter.com/w_zce'
                },
                {
                    name: 'About',
                    link: 'https://weibo.com/zceme'
                },
                {
                    name: 'divider'
                },
                {
                    name: 'About',
                    link: 'https://github.com/zce'
                }
            ]
        }
    ],
    pkg: require('./package.json'),
    date: new Date()
}
// npm i gulp-swig
// 转换模板
// src('./src/**/*') 匹配所有子目录的文件
// const swig = require('gulp-swig')
const htmlParser = () => {
    const read = src('./src/*.html', { base: './src' })
    const write = dest('./temp')
    return read.pipe(plugins.swig({ data, defaults: { cache: false } })).pipe(write).pipe(bs.reload({ stream: true }))
}

// 图片转换 gulp-imagemin
// const gulpImagemin = require('gulp-imagemin')
const imgParser = () => {
    return src('./src/assets/images/**', { base: './src' }).pipe(plugins.imagemin()).pipe(dest('./dist')).pipe(bs.reload({ stream: true }))
}
//字体转换也用gulp-imagemin
const fontParser = () => {
    return src('./src/assets/fonts/**', { base: './src' }).pipe(plugins.imagemin()).pipe(dest('./dist')).pipe(bs.reload({ stream: true }))
}

// 额外的文件就直接copy过去
const extra = () => {
    return src('./public/**').pipe(dest('./dist/public')).pipe(bs.reload({ stream: true }))
}

// del包 是个promise方法 删除指定文件 
const del = require('del')
const clean = () => {
    return del(['dist'])
}

// 处理dist文件的css js 引用问题
const useref = () => {
    return src('temp/*.html', { base: 'temp' })
        .pipe(// 通过html的构建注释来替换路径
            // . 是为了public的目录
            plugins.useref({
                searchPath: ['temp', '.']
            })
        ).pipe(
            // 对新创建的文件采取压缩等操作
            // 这里会产生三种类型 css js html
            // gulp-clean-css 用于压缩css
            // gulp-uglify 用于压缩js
            // gulp-htmlmin 用于压缩html
            // gulp-if 用于判断文件类型
            plugins.if(/\.js$/, plugins.uglify())
        ).pipe(
            plugins.if(/\.css$/, plugins.cleanCss())
        ).pipe(
            plugins.if(/\.html$/, plugins.htmlmin({ collapseWhitespace: true, minifyCSS: true, minifyJS: true }))
        ).pipe(
            dest('dist')
        )
}


// 组合任务
const { series, parallel } = require('gulp')
const compile = parallel(style, scripts, htmlParser)
// 先删除dist目录 再打包
const build = series(clean, parallel(series(compile, useref), imgParser, fontParser, extra))

// 热更新开发服务器
// cnpm i browser-sync
const browserSync = require('browser-sync')
const bs = browserSync.create()

// 监听源代码以更新代码
const { watch } = require('gulp')

const serve = () => {
    // 监视源代码修改 以 执行不同的编译任务 最后触发serve的监听
    watch('./src/assets/styles/*.scss', style)
    watch('./src/assets/scripts/*.js', scripts)
    watch('./src/*.html', htmlParser)

    // 通过一个watch 减少构件次数
    // 静态文件变化后刷新浏览器 不重新构建
    watch([
        './src/assets/images/**',
        './src/assets/fonts/**',
        './public/**'
    ], bs.reload())
    // 开发中不监听以下三类文件 仅在上线打包时拷贝这些目录 
    // 在开发服务器中 启动相应目录以应对
    // watch('./src/assets/images/**', imgParser)
    // watch('./src/assets/fonts/**', fontParser)
    // watch('./public/**', extra)

    bs.init({
        // 关闭页面右上角的已连接提示
        notify: false,
        // 服务器端口 默认3000
        port: 2020,
        // 任务完成后自动打开默认浏览器
        open: true,
        // files指定一个字符串, 热更新需要监听的文件(现在是dist) 不写就去任务里pipe一个bs.reaload
        // files: 'dist/**',
        server: {
            // 启动三个目录以解决开发过程中img font pulic/* 文件的指向问题
            // 数组时会从前往后找对应文件  
            baseDir: ['temp', 'src', 'public'],
            // 优先于baseDir 的 代理
            routes: {
                '/node_modules': 'node_modules'
            }
        }
    })
}
// 开发阶段不编译静态文件
const dev = series(compile, serve)


// module.exports = {
//     style,
//     scripts,
//     htmlParser,
//     imgParser,
//     fontParser,
//     extra,
//     compile,
//     build,
//     serve,
//     clean,
//     dev,
//     useref
// }

// 只导出外面需要用的任务
// 可写入到package.json中, npm run 调用
module.exports = {
    clean,
    build,
    dev
}