const compression = require('compression')
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const needle = require('needle');
const emptyDir = require('empty-dir');
const log4node = require('log4node');
const log = new log4node.Log4Node({level: 'info', file: 'clipboard.log'});
const express = require('express');
const app = express();
 
setInterval(clearTrashFolders, 1000 * 1);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const separator = makeid();
        fs.mkdirSync(__dirname + '/uploads/' + separator);
        cb(null, 'uploads/' + separator)

    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now())
    }
});

const limits = {
    files: 1,
    fileSize: 101000000 // 100 MB
};

const upload = multer({
    storage: storage,
    limits: limits
});

log.info(app.get('env'));
app.disable('x-powered-by');
app.use(favicon(__dirname + '/public/favicon/favicon.ico'));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.engine('html', require('jade').renderFile);
//app.set("view options", {layout: false});

app
    .get('/', (req, res, next) => res.render('index.jade'));
    .get('/500', (req, res, next) => res.render('500.jade'));
    .get('/about', (req, res, next) => res.render('about.jade'));
    .get('/404', (req, res, next) => res.render('404.jade'));
    .get('/tos', (req, res, next) => res.render('tos.jade'));
    .get('/download/:folder/:filename', downloadFolderFilename);
    .post('/', upload.single('file'), uploadSingleFile);
//de onde vem esse upload.single ??

const uploadSingleFile = (req, res, next) => {
    const path = req.file.path;
    const newPath = path.substring(0, 14) + req.file.originalname;
    log.info(req.ip + "uploaded: " + req.file.originalname);
    fs.rename(path, newPath, (err) => {
        const downloadPath = newPath.substring(8, 13);
        const url = 'http://clipboard.host/download/' + downloadPath + '/' + req.file.originalname;

        needle.secrepath = newPath;
        needle.post('https://www.google.com/recaptcha/api/siteverify', {
            secret: '6LcZtQ0UAAAAAPr5MbPk2RTk1h2yVT2e8vtJfReU',
            response: req.body['g-recaptcha-response']
        }, (err, response, body) => {
            if (err) {
                deleteAfterUpload(__dirname + '/' + newPath, __dirname + '/' + dir, next, res);
                //next(Error('Not Found'));
            } else {
                if (body.success) {
                    res.send('The download link for your file is: ' + url);
                } else {
                    const dir = needle.secrepath.split('/')[0] + '/' + needle.secrepath.split('/')[1];
                    deleteAfterUpload(__dirname + '/' + newPath, __dirname + '/' + dir, next, res);
                    //next(Error('Not Found'));
                }
            }
        });
    });
  }

const downloadFolderFilename = (req, res, next) => {
    const filename = req.params.filename;
    const folder = req.params.folder;
    log.info(req.ip + "downloaded: " + folder + '\\' + filename);
    res.download(__dirname + '/uploads' + '/' + folder + '/' + filename, filename, (err) => {
        if (err) {
            log.error(err);
            res.render('404.jade');
        } else {
            const pathFile = __dirname + '/uploads' + '/' + folder + '/' + filename;
            const pathDir = __dirname + '/uploads' + '/' + folder + '/';
            deleteAfterUpload(pathFile, pathDir, next, res)
        }
    });
  }

const deleteAfterUpload = (path, pathDir, next, res) => 
  fs.unlink(path, (err) => {
      (err) 
        ? log.error(err)
        : fs.rmdir(pathDir, (err) => next('Finish the captcha Properly.'))

      log.info('file ' + path + ' successfully deleted');
  });


const errorHandler = (err, req, res, next) => {
    //console.error(err.stack)
    console.error(err.status = 500);
    res.status(500);
    res.send(err);
}

const makeid = () => {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (let i = 0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

const clearTrashFolders = () => 
    fs.readdir(__dirname + '/' + 'uploads', (err, listaDir) => {
        listaDir.map((element, i) => 
            emptyDir(__dirname + '/' + 'uploads' + '/' + element), (err, result) => 
                (err)
                  ? log.info('FFFUUUUU!')
                  : fs.rmdir(caminhoVazios, err => 
                      (err) 
                          ? log.info('diretorio lixo: ' + caminhoVazios + ' NÃO foi apagado!')
                          : log.info('diretorio lixo: ' + caminhoVazios + ' foi apagado com sucesso!')
                  )
            )
        )
    })


// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(compression());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(errorHandler);
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//app.use('/', routes);
//app.use('/users', users);

//catch 404 and forward to error handler
app.use((req, res, next) => {
    const err = new Error('Not Found');
    err.status = 404;
    res.render('error', {
        error: err
    })
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use((err, req, res, next) => {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
